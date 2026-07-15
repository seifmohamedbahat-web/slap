import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { VoiceOrb, type VoiceState } from "../components/VoiceOrb";
import { Button, GlassCard, PageHeader, cx, useToast } from "../components/ui";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

/**
 * Voice assistant. Records a phrase with the Web Audio API, transcribes it via
 * the main process (ElevenLabs/Whisper), sends it through the AI router, and
 * speaks the reply with ElevenLabs TTS. Speech is interruptible — starting a
 * new recording stops playback.
 */
export function VoicePage() {
  const { push } = useToast();
  const [state, setState] = useState<VoiceState>("idle");
  const [level, setLevel] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const replyRef = useRef<string>("");

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setLevel(0);
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopMeter();
  }, [stopMeter]);

  useEffect(() => cleanupStream, [cleanupStream]);

  // Subscribe to the AI stream to collect the spoken reply text.
  useEffect(() => {
    const off = api.on("ai:stream", async (event) => {
      if (event.requestId !== requestIdRef.current) return;
      if (event.type === "delta") {
        replyRef.current += event.delta ?? "";
        setTurns((prev) => {
          const next = [...prev];
          if (next.length && next[next.length - 1].role === "assistant") {
            next[next.length - 1] = { role: "assistant", text: replyRef.current };
          } else {
            next.push({ role: "assistant", text: replyRef.current });
          }
          return next;
        });
      } else if (event.type === "done") {
        requestIdRef.current = null;
        await speak(replyRef.current);
      } else if (event.type === "error") {
        requestIdRef.current = null;
        setState("idle");
        push(event.error ?? "AI error", "error");
      }
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push]);

  async function startRecording() {
    // Interrupt any current speech.
    audioRef.current?.pause();
    replyRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = handleRecordingStop;
      recorder.start();
      mediaRef.current = recorder;
      setState("listening");
      startMeter(stream);
    } catch {
      push("Microphone access denied or unavailable.", "error");
      setState("idle");
    }
  }

  function startMeter(stream: MediaStream) {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
      setLevel(avg);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopRecording() {
    mediaRef.current?.stop();
    stopMeter();
  }

  async function handleRecordingStop() {
    cleanupStream();
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 1200) {
      setState("idle");
      return;
    }
    setState("thinking");
    try {
      const buffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const { text } = await api.invoke("voice:transcribe", { audioBase64: base64, mimeType: "audio/webm" });
      if (!text) {
        push("Didn't catch that. Try again.", "info");
        setState("idle");
        return;
      }
      setTurns((prev) => [...prev, { role: "user", text }]);
      await sendToAi(text);
    } catch (err) {
      push(err instanceof Error ? err.message : String(err), "error");
      setState("idle");
    }
  }

  async function sendToAi(text: string) {
    let convId = conversationId;
    if (!convId) {
      const conv = await api.invoke("ai:conversations:create", { title: "Voice session" });
      convId = conv.id;
      setConversationId(conv.id);
    }
    replyRef.current = "";
    const { requestId } = await api.invoke("ai:chat:start", { conversationId: convId, content: text });
    requestIdRef.current = requestId;
  }

  async function speak(text: string) {
    if (!text.trim()) {
      setState("idle");
      return;
    }
    try {
      const { audioBase64, mimeType } = await api.invoke("voice:speak", { text });
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioRef.current = audio;
      setState("speaking");
      // Fake amplitude while speaking, since we can't easily analyse the element.
      const speakLoop = () => {
        setLevel(0.3 + Math.random() * 0.5);
        rafRef.current = requestAnimationFrame(speakLoop);
      };
      speakLoop();
      audio.onended = () => {
        stopMeter();
        setState("idle");
      };
      await audio.play();
    } catch {
      // TTS not configured — leave the text on screen and go idle silently.
      setState("idle");
    }
  }

  const busy = state === "thinking";

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Voice Assistant"
        subtitle='Press to talk, or say "Hey JARVIS" once wake-word is enabled in Settings.'
        icon="voice"
      />
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
        <GlassCard className="col-span-12 flex flex-col items-center justify-center gap-6 p-8 lg:col-span-7">
          <VoiceOrb state={state} level={level} size={260} />
          <p className="text-sm font-medium capitalize text-ink-secondary">
            {state === "idle"
              ? "Tap the mic to start"
              : state === "listening"
                ? "Listening…"
                : state === "thinking"
                  ? "Thinking…"
                  : "Speaking…"}
          </p>
          <div className="flex gap-3">
            {state === "listening" ? (
              <Button variant="primary" icon="stop" onClick={stopRecording}>
                Stop & send
              </Button>
            ) : (
              <Button variant="primary" icon="mic" onClick={startRecording} disabled={busy}>
                {state === "speaking" ? "Interrupt & talk" : "Start talking"}
              </Button>
            )}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 flex min-h-0 flex-col p-5 lg:col-span-5">
          <h2 className="mb-3 font-semibold text-ink-primary">Conversation</h2>
          <div className="flex-1 scroll-area space-y-3">
            {turns.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">Your spoken conversation appears here.</p>
            ) : (
              turns.map((t, i) => (
                <div
                  key={i}
                  className={cx(
                    "rounded-xl px-3.5 py-2.5 text-sm",
                    t.role === "user" ? "bg-neon-500/12 text-ink-primary" : "bg-white/5 text-ink-secondary",
                  )}
                >
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-ink-muted">
                    {t.role === "user" ? "You" : "JARVIS"}
                  </span>
                  {t.text}
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

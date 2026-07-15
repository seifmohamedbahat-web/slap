/**
 * Voice services: ElevenLabs text-to-speech and speech-to-text, with OpenAI
 * Whisper as the transcription fallback when ElevenLabs is not configured.
 */
import { logger } from "../../core/logger";
import type { SpeechResult, TranscriptionResult } from "@shared/types";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export async function textToSpeech(options: {
  apiKey: string;
  voiceId: string;
  text: string;
}): Promise<SpeechResult> {
  const res = await fetch(
    `${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(options.voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": options.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: options.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.8 },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (HTTP ${res.status}): ${detail.slice(0, 200)}`);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  return { audioBase64: audio.toString("base64"), mimeType: "audio/mpeg" };
}

export async function transcribe(options: {
  elevenLabsKey: string | null;
  openaiKey: string | null;
  preferred: "elevenlabs" | "openai";
  audio: Buffer;
  mimeType: string;
}): Promise<TranscriptionResult> {
  const attempts: ("elevenlabs" | "openai")[] =
    options.preferred === "elevenlabs" ? ["elevenlabs", "openai"] : ["openai", "elevenlabs"];

  let lastError = "No transcription provider configured";
  for (const provider of attempts) {
    try {
      if (provider === "elevenlabs" && options.elevenLabsKey) {
        return await transcribeElevenLabs(options.elevenLabsKey, options.audio, options.mimeType);
      }
      if (provider === "openai" && options.openaiKey) {
        return await transcribeWhisper(options.openaiKey, options.audio, options.mimeType);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn("voice", `Transcription via ${provider} failed`, { error: lastError });
    }
  }
  throw new Error(lastError);
}

async function transcribeElevenLabs(
  apiKey: string,
  audio: Buffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "audio.webm");
  const res = await fetch(`${ELEVEN_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs STT failed (HTTP ${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: (data.text ?? "").trim(), provider: "elevenlabs" };
}

async function transcribeWhisper(
  apiKey: string,
  audio: Buffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "audio.webm");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Whisper STT failed (HTTP ${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: (data.text ?? "").trim(), provider: "openai" };
}

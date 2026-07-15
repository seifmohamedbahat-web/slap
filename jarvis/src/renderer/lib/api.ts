/**
 * Thin typed wrapper over the preload bridge. Every renderer call goes through
 * `api.invoke`; `api.on` subscribes to main→renderer push events.
 */
import type {
  IpcChannel,
  IpcEventChannel,
  IpcEvents,
  IpcInvokeMap,
  JarvisBridge,
} from "@shared/ipc";

declare global {
  interface Window {
    jarvis: JarvisBridge;
  }
}

const bridge = window.jarvis;

export const api = {
  invoke<C extends IpcChannel>(
    channel: C,
    payload: IpcInvokeMap[C][0],
  ): Promise<IpcInvokeMap[C][1]> {
    return bridge.invoke(channel, payload);
  },
  on<C extends IpcEventChannel>(
    channel: C,
    listener: (payload: IpcEvents[C]) => void,
  ): () => void {
    return bridge.on(channel, listener);
  },
};

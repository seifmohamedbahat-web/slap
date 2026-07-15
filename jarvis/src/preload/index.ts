/**
 * Preload bridge. Runs with contextIsolation on; exposes a single strongly
 * typed `window.jarvis` object and nothing else. Only channels declared in
 * the IPC contract are forwarded.
 */
import { contextBridge, ipcRenderer } from "electron";
import type { IpcEventChannel, IpcEvents, JarvisBridge } from "@shared/ipc";

const bridge: JarvisBridge = {
  invoke(channel, payload) {
    return ipcRenderer.invoke(channel, payload);
  },
  on(channel, listener) {
    const wrapped = (_event: unknown, payload: IpcEvents[IpcEventChannel]) =>
      listener(payload as never);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
};

contextBridge.exposeInMainWorld("jarvis", bridge);

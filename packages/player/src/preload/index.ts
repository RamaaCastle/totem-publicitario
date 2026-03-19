import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config: any) => ipcRenderer.invoke('config:save', config),

  // Media cache
  downloadMedia: (params: { url: string; filename: string }) =>
    ipcRenderer.invoke('media:download', params),
  isMediaCached: (filename: string) =>
    ipcRenderer.invoke('media:isCached', filename),
  getLocalPath: (filename: string) =>
    ipcRenderer.invoke('media:localPath', filename),
});

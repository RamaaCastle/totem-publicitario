// Types for Electron APIs exposed via contextBridge
interface ElectronAPI {
  loadConfig: () => Promise<{
    deviceCode?: string;
    deviceToken?: string;
    apiUrl: string;
    wsUrl: string;
  }>;
  saveConfig: (config: any) => Promise<any>;
  downloadMedia: (params: { url: string; filename: string }) => Promise<{ cached: boolean; path: string }>;
  isMediaCached: (filename: string) => Promise<boolean>;
  getLocalPath: (filename: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

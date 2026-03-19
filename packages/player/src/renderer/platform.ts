/**
 * Platform abstraction layer.
 * Uses window.electronAPI when running inside Electron,
 * falls back to localStorage for web / Android (Capacitor).
 */

const STORAGE_KEY = 'device-config';

export interface DeviceConfig {
  deviceCode?: string | null;
  deviceToken?: string | null;
  apiUrl?: string;
  wsUrl?: string;
}

const defaultConfig: DeviceConfig = {
  apiUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001',
};

export const platform = {
  isElectron: (): boolean => typeof window !== 'undefined' && !!window.electronAPI,

  loadConfig: async (): Promise<DeviceConfig> => {
    if (platform.isElectron()) {
      return (window as any).electronAPI.loadConfig();
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : { ...defaultConfig };
    } catch {
      return { ...defaultConfig };
    }
  },

  saveConfig: async (config: Partial<DeviceConfig>): Promise<DeviceConfig> => {
    if (platform.isElectron()) {
      return (window as any).electronAPI.saveConfig(config);
    }
    try {
      const current = await platform.loadConfig();
      const updated = { ...current, ...config };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return config as DeviceConfig;
    }
  },
};

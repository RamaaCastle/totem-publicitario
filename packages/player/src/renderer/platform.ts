/**
 * Platform abstraction layer.
 * Uses window.electronAPI when running inside Electron,
 * Capacitor Preferences on Android (persists across reboots),
 * falls back to localStorage for web.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'device-config';

export interface DeviceConfig {
  deviceCode?: string | null;
  deviceToken?: string | null;
  apiUrl?: string;
  wsUrl?: string;
}

const defaultConfig: DeviceConfig = {
  apiUrl: 'http://187.77.53.136',
  wsUrl: 'ws://187.77.53.136',
};

export const platform = {
  isElectron: (): boolean => typeof window !== 'undefined' && !!window.electronAPI,

  loadConfig: async (): Promise<DeviceConfig> => {
    if (platform.isElectron()) {
      return (window as any).electronAPI.loadConfig();
    }
    try {
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        return value ? { ...defaultConfig, ...JSON.parse(value) } : { ...defaultConfig };
      }
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
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(updated) });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    } catch {
      return config as DeviceConfig;
    }
  },
};

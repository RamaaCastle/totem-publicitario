import React, { useEffect, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { PairingScreen } from './components/pairing-screen';
import { PlayerScreen } from './components/player-screen';
import { usePlayerStore } from './store';
import { platform } from './platform';
import { APP_VERSION_CODE } from './version';

interface UpdaterPlugin {
  downloadAndInstall(options: { url: string }): Promise<void>;
}
const Updater = registerPlugin<UpdaterPlugin>('Updater');

export default function App() {
  const { deviceCode, deviceToken, initialized, setConfig } = usePlayerStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    platform.loadConfig().then((config: any) => {
      setConfig({
        deviceCode: config.deviceCode ?? '',
        deviceToken: config.deviceToken ?? '',
        apiUrl: config.apiUrl,
        wsUrl: config.wsUrl,
      });

      // Check for app update once config is loaded
      const apiUrl = config.apiUrl || 'http://187.77.53.136';
      checkForUpdate(apiUrl);

      setLoading(false);
    });
  }, [setConfig]);

  const checkForUpdate = async (apiUrl: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/devices/version`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.versionCode > APP_VERSION_CODE && data.apkUrl) {
        setUpdating(true);
        await Updater.downloadAndInstall({ url: data.apkUrl });
      }
    } catch {
      // Offline or unsupported platform — ignore
    }
  };

  if (loading) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#fff', fontSize: 18 }}>Iniciando...</div>
      </div>
    );
  }

  if (updating) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', gap: 16,
      }}>
        <div style={{ color: '#3b82f6', fontSize: 32 }}>⬇</div>
        <p style={{ color: '#f1f5f9', fontSize: 18, margin: 0 }}>Actualizando aplicación...</p>
        <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>La pantalla se reiniciará automáticamente</p>
      </div>
    );
  }

  if (!deviceCode || !deviceToken) {
    return <PairingScreen />;
  }

  return <PlayerScreen />;
}

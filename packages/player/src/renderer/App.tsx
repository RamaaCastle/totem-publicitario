import React, { useEffect, useState } from 'react';
import { PairingScreen } from './components/pairing-screen';
import { PlayerScreen } from './components/player-screen';
import { usePlayerStore } from './store';
import { platform } from './platform';

export default function App() {
  const { deviceCode, deviceToken, initialized, setConfig } = usePlayerStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platform.loadConfig().then((config: any) => {
      setConfig({
        deviceCode: config.deviceCode ?? '',
        deviceToken: config.deviceToken ?? '',
        apiUrl: config.apiUrl,
        wsUrl: config.wsUrl,
      });
      setLoading(false);
    });
  }, [setConfig]);

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

  if (!deviceCode || !deviceToken) {
    return <PairingScreen />;
  }

  return <PlayerScreen />;
}

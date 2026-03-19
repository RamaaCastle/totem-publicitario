import React, { useState } from 'react';
import { usePlayerStore } from '../store';
import { platform } from '../platform';

export function PairingScreen() {
  const [deviceCode, setDeviceCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showServer, setShowServer] = useState(false);
  const { apiUrl, setConfig } = usePlayerStore();
  const [serverUrl, setServerUrl] = useState(apiUrl);

  const handlePair = async () => {
    if (!deviceCode.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    const url = serverUrl.trim().replace(/\/$/, '');

    try {
      const res = await fetch(`${url}/api/v1/devices/register/${deviceCode.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appVersion: '1.0.0',
          osInfo: navigator.platform,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Código inválido');
      }

      const data = await res.json();
      const { token, screen } = data.data;

      const config = {
        deviceCode: screen.deviceCode,
        deviceToken: token,
        apiUrl: url,
        wsUrl: url.replace(/^http/, 'ws'),
      };

      await platform.saveConfig(config);
      setConfig(config);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al vincular dispositivo');
      setStatus('error');
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: 48,
        maxWidth: 420, width: '90%', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: '#3b82f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 28,
        }}>
          📺
        </div>

        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Signage Player
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>
          Ingresá el código de vinculación del panel de administración
        </p>

        <input
          value={deviceCode}
          onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handlePair()}
          placeholder="ABC123"
          maxLength={6}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            border: '2px solid #334155', background: '#0f172a',
            color: '#f1f5f9', fontSize: 32, textAlign: 'center',
            letterSpacing: 8, fontFamily: 'monospace', marginBottom: 16,
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        {errorMsg && (
          <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>
        )}

        <button
          onClick={handlePair}
          disabled={status === 'loading' || deviceCode.length < 4}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 10,
            background: status === 'loading' ? '#1d4ed8' : '#3b82f6',
            color: '#fff', fontSize: 16, fontWeight: 600,
            border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: deviceCode.length < 4 ? 0.5 : 1,
            marginBottom: 24,
          }}
        >
          {status === 'loading' ? 'Vinculando...' : 'Vincular pantalla'}
        </button>

        {/* Server URL — collapsed by default */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: 16 }}>
          <button
            onClick={() => setShowServer(!showServer)}
            style={{
              background: 'none', border: 'none', color: '#475569',
              fontSize: 12, cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 6, margin: '0 auto',
            }}
          >
            <span style={{ fontSize: 10 }}>{showServer ? '▲' : '▼'}</span>
            Configuración del servidor
          </button>

          {showServer && (
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 4 }}>
                URL del servidor
              </label>
              <input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://servidor:puerto"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #334155', background: '#0f172a',
                  color: '#94a3b8', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>

        <p style={{ color: '#334155', fontSize: 11, marginTop: 16 }}>
          El código se genera en el panel de administración
        </p>
      </div>
    </div>
  );
}

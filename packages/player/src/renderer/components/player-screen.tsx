import React, { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePlayerStore } from '../store';
import { TotemCalendarScreen } from './totem-calendar-screen';
import { platform } from '../platform';

const HEARTBEAT_INTERVAL_MS = 30_000;
const FETCH_CONFIG_INTERVAL_MS = 60_000;

export function PlayerScreen() {
  const {
    deviceCode, deviceToken, apiUrl, wsUrl,
    playlist, currentIndex, isOnline, orientation,
    screenType, schedule,
    setPlaylist, setCurrentIndex, setIsOnline, setOrientation, nextItem,
    setScreenType, setSchedule,
  } = usePlayerStore();

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playIteration, setPlayIteration] = useState(0);

  // ── Fetch playlist config from server ───────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/devices/config/${deviceCode}`, {
        headers: { Authorization: `Bearer ${deviceToken}` },
      });
      if (res.status === 401 || res.status === 404) {
        // Screen was deleted or token revoked — unpair
        await platform.saveConfig({});
        window.location.reload();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const newPlaylist = data.data?.playlist;
      setPlaylist(newPlaylist || null);
      if (data.data?.screen?.orientation) {
        setOrientation(data.data.screen.orientation);
      }
      if (data.data?.screen?.screenType) setScreenType(data.data.screen.screenType);
      if (data.data?.screen?.schedule !== undefined) setSchedule(data.data.screen.schedule);

    } catch {
      // Offline — continue with cached content
    }
  }, [apiUrl, deviceCode, deviceToken, setPlaylist, setOrientation, setScreenType, setSchedule]); // eslint-disable-line

  // ── WebSocket connection ─────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${wsUrl}/screens`, {
      auth: { token: deviceToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      setIsOnline(true);
      fetchConfig(); // Fetch fresh config on connect
    });

    socket.on('disconnect', () => setIsOnline(false));

    socket.on('playlist:updated', () => {
      fetchConfig(); // Server pushed an update
    });

    socket.on('config:sync', () => {
      fetchConfig();
    });

    socket.on('command', (data: any) => {
      if (data.command === 'reload') window.location.reload();
      if (data.command === 'restart' || data.command === 'unpair')
        platform.saveConfig({}).then(() => window.location.reload());
    });

    socketRef.current = socket;
  }, [wsUrl, deviceToken, fetchConfig, setIsOnline]);

  // ── Send heartbeat ───────────────────────────────────────────────────────────
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`${apiUrl}/api/v1/devices/heartbeat/${deviceCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlaylistId: playlist?.id,
          appVersion: '1.0.0',
        }),
      });
    } catch {}

    // Also send via WebSocket if connected
    socketRef.current?.emit('heartbeat', {
      currentPlaylistId: playlist?.id,
      appVersion: '1.0.0',
    });
  }, [apiUrl, deviceCode, playlist]);

  // ── Initialize ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConfig();
    connectSocket();

    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    configIntervalRef.current = setInterval(fetchConfig, FETCH_CONFIG_INTERVAL_MS);

    return () => {
      socketRef.current?.disconnect();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (configIntervalRef.current) clearInterval(configIntervalRef.current);
    };
  }, []); // eslint-disable-line

  // ── Advance to next slide after duration ─────────────────────────────────────
  useEffect(() => {
    if (!playlist?.items?.length) return;
    const item = playlist.items[currentIndex];
    if (!item) return;

    // Videos advance on 'ended' event, images use timer
    if (item.media.type === 'image') {
      timerRef.current = setTimeout(() => {
        nextItem();
      }, item.durationSeconds * 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, playlist, nextItem]);

  // ── Render ───────────────────────────────────────────────────────────────────
  // Totem with schedule → show calendar (with portrait rotation support)
  if (screenType === 'totem' && schedule && schedule.length > 0) {
    const isPortrait = orientation === 'portrait';
    const calendar = <TotemCalendarScreen schedule={schedule} screenName={deviceCode ?? ''} />;
    if (!isPortrait) return calendar;
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          width: '100vh', height: '100vw',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          transformOrigin: 'center center',
        }}>
          {calendar}
        </div>
      </div>
    );
  }

  if (!playlist || playlist.items.length === 0) {
    return <NoContentScreen isOnline={isOnline} deviceCode={deviceCode!} />;
  }

  const item = playlist.items[currentIndex];
  const mediaUrl = item.media.url;

  const isSingleItem = playlist.items.length === 1;

  const handleVideoEnded = () => {
    setPlayIteration((n) => n + 1);
    nextItem();
  };

  const isPortrait = orientation === 'portrait';
  const containerStyle: React.CSSProperties = isPortrait
    ? {
        position: 'fixed', background: '#000', overflow: 'hidden',
        width: '100vh', height: '100vw',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
      }
    : { width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' };

  return (
    <div style={containerStyle}>
      {item.media.type === 'image' ? (
        <img
          key={`${item.id}-${playIteration}`}
          src={mediaUrl}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', inset: 0,
          }}
        />
      ) : (
        <video
          key={`${item.id}-${playIteration}`}
          src={mediaUrl}
          autoPlay
          muted
          playsInline
          loop={isSingleItem}
          onEnded={!isSingleItem ? handleVideoEnded : undefined}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', inset: 0,
          }}
        />
      )}

      {/* Status indicator (minimal, non-intrusive) */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        width: 8, height: 8, borderRadius: '50%',
        background: isOnline ? '#22c55e' : '#ef4444',
        opacity: 0.7,
      }} />
    </div>
  );
}

function NoContentScreen({ isOnline, deviceCode }: { isOnline: boolean; deviceCode: string }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📺</div>
      <p style={{ color: '#64748b', fontSize: 18, marginBottom: 8 }}>Sin contenido asignado</p>
      <p style={{ color: '#334155', fontSize: 13, fontFamily: 'monospace' }}>
        Código: {deviceCode}
      </p>
      <div style={{
        marginTop: 24, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isOnline ? '#22c55e' : '#ef4444',
        }} />
        <span style={{ color: '#475569', fontSize: 12 }}>
          {isOnline ? 'Conectado al servidor' : 'Sin conexión — modo offline'}
        </span>
      </div>
    </div>
  );
}

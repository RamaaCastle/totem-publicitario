import { useState, useEffect, useRef } from 'react';

export interface HotelInfoItem {
  id: string;
  label: string;
  value: string;
  bgImageUrl?: string;
}

interface TVInfoScreenProps {
  items: HotelInfoItem[];
  logoUrl?: string;
  slideDurationMs?: number;
  onComplete?: () => void;
}

const SLIDE_MS = 5000;
const ANIM_MS = 400;

export function TVInfoScreen({ items, logoUrl, slideDurationMs = SLIDE_MS, onComplete }: TVInfoScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const total = items.length;

  useEffect(() => {
    if (total === 0) return;
    const showTimer = setTimeout(() => setVisible(true), 40);
    const slideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        const next = (currentIdx + 1) % total;
        if (next === 0) {
          onCompleteRef.current?.();
        } else {
          setCurrentIdx(next);
        }
      }, ANIM_MS);
    }, slideDurationMs);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(slideTimer);
    };
  }, [currentIdx, total, slideDurationMs]);

  if (total === 0) return null;

  const item = items[currentIdx];
  const isWifi = item.label.toLowerCase().includes('wifi') || item.label.toLowerCase().includes('wi-fi');
  const wifiParts = isWifi ? item.value.split('|').map((s) => s.trim()) : [];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      background: '#111',
    }}>
      <style>{`
        @keyframes tv-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes tv-bg-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Fullscreen background */}
      <div
        key={item.id + '-bg'}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: item.bgImageUrl ? `url(${item.bgImageUrl})` : 'none',
          backgroundColor: item.bgImageUrl ? 'transparent' : '#1a1a1a',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'tv-bg-in 0.8s ease forwards',
        }}
      />

      {/* Left panel */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, bottom: 0,
        width: 480,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-24px)',
        transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1)`,
      }}>

        {/* Logo area */}
        <div style={{
          padding: logoUrl ? '28px 36px 24px' : '28px 36px 0',
          borderBottom: logoUrl ? '1px solid rgba(255,255,255,0.07)' : 'none',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{
                maxWidth: '100%',
                maxHeight: 90,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: 'uppercase',
              paddingBottom: 0,
            }}>
              Información del hotel
            </div>
          )}
        </div>

        {/* Clock */}
        <div style={{
          padding: logoUrl ? '20px 36px 0' : '28px 36px 0',
          flexShrink: 0,
        }}>
          <ClockDisplay />
          {logoUrl && (
            <div style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: 'uppercase',
              marginTop: 6,
            }}>
              Información del hotel
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ margin: '22px 36px 0', height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 36px',
          gap: 14,
        }}>
          {/* Label */}
          <div style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {item.label}
          </div>

          {/* Red accent line */}
          <div style={{ width: 48, height: 3, background: '#c8102e', borderRadius: 2 }} />

          {/* Value */}
          {isWifi ? (
            <WifiBlock network={wifiParts[0] ?? item.value} password={wifiParts[1] ?? ''} />
          ) : (
            <div style={{
              color: '#ffffff',
              fontSize: item.value.length > 18 ? 40 : item.value.length > 10 ? 56 : 74,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}>
              {item.value}
            </div>
          )}
        </div>

        {/* Progress dots + bar */}
        <div style={{ padding: '0 36px 32px', flexShrink: 0 }}>
          {total > 1 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {items.map((_, i) => (
                <div key={i} style={{
                  height: 3,
                  flex: i === currentIdx ? 3 : 1,
                  borderRadius: 2,
                  background: i === currentIdx ? '#c8102e' : 'rgba(255,255,255,0.15)',
                  transition: 'flex 0.35s ease',
                }} />
              ))}
            </div>
          )}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden' }}>
            <div
              key={`prog-${currentIdx}`}
              style={{
                height: '100%',
                background: '#c8102e',
                width: '0%',
                animation: `tv-progress ${slideDurationMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WifiBlock({ network, password }: { network: string; password: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 10, fontWeight: 700,
          letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6,
        }}>Red</div>
        <div style={{ color: '#fff', fontSize: network.length > 18 ? 24 : 32, fontWeight: 800 }}>
          {network}
        </div>
      </div>
      {password && (
        <div>
          <div style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 10, fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6,
          }}>Contraseña</div>
          <div style={{
            color: '#fff',
            fontSize: password.length > 18 ? 18 : 26,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 2,
            background: 'rgba(200,16,46,0.2)',
            border: '1px solid rgba(200,16,46,0.45)',
            borderRadius: 8,
            padding: '10px 16px',
            display: 'inline-block',
          }}>
            {password}
          </div>
        </div>
      )}
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ color: '#fff', fontSize: 58, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
      {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

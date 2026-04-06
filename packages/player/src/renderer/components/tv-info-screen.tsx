import { useState, useEffect, useRef } from 'react';

export interface HotelInfoItem {
  id: string;
  label: string;
  value: string;
  bgImageUrl?: string;
}

interface TVInfoScreenProps {
  items: HotelInfoItem[];
  slideDurationMs?: number;
  onComplete?: () => void;
}

const SLIDE_MS = 5000;
const ANIM_MS = 400;

export function TVInfoScreen({ items, slideDurationMs = SLIDE_MS, onComplete }: TVInfoScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const total = items.length;

  // Fade in on mount and on each slide change
  useEffect(() => {
    if (total === 0) return;

    // Brief delay so CSS transition fires
    const showTimer = setTimeout(() => setVisible(true), 30);

    // Schedule slide exit + advance
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
        @keyframes progress-bar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes bg-zoom {
          from { transform: scale(1.05); }
          to   { transform: scale(1); }
        }
      `}</style>

      {/* Background image — fullscreen */}
      <div
        key={item.id + '-bg'}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: item.bgImageUrl ? `url(${item.bgImageUrl})` : 'none',
          backgroundColor: item.bgImageUrl ? 'transparent' : '#1c1c1c',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'bg-zoom 0.8s ease forwards',
        }}
      />

      {/* Subtle dark vignette on the right so panel has contrast */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
      }} />

      {/* LEFT PANEL */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 400,
        background: 'rgba(0,0,0,0.62)',
        display: 'flex',
        flexDirection: 'column',
        // No backdrop-filter — unreliable on TV WebViews
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-30px)',
        transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1)`,
      }}>
        {/* Red top stripe */}
        <div style={{ height: 5, background: '#c8102e', flexShrink: 0 }} />

        {/* Clock + title */}
        <div style={{
          padding: '28px 32px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <ClockDisplay />
          <div style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginTop: 6,
          }}>
            Información del hotel
          </div>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 32px',
          gap: 18,
        }}>
          {/* Icon + label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#c8102e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}>
              {getLabelIcon(item.label)}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}>
              {item.label}
            </div>
          </div>

          {/* Red separator */}
          <div style={{ height: 2, background: 'rgba(200,16,46,0.5)', borderRadius: 1 }} />

          {/* Value */}
          {isWifi ? (
            <WifiBlock network={wifiParts[0] ?? item.value} password={wifiParts[1] ?? ''} />
          ) : (
            <div style={{
              color: '#ffffff',
              fontSize: item.value.length > 15 ? 44 : item.value.length > 8 ? 58 : 76,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}>
              {item.value}
            </div>
          )}
        </div>

        {/* Bottom: dots + progress */}
        <div style={{ padding: '20px 32px 0', flexShrink: 0 }}>
          {/* Dots */}
          {total > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {items.map((_, i) => (
                <div key={i} style={{
                  height: 4,
                  flex: i === currentIdx ? 3 : 1,
                  borderRadius: 2,
                  background: i === currentIdx ? '#c8102e' : 'rgba(255,255,255,0.18)',
                  transition: 'flex 0.35s ease',
                }} />
              ))}
            </div>
          )}
          {/* Progress bar */}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden', marginBottom: 0 }}>
            <div
              key={`prog-${currentIdx}`}
              style={{
                height: '100%',
                background: '#c8102e',
                width: '0%',
                animation: `progress-bar ${slideDurationMs}ms linear forwards`,
              }}
            />
          </div>
        </div>

        {/* Red bottom stripe */}
        <div style={{ height: 5, background: '#c8102e', flexShrink: 0, marginTop: 20 }} />
      </div>
    </div>
  );
}

function WifiBlock({ network, password }: { network: string; password: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 10, fontWeight: 800,
          letterSpacing: 3, textTransform: 'uppercase', marginBottom: 5,
        }}>Red</div>
        <div style={{ color: '#fff', fontSize: network.length > 16 ? 26 : 34, fontWeight: 900 }}>
          {network}
        </div>
      </div>
      {password && (
        <div>
          <div style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 10, fontWeight: 800,
            letterSpacing: 3, textTransform: 'uppercase', marginBottom: 5,
          }}>Contraseña</div>
          <div style={{
            color: '#fff',
            fontSize: password.length > 16 ? 20 : 28,
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: 2,
            background: 'rgba(200,16,46,0.25)',
            border: '1px solid rgba(200,16,46,0.5)',
            borderRadius: 8,
            padding: '8px 14px',
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
    <div style={{ color: '#fff', fontSize: 52, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
      {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

function getLabelIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('check in') || l.includes('checkin')) return '🛎';
  if (l.includes('check out') || l.includes('checkout')) return '🧳';
  if (l.includes('desayuno') || l.includes('breakfast')) return '☕';
  if (l.includes('wifi') || l.includes('wi-fi')) return '📶';
  if (l.includes('recepci')) return '🏨';
  if (l.includes('fuma') || l.includes('smoking')) return '🚬';
  if (l.includes('piscina') || l.includes('pool')) return '🏊';
  if (l.includes('gym') || l.includes('gimnasio')) return '🏋️';
  if (l.includes('restaur') || l.includes('cena') || l.includes('almuerzo')) return '🍽️';
  if (l.includes('spa')) return '💆';
  if (l.includes('parking') || l.includes('estacion')) return '🅿️';
  return '📌';
}

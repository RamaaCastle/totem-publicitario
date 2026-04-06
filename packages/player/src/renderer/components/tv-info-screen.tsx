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
const ANIM_MS = 500;

export function TVInfoScreen({ items, slideDurationMs = SLIDE_MS, onComplete }: TVInfoScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'in' | 'show' | 'out'>('in');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const total = items.length;

  useEffect(() => {
    if (total === 0) return;
    setPhase('in');
    const inDone = setTimeout(() => setPhase('show'), ANIM_MS);

    timerRef.current = setTimeout(() => {
      setPhase('out');
      setTimeout(() => {
        const nextIdx = (currentIdx + 1) % total;
        if (nextIdx === 0) {
          onCompleteRef.current?.();
        } else {
          setCurrentIdx(nextIdx);
        }
      }, ANIM_MS);
    }, slideDurationMs);

    return () => {
      clearTimeout(inDone);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIdx, total, slideDurationMs]);

  if (total === 0) return null;

  const item = items[currentIdx];
  const isWifi = item.label.toLowerCase().includes('wifi') || item.label.toLowerCase().includes('wi-fi');
  const wifiParts = isWifi ? item.value.split('|').map((s) => s.trim()) : [];

  const panelOpacity = phase === 'show' ? 1 : 0;
  const panelX = phase === 'in' ? '-40px' : phase === 'out' ? '-40px' : '0px';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    }}>
      <style>{`
        @keyframes progress-bar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes bg-fade {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Full-screen background image */}
      {item.bgImageUrl ? (
        <div
          key={item.id + '-bg'}
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${item.bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: 'bg-fade 0.7s ease forwards',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Left modal panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 420,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        transform: `translateX(${panelX})`,
        opacity: panelOpacity,
        transition: `transform ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${ANIM_MS}ms ease`,
      }}>
        {/* Red top accent */}
        <div style={{ height: 4, background: '#c8102e', flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: '24px 32px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Información del hotel
          </div>
          <ClockDisplay />
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px',
          gap: 20,
        }}>
          {/* Icon + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#c8102e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}>
              {getLabelIcon(item.label)}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>
              {item.label}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(200,16,46,0.4)' }} />

          {/* Value */}
          {isWifi ? (
            <WifiBlock network={wifiParts[0] ?? item.value} password={wifiParts[1] ?? ''} />
          ) : (
            <div style={{
              color: '#ffffff',
              fontSize: item.value.length > 15 ? 42 : item.value.length > 8 ? 56 : 72,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}>
              {item.value}
            </div>
          )}
        </div>

        {/* Dots + progress */}
        <div style={{ padding: '0 32px 24px', flexShrink: 0 }}>
          {total > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {items.map((_, i) => (
                <div key={i} style={{
                  height: 3,
                  flex: i === currentIdx ? 2 : 1,
                  borderRadius: 2,
                  background: i === currentIdx ? '#c8102e' : 'rgba(255,255,255,0.2)',
                  transition: 'flex 0.3s ease, background 0.3s ease',
                }} />
              ))}
            </div>
          )}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
            <div
              key={`${currentIdx}-prog`}
              style={{
                height: '100%',
                background: '#c8102e',
                transformOrigin: 'left',
                animation: `progress-bar ${slideDurationMs}ms linear forwards`,
              }}
            />
          </div>
        </div>

        {/* Red bottom accent */}
        <div style={{ height: 4, background: '#c8102e', flexShrink: 0 }} />
      </div>
    </div>
  );
}

function WifiBlock({ network, password }: { network: string; password: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Red</div>
        <div style={{ color: '#fff', fontSize: network.length > 16 ? 24 : 32, fontWeight: 800 }}>{network}</div>
      </div>
      {password && (
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Contraseña</div>
          <div style={{
            color: '#fff',
            fontSize: password.length > 16 ? 20 : 26,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 2,
            background: 'rgba(200,16,46,0.2)',
            border: '1px solid rgba(200,16,46,0.4)',
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
    <div style={{ color: '#fff', fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
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

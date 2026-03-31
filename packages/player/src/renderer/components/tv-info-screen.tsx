import React, { useState, useEffect, useRef } from 'react';

interface HotelInfoItem {
  id: string;
  label: string;
  value: string;
}

interface TVInfoScreenProps {
  items: HotelInfoItem[];
  /** Duration per slide in ms (default 5000) */
  slideDurationMs?: number;
}

const SLIDE_MS = 5000;
const ANIM_MS = 600;

export function TVInfoScreen({ items, slideDurationMs = SLIDE_MS }: TVInfoScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [animState, setAnimState] = useState<'enter' | 'idle' | 'exit'>('enter');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = items.length;

  // Auto-advance slides
  useEffect(() => {
    if (total === 0) return;

    // Animate in
    setAnimState('enter');
    const enterDone = setTimeout(() => setAnimState('idle'), ANIM_MS);

    // Schedule exit + advance
    timerRef.current = setTimeout(() => {
      setAnimState('exit');
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % total);
      }, ANIM_MS);
    }, slideDurationMs);

    return () => {
      clearTimeout(enterDone);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIdx, total, slideDurationMs]);

  if (total === 0) return null;

  const item = items[currentIdx];
  const isWifi = item.label.toLowerCase().includes('wifi') || item.label.toLowerCase().includes('wi-fi');
  const parts = isWifi ? item.value.split('|').map((s) => s.trim()) : [];
  const wifiNetwork = parts[0] ?? item.value;
  const wifiPassword = parts[1] ?? '';

  // Animation transform
  const translateY =
    animState === 'enter' ? '40px' :
    animState === 'exit' ? '-40px' : '0px';
  const opacity =
    animState === 'idle' ? 1 : 0;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes pulse-bar {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes dot-pop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.4); }
        }
      `}</style>

      {/* Top red accent bar */}
      <div style={{ height: 6, background: '#c8102e', flexShrink: 0 }} />

      {/* Header strip */}
      <div style={{
        background: '#c8102e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 60px',
        height: 72,
        flexShrink: 0,
      }}>
        <span style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 5,
          textTransform: 'uppercase',
        }}>
          Información del hotel
        </span>
        <ClockDisplay />
      </div>

      {/* Slide area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Animated slide content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          transform: `translateY(${translateY})`,
          opacity,
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${ANIM_MS}ms ease`,
          width: '100%',
          textAlign: 'center',
        }}>

          {/* Label */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: '#c8102e',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            padding: '10px 28px',
            borderRadius: 4,
          }}>
            {getLabelIcon(item.label)}
            {item.label}
          </div>

          {/* Value */}
          {isWifi ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              marginTop: 8,
            }}>
              <WifiValue label="Red" value={wifiNetwork} />
              {wifiPassword && <WifiValue label="Contraseña" value={wifiPassword} mono />}
            </div>
          ) : (
            <div style={{
              color: '#ffffff',
              fontSize: item.value.length > 20 ? 56 : 96,
              fontWeight: 200,
              letterSpacing: -1,
              lineHeight: 1,
              marginTop: 8,
            }}>
              {item.value}
            </div>
          )}
        </div>

        {/* Decorative side lines */}
        <div style={{
          position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 120,
          background: 'linear-gradient(180deg, transparent, #c8102e, transparent)',
        }} />
        <div style={{
          position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 120,
          background: 'linear-gradient(180deg, transparent, #c8102e, transparent)',
        }} />
      </div>

      {/* Progress bar */}
      {total > 1 && (
        <div style={{ padding: '0 60px 20px', flexShrink: 0 }}>
          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
            {items.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentIdx ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentIdx ? '#c8102e' : 'rgba(255,255,255,0.2)',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Sliding progress bar */}
          <div style={{
            height: 3,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div
              key={`${currentIdx}-progress`}
              style={{
                height: '100%',
                background: '#c8102e',
                transformOrigin: 'left',
                animation: `progress ${slideDurationMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom red bar */}
      <div style={{ height: 6, background: '#c8102e', flexShrink: 0 }} />
    </div>
  );
}

function WifiValue({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        color: '#fff',
        fontSize: value.length > 18 ? 32 : 48,
        fontWeight: mono ? 400 : 300,
        fontFamily: mono ? 'monospace' : 'inherit',
        letterSpacing: mono ? 3 : 0.5,
        background: mono ? 'rgba(200,16,46,0.15)' : 'transparent',
        border: mono ? '1px solid rgba(200,16,46,0.4)' : 'none',
        borderRadius: 8,
        padding: mono ? '8px 24px' : 0,
      }}>
        {value}
      </div>
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
    <span style={{
      color: 'rgba(255,255,255,0.9)',
      fontSize: 32,
      fontWeight: 200,
      letterSpacing: 3,
    }}>
      {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    </span>
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
  if (l.includes('estacion') || l.includes('parking')) return '🅿️';
  return '📌';
}

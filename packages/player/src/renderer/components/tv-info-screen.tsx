import React, { useState, useEffect, useRef } from 'react';

interface HotelInfoItem {
  id: string;
  label: string;
  value: string;
}

interface TVInfoScreenProps {
  items: HotelInfoItem[];
  bgImageUrl?: string;
  slideDurationMs?: number;
}

const SLIDE_MS = 5000;
const ANIM_MS = 500;

export function TVInfoScreen({ items, bgImageUrl, slideDurationMs = SLIDE_MS }: TVInfoScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'in' | 'show' | 'out'>('in');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = items.length;

  useEffect(() => {
    if (total === 0) return;
    setPhase('in');

    const inDone = setTimeout(() => setPhase('show'), ANIM_MS);

    timerRef.current = setTimeout(() => {
      setPhase('out');
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % total);
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

  const slideOpacity = phase === 'show' ? 1 : 0;
  const slideY = phase === 'in' ? '30px' : phase === 'out' ? '-30px' : '0px';

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
        @keyframes fade-bg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Background: image or solid red */}
      {bgImageUrl ? (
        <>
          <div
            key={bgImageUrl}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${bgImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: 'fade-bg 0.8s ease forwards',
            }}
          />
          {/* Dark overlay so text stays readable */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(200,16,46,0.82) 0%, rgba(120,0,20,0.88) 100%)',
          }} />
        </>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #c8102e 0%, #8b0000 100%)',
        }} />
      )}

      {/* Texture / grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Top white accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: '#fff', opacity: 0.9 }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 5, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 56px',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
      }}>
        <span style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: 6,
          textTransform: 'uppercase',
          opacity: 0.9,
        }}>
          Información del hotel
        </span>
        <ClockDisplay />
      </div>

      {/* Main slide content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 80px 90px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          transform: `translateY(${slideY})`,
          opacity: slideOpacity,
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${ANIM_MS}ms ease`,
          width: '100%',
          textAlign: 'center',
          maxWidth: 900,
        }}>
          {/* Label chip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(4px)',
            border: '2px solid rgba(255,255,255,0.35)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 5,
            textTransform: 'uppercase',
            padding: '10px 30px',
            borderRadius: 50,
          }}>
            <span style={{ fontSize: 20 }}>{getLabelIcon(item.label)}</span>
            {item.label}
          </div>

          {/* Value */}
          {isWifi ? (
            <WifiSlide network={wifiParts[0] ?? item.value} password={wifiParts[1] ?? ''} />
          ) : (
            <div style={{
              color: '#ffffff',
              fontSize: item.value.length > 20 ? 72 : item.value.length > 10 ? 96 : 128,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              textShadow: '0 4px 32px rgba(0,0,0,0.3)',
            }}>
              {item.value}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: dots + progress */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 56px 20px',
      }}>
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            {items.map((_, i) => (
              <div key={i} style={{
                height: 8,
                width: i === currentIdx ? 32 : 8,
                borderRadius: 4,
                background: i === currentIdx ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            key={`${currentIdx}-prog`}
            style={{
              height: '100%',
              background: '#fff',
              transformOrigin: 'left',
              animation: `progress-bar ${slideDurationMs}ms linear forwards`,
            }}
          />
        </div>
      </div>

      {/* Bottom white bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: '#fff', opacity: 0.9 }} />
    </div>
  );
}

function WifiSlide({ network, password }: { network: string; password: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 8 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
          Red
        </div>
        <div style={{ color: '#fff', fontSize: network.length > 16 ? 48 : 64, fontWeight: 900, letterSpacing: -1 }}>
          {network}
        </div>
      </div>
      {password && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
            Contraseña
          </div>
          <div style={{
            color: '#fff',
            fontSize: password.length > 16 ? 36 : 52,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: 4,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 12,
            padding: '10px 32px',
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
    <span style={{ color: '#fff', fontSize: 36, fontWeight: 900, letterSpacing: 3, opacity: 0.9 }}>
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
  if (l.includes('parking') || l.includes('estacion')) return '🅿️';
  return '📌';
}

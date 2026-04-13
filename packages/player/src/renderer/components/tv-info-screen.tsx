import { useState, useEffect, useRef } from 'react';

export interface HotelInfoItem {
  id: string;
  label: string;
  value: string;
  bgImageUrl?: string;
  qrImageUrl?: string;
}

interface TVInfoScreenProps {
  items: HotelInfoItem[];
  logoUrl?: string;
  slideDurationMs?: number;
  onComplete?: () => void;
}

const SLIDE_MS = 6000;

// ── Time helpers ──────────────────────────────────────────────────────────────
function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseTimeRange(value: string): { start: number; end: number } | null {
  const m = value.match(/(\d{1,2})(?::(\d{2}))?\s*(?:a|-|hasta)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!m) return null;
  return {
    start: parseInt(m[1]) * 60 + parseInt(m[2] ?? '0'),
    end:   parseInt(m[3]) * 60 + parseInt(m[4] ?? '0'),
  };
}

function parseExactTime(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})(?:\s*h)?$/i);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function formatDiff(diffMin: number): string {
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

type TimeStatus = { type: 'active' | 'soon'; label: string } | null;

function getTimeStatus(value: string): TimeStatus {
  const now = nowMinutes();
  const range = parseTimeRange(value);
  if (range) {
    if (now >= range.start && now <= range.end) return { type: 'active', label: 'En curso' };
    if (now < range.start) {
      const diff = range.start - now;
      if (diff <= 180) return { type: 'soon', label: `En ${formatDiff(diff)}` };
    }
    return null;
  }
  const exact = parseExactTime(value);
  if (exact !== null) {
    const diff = exact - now;
    if (diff > 0 && diff <= 60) return { type: 'soon', label: `En ${formatDiff(diff)}` };
    if (diff === 0) return { type: 'active', label: 'Ahora' };
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TVInfoScreen({ items, logoUrl, slideDurationMs = SLIDE_MS, onComplete }: TVInfoScreenProps) {
  const [logoError, setLogoError] = useState(false);
  const [, setTick]               = useState(0);
  const onCompleteRef             = useRef(onComplete);
  onCompleteRef.current           = onComplete;

  const total          = items.length;
  const cycleDurationMs = total * slideDurationMs;

  // Clock tick for status badges
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // Notify parent after each full scroll cycle
  useEffect(() => {
    if (total === 0) return;
    const t = setInterval(() => onCompleteRef.current?.(), cycleDurationMs);
    return () => clearInterval(t);
  }, [total, cycleDurationMs]);

  useEffect(() => { setLogoError(false); }, [logoUrl]);

  if (total === 0) return null;

  const showLogo = !!logoUrl && !logoError;
  const doubled  = [...items, ...items]; // duplicated for seamless CSS loop

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#080808',
      fontFamily: '"Montserrat", "Segoe UI", system-ui, sans-serif',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

        @keyframes tv-scroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes tv-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        padding: '40px 48px 32px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
        zIndex: 3,
        background: '#080808',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {showLogo && (
            <img
              src={logoUrl}
              alt=""
              onError={() => setLogoError(true)}
              style={{
                maxWidth: 150, maxHeight: 50,
                objectFit: 'contain', display: 'block',
                filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.7))',
              }}
            />
          )}
          <ClockDisplay />
        </div>

        {/* Red vertical accent */}
        <div style={{ width: 3, height: 72, background: '#c8102e', borderRadius: 2, flexShrink: 0 }} />
      </div>

      {/* Thin rule */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', flexShrink: 0, margin: '0 48px' }} />

      {/* ── Scroll area ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Fade top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 56, zIndex: 2,
          background: 'linear-gradient(to bottom, #080808 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Fade bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, zIndex: 2,
          background: 'linear-gradient(to top, #080808 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Scrolling track */}
        <div
          key={cycleDurationMs}
          style={{
            animation: `tv-scroll ${cycleDurationMs}ms linear infinite`,
            willChange: 'transform',
          }}
        >
          {doubled.map((item, i) => (
            <InfoItem key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Single info item ──────────────────────────────────────────────────────────
function InfoItem({ item }: { item: HotelInfoItem }) {
  const isWifi    = item.label.toLowerCase().includes('wifi') || item.label.toLowerCase().includes('wi-fi');
  const wifiParts = isWifi ? item.value.split('|').map((s) => s.trim()) : [];
  const status    = isWifi ? null : getTimeStatus(item.value);

  const valueLen = item.value.length;
  const valueFontSize =
    valueLen > 22 ? '7vw'  :
    valueLen > 14 ? '9vw'  :
    valueLen > 8  ? '12vw' : '15vw';

  return (
    <div style={{
      position: 'relative',
      minHeight: '42vh',
      padding: '44px 48px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 18,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      overflow: 'hidden',
    }}>
      {/* Background image — very subtle */}
      {item.bgImageUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${item.bgImageUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.12,
        }} />
      )}

      {/* Label */}
      <div style={{
        fontSize: 11, fontWeight: 700,
        letterSpacing: 6, textTransform: 'uppercase',
        color: '#c8102e',
        position: 'relative',
      }}>
        {item.label}
      </div>

      {/* Value */}
      {isWifi ? (
        <WifiBlock
          network={wifiParts[0] ?? item.value}
          password={wifiParts[1] ?? ''}
          qrImageUrl={item.qrImageUrl}
        />
      ) : (
        <div style={{
          fontSize: valueFontSize,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: '#fff',
          position: 'relative',
        }}>
          {item.value}
        </div>
      )}

      {/* Status badge */}
      {status && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: status.type === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
          border: `1px solid ${status.type === 'active' ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.25)'}`,
          borderRadius: 50, padding: '6px 16px',
          alignSelf: 'flex-start',
          position: 'relative',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: status.type === 'active' ? '#22c55e' : '#fbbf24',
            animation: status.type === 'active' ? 'tv-pulse 1.5s ease infinite' : 'none',
          }} />
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: 1,
            color: status.type === 'active' ? '#4ade80' : '#fde68a',
          }}>
            {status.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ── WiFi block ────────────────────────────────────────────────────────────────
function WifiBlock({ network, password, qrImageUrl }: { network: string; password: string; qrImageUrl?: string }) {
  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 5,
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
            marginBottom: 8,
          }}>
            Red
          </div>
          <div style={{
            fontSize: network.length > 18 ? '5vw' : '7vw',
            fontWeight: 800, color: '#fff', lineHeight: 1.1,
          }}>
            {network}
          </div>
        </div>

        {password && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 5,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
              marginBottom: 8,
            }}>
              Contraseña
            </div>
            <div style={{
              fontSize: password.length > 18 ? '4vw' : '5.5vw',
              fontWeight: 700, color: '#fff',
              background: 'rgba(200,16,46,0.12)',
              border: '1px solid rgba(200,16,46,0.25)',
              borderRadius: 8, padding: '10px 20px',
              display: 'inline-block',
              letterSpacing: 2,
            }}>
              {password}
            </div>
          </div>
        )}
      </div>

      {qrImageUrl && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 10,
            width: 130, height: 130,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={qrImageUrl}
              alt="QR WiFi"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 3,
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
          }}>
            Escanear
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function ClockDisplay() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      color: '#fff',
      fontSize: '11vw',
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      fontFamily: '"Montserrat", sans-serif',
    }}>
      {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

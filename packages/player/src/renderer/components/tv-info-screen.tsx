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

const SLIDE_MS = 5000;
const ANIM_MS  = 380;
const TICK_MS  = 200;

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

type TimeStatus = { type: 'active' | 'soon' | 'exact'; label: string } | null;

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
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase]           = useState<'enter' | 'idle' | 'exit'>('enter');
  const [logoError, setLogoError]   = useState(false);
  const [, setTick]                  = useState(0); // forces re-calc of status each minute

  const onCompleteRef  = useRef(onComplete);
  const slideStartRef  = useRef(Date.now());
  const advancingRef   = useRef(false);
  const currentIdxRef  = useRef(0);
  onCompleteRef.current  = onComplete;
  currentIdxRef.current  = currentIdx;

  const total = items.length;

  // Clock tick for status badge
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // Reset on slide change
  useEffect(() => {
    if (total === 0) return;
    advancingRef.current  = false;
    slideStartRef.current = Date.now();
    setPhase('enter');
    const t = setTimeout(() => setPhase('idle'), ANIM_MS);
    return () => clearTimeout(t);
  }, [currentIdx, total]);

  // Advance logic (interval-based — survives Android background throttling)
  useEffect(() => {
    if (total === 0) return;

    const advance = () => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      const next = (currentIdxRef.current + 1) % total;

      if (next === 0) {
        // Last item done — notify parent immediately (no fade so no frozen bg)
        onCompleteRef.current?.();
      } else {
        setPhase('exit');
        setTimeout(() => setCurrentIdx(next), ANIM_MS);
      }
    };

    const interval = setInterval(() => {
      if (advancingRef.current) return;
      if (Date.now() - slideStartRef.current >= slideDurationMs) advance();
    }, TICK_MS);

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || advancingRef.current) return;
      if (Date.now() - slideStartRef.current >= slideDurationMs) {
        advance();
      } else {
        setPhase('enter');
        setTimeout(() => setPhase('idle'), ANIM_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [total, slideDurationMs]);

  useEffect(() => { setLogoError(false); }, [logoUrl]);

  if (total === 0) return null;

  const item      = items[currentIdx];
  const isWifi    = item.label.toLowerCase().includes('wifi') || item.label.toLowerCase().includes('wi-fi');
  const wifiParts = isWifi ? item.value.split('|').map((s) => s.trim()) : [];
  const status    = isWifi ? null : getTimeStatus(item.value);
  const showLogo  = !!logoUrl && !logoError;

  const panelX = phase === 'enter' ? '-32px' : phase === 'exit' ? '-32px' : '0px';
  const panelO = phase === 'idle' ? 1 : 0;

  const valueLen = item.value.length;
  const valueFontSize = valueLen > 22 ? 52 : valueLen > 14 ? 68 : valueLen > 8 ? 86 : 104;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      background: '#0d0d0d',
    }}>
      <style>{`
        @keyframes tv-prog { from{width:0%} to{width:100%} }
        @keyframes tv-bg   { from{opacity:0;transform:scale(1.05)} to{opacity:1;transform:scale(1)} }
        @keyframes tv-pulse{ 0%,100%{opacity:1} 50%{opacity:.6} }
      `}</style>

      {/* Background */}
      <div
        key={item.id + '-bg'}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: item.bgImageUrl ? `url(${item.bgImageUrl})` : 'none',
          backgroundColor: item.bgImageUrl ? 'transparent' : '#181818',
          backgroundSize: 'cover', backgroundPosition: 'center',
          animation: 'tv-bg 0.9s ease forwards',
        }}
      />
      {/* Right-side vignette to keep bg visible but not competing */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 55%)',
        pointerEvents: 'none',
      }} />

      {/* ── LEFT PANEL ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 600,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        opacity: panelO,
        transform: `translateX(${panelX})`,
        transition: `opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1)`,
      }}>

        {/* Red top stripe */}
        <div style={{ height: 4, background: '#c8102e', flexShrink: 0 }} />

        {/* Logo */}
        {showLogo && (
          <div style={{
            padding: '22px 32px 18px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={logoUrl}
              alt=""
              onError={() => setLogoError(true)}
              style={{
                maxWidth: 220, maxHeight: 64,
                objectFit: 'contain', display: 'block',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
              }}
            />
          </div>
        )}

        {/* Clock */}
        <div style={{
          padding: showLogo ? '16px 32px 0' : '28px 32px 0',
          flexShrink: 0,
        }}>
          <ClockDisplay />
          <div style={{
            color: 'rgba(255,255,255,0.28)', fontSize: 9,
            fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase', marginTop: 4,
          }}>
            Información del hotel
          </div>
        </div>

        {/* Separator */}
        <div style={{ margin: '18px 32px 0', height: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* ── Content ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 32px', gap: 12,
        }}>

          {/* Label */}
          <div style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 36, fontWeight: 800,
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {item.label}
          </div>

          {/* Red accent */}
          <div style={{ width: 36, height: 3, background: '#c8102e', borderRadius: 2 }} />

          {/* Value */}
          {isWifi ? (
            <WifiBlock network={wifiParts[0] ?? item.value} password={wifiParts[1] ?? ''} qrImageUrl={item.qrImageUrl} />
          ) : (
            <div style={{
              color: '#fff',
              fontSize: valueFontSize,
              fontWeight: 900, lineHeight: 1.05, letterSpacing: -1,
            }}>
              {item.value}
            </div>
          )}

          {/* Status badge */}
          {status && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: status.type === 'active'
                ? 'rgba(34,197,94,0.18)'
                : 'rgba(251,191,36,0.18)',
              border: `1px solid ${status.type === 'active' ? 'rgba(34,197,94,0.5)' : 'rgba(251,191,36,0.5)'}`,
              borderRadius: 50, padding: '6px 16px',
              alignSelf: 'flex-start', marginTop: 4,
            }}>
              {/* Pulsing dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: status.type === 'active' ? '#22c55e' : '#fbbf24',
                animation: status.type === 'active' ? 'tv-pulse 1.5s ease infinite' : 'none',
              }} />
              <span style={{
                color: status.type === 'active' ? '#4ade80' : '#fde68a',
                fontSize: 20, fontWeight: 800, letterSpacing: 0.5,
              }}>
                {status.label}
              </span>
            </div>
          )}
        </div>

        {/* Dots + progress */}
        <div style={{ padding: '0 32px 28px', flexShrink: 0 }}>
          {total > 1 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {items.map((_, i) => (
                <div key={i} style={{
                  height: 3,
                  flex: i === currentIdx ? 3 : 1,
                  borderRadius: 2,
                  background: i === currentIdx ? '#c8102e' : 'rgba(255,255,255,0.13)',
                  transition: 'flex 0.4s ease',
                }} />
              ))}
            </div>
          )}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
            <div
              key={`prog-${currentIdx}`}
              style={{
                height: '100%', background: '#c8102e', width: '0%',
                animation: `tv-prog ${slideDurationMs}ms linear forwards`,
              }}
            />
          </div>
        </div>

        {/* Red bottom stripe */}
        <div style={{ height: 4, background: '#c8102e', flexShrink: 0 }} />
      </div>

      {/* Slide counter top-right */}
      {total > 1 && (
        <div style={{
          position: 'absolute', top: 20, right: 24,
          color: 'rgba(255,255,255,0.35)', fontSize: 12,
          fontWeight: 700, letterSpacing: 2,
        }}>
          {currentIdx + 1} / {total}
        </div>
      )}
    </div>
  );
}

function WifiBlock({ network, password, qrImageUrl }: { network: string; password: string; qrImageUrl?: string }) {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Text info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Red</div>
          <div style={{ color: '#fff', fontSize: network.length > 18 ? 36 : 52, fontWeight: 900 }}>{network}</div>
        </div>
        {password && (
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Contraseña</div>
            <div style={{
              color: '#fff',
              fontSize: password.length > 18 ? 26 : 38,
              fontWeight: 900,
              background: 'rgba(200,16,46,0.18)',
              border: '1px solid rgba(200,16,46,0.4)',
              borderRadius: 8, padding: '10px 16px', display: 'inline-block',
            }}>
              {password}
            </div>
          </div>
        )}
      </div>

      {/* QR code */}
      {qrImageUrl && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 8,
            width: 140,
            height: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={qrImageUrl}
              alt="QR WiFi"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            Escanear
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
    <div style={{ color: '#fff', fontSize: 68, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
      {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

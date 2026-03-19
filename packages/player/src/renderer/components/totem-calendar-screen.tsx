import React, { useEffect, useState } from 'react';

type ScheduleItem = { time: string; activity: string; location?: string; imageUrl?: string };
type ViewMode = 'all' | 'individual' | 'current';
interface Props { schedule: ScheduleItem[]; screenName: string }

const DUR_ALL        = 12_000;
const DUR_INDIVIDUAL =  5_000;
const DUR_CURRENT    =  8_000;

// ─── Argentina time ───────────────────────────────────────────────────────────
function getArgTime(): string {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const h = p.find(x => x.type === 'hour')?.value   ?? '00';
  const m = p.find(x => x.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}
function getArgDateStr(): string {
  const p = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long', day: 'numeric', month: 'long',
  }).formatToParts(new Date());
  const wd = p.find(x => x.type === 'weekday')?.value ?? '';
  const d  = p.find(x => x.type === 'day')?.value    ?? '';
  const mo = p.find(x => x.type === 'month')?.value  ?? '';
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${d} de ${mo}`;
}
function toMins(t: string): number {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}

// Keyword → gradient fallback (when no custom image uploaded)
function getActivityGradient(activity: string): string {
  const a = activity.toLowerCase();
  if (/pool|pileta|nadar|natac|swim|acuatic/.test(a))
    return 'linear-gradient(160deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)';
  if (/gym|gimnas|fitness|ejerc|crossfit|pesas|musculac/.test(a))
    return 'linear-gradient(160deg, #1c1917 0%, #292524 50%, #57534e 100%)';
  if (/yoga|meditac|pilates|stretching|mindful|zen/.test(a))
    return 'linear-gradient(160deg, #2e1065 0%, #4c1d95 50%, #7c3aed 100%)';
  if (/spa|masaje|relax|sauna|wellness|jacuzzi/.test(a))
    return 'linear-gradient(160deg, #134e4a 0%, #0f766e 50%, #0d9488 100%)';
  if (/desayuno|breakfast|brunch/.test(a))
    return 'linear-gradient(160deg, #78350f 0%, #b45309 50%, #d97706 100%)';
  if (/almuerzo|lunch|comida|cena|dinner|restaur|gastronom|buffet|grill/.test(a))
    return 'linear-gradient(160deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)';
  if (/trek|caminat|hiking|sendero|monta|excurs|senderismo/.test(a))
    return 'linear-gradient(160deg, #14532d 0%, #15803d 50%, #22c55e 100%)';
  if (/bar|cocktail|drink|bebida|happy|aperitivo|wine|vino|cerveza/.test(a))
    return 'linear-gradient(160deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)';
  if (/kids|niño|infantil|junior|mini|children|chico/.test(a))
    return 'linear-gradient(160deg, #831843 0%, #be185d 50%, #ec4899 100%)';
  if (/bike|bici|ciclis|cycling|mountain/.test(a))
    return 'linear-gradient(160deg, #052e16 0%, #166534 50%, #16a34a 100%)';
  if (/tenis|tennis|padel|squash|deporte|cancha/.test(a))
    return 'linear-gradient(160deg, #1a2e05 0%, #365314 50%, #84cc16 100%)';
  if (/surf|playa|beach|mar|ocean|buceo|snorkel/.test(a))
    return 'linear-gradient(160deg, #083344 0%, #155e75 50%, #0891b2 100%)';
  if (/musica|show|espectaculo|live|concierto|banda|teatro|danza/.test(a))
    return 'linear-gradient(160deg, #2d1b69 0%, #5b21b6 50%, #a855f7 100%)';
  if (/tour|paseo|visita|city|excursion/.test(a))
    return 'linear-gradient(160deg, #1c1917 0%, #374151 50%, #6b7280 100%)';
  if (/foto|photo|galeria|exhibic/.test(a))
    return 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)';
  return 'linear-gradient(160deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)';
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function TotemCalendarScreen({ schedule }: Props) {
  const [time,    setTime]    = useState<string>(getArgTime);
  const [dateStr, setDateStr] = useState<string>(getArgDateStr);
  const [mode,    setMode]    = useState<ViewMode>('all');
  const [itemIdx, setItemIdx] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const sorted     = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
  const nowMins    = toMins(time);
  const currentItem = [...sorted].reverse().find(s => toMins(s.time) <= nowMins) ?? null;
  const nextItem    = sorted.find(s => toMins(s.time) > nowMins) ?? null;
  const minsToNext  = nextItem ? toMins(nextItem.time) - nowMins : null;
  const comingSoon  = minsToNext !== null && minsToNext <= 30;

  useEffect(() => {
    const iv = setInterval(() => { setTime(getArgTime()); setDateStr(getArgDateStr()); }, 1_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (sorted.length === 0) return;
    const bump = () => setFadeKey(k => k + 1);
    let t: ReturnType<typeof setTimeout>;
    if (mode === 'all') {
      t = setTimeout(() => { bump(); setItemIdx(0); setMode('individual'); }, DUR_ALL);
    } else if (mode === 'individual') {
      t = setTimeout(() => {
        bump();
        if (itemIdx < sorted.length - 1) setItemIdx(i => i + 1);
        else setMode('current');
      }, DUR_INDIVIDUAL);
    } else {
      t = setTimeout(() => { bump(); setMode('all'); }, DUR_CURRENT);
    }
    return () => clearTimeout(t);
  }, [mode, itemIdx, sorted.length]); // eslint-disable-line

  return (
    <div style={{
      width: '100%', height: '100%',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      color: '#fff',
      background: 'linear-gradient(160deg, #b91c1c 0%, #dc2626 35%, #b91c1c 65%, #991b1b 100%)',
      backgroundSize: '200% 200%',
      animation: 'bgFloat 12s ease-in-out infinite',
    }}>
      {/* Diagonal stripe texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `repeating-linear-gradient(-45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 28px)`,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '300px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, position: 'relative', zIndex: 2,
        padding: '28px 32px 22px',
        borderBottom: '2px solid rgba(255,255,255,0.25)',
        background: 'rgba(0,0,0,0.22)',
      }}>
        <div style={{ fontSize: '18px', letterSpacing: '0.38em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
          Magna Hoteles
        </div>
        <div style={{ fontSize: '72px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
          Actividades del día
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{dateStr}</div>
          <div style={{
            background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)',
            borderRadius: '16px', padding: '10px 20px',
            display: 'flex', alignItems: 'baseline', gap: '5px',
          }}>
            <div style={{ fontSize: '58px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', color: '#fff', textShadow: '0 0 30px rgba(255,255,255,0.4)', animation: 'clockPulse 1s ease-in-out infinite' }}>
              {time}
            </div>
            <div style={{ fontSize: '17px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>hs</div>
          </div>
        </div>
        {/* Phase bar */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          {(['all', 'individual', 'current'] as ViewMode[]).map(m => (
            <div key={m} style={{
              flex: mode === m ? 2.5 : 1, height: '4px', borderRadius: '2px',
              background: mode === m ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
              transition: 'flex 0.5s ease', position: 'relative', overflow: 'hidden',
            }}>
              {mode === m && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#fff',
                  animation: `progressBar ${m === 'all' ? DUR_ALL : m === 'individual' ? DUR_INDIVIDUAL : DUR_CURRENT}ms linear`,
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div key={fadeKey} style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1, animation: 'viewFadeIn 0.6s ease-out' }}>
        {mode === 'all' && <AllView sorted={sorted} nowMins={nowMins} currentItem={currentItem} nextItem={nextItem} />}
        {mode === 'individual' && sorted[itemIdx] && (
          <IndividualView item={sorted[itemIdx]} index={itemIdx} total={sorted.length} nowMins={nowMins} currentItem={currentItem} nextItem={nextItem} minsToNext={minsToNext} />
        )}
        {mode === 'current' && (
          <CurrentView currentItem={currentItem} nextItem={nextItem} minsToNext={minsToNext} comingSoon={comingSoon} />
        )}
      </div>

      <div style={{ flexShrink: 0, height: '6px', zIndex: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.7), rgba(255,255,255,0.2))' }} />

      <style>{`
        @keyframes bgFloat { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes viewFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.1} }
        @keyframes blinkSoft { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes progressBar { from{width:0%} to{width:100%} }
        @keyframes clockPulse { 0%,100%{text-shadow:0 0 30px rgba(255,255,255,0.4)} 50%{text-shadow:0 0 55px rgba(255,255,255,0.85)} }
        @keyframes shimmerBar { 0%{left:-100%} 100%{left:200%} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes whitePulse { 0%,100%{box-shadow:0 0 0 rgba(255,255,255,0)} 50%{box-shadow:0 0 50px rgba(255,255,255,0.5),0 0 100px rgba(255,255,255,0.2)} }
        @keyframes imgZoom { from{transform:scale(1)} to{transform:scale(1.06)} }
      `}</style>
    </div>
  );
}

// ─── ALL VIEW ─────────────────────────────────────────────────────────────────
function AllView({ sorted, nowMins, currentItem, nextItem }: {
  sorted: ScheduleItem[]; nowMins: number;
  currentItem: ScheduleItem | null; nextItem: ScheduleItem | null;
}) {
  return (
    <div style={{ height: '100%', overflowY: 'hidden', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sorted.map((item, i) => {
        const isCurrent = currentItem?.time === item.time;
        const isNext    = nextItem?.time === item.time;
        const isPast    = toMins(item.time) < nowMins && !isCurrent;
        const imgUrl    = item.imageUrl || null;
        const gradient  = getActivityGradient(item.activity);

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'stretch',
            borderRadius: '20px', overflow: 'hidden',
            opacity: isPast ? 0.28 : 1,
            animation: `slideLeft 0.5s ease-out ${i * 0.055}s both`,
            background: isCurrent ? '#fff' : isNext ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
            border: isCurrent ? '3px solid #fff' : isNext ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.15)',
            boxShadow: isCurrent ? '0 0 40px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.2)' : 'none',
            minHeight: '100px',
          }}>

            {/* Activity image / gradient thumbnail */}
            <div style={{ width: '100px', flexShrink: 0, position: 'relative', overflow: 'hidden', background: gradient }}>
              {imgUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: isCurrent ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)' }} />
            </div>

            {/* Time block */}
            <div style={{
              width: '140px', flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '18px 12px',
              background: isCurrent ? 'rgba(220,38,38,0.1)' : 'rgba(0,0,0,0.12)',
              borderRight: isCurrent ? '2px solid rgba(220,38,38,0.2)' : '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{ fontSize: '42px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: isCurrent ? '#dc2626' : '#fff' }}>
                {item.time}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: isCurrent ? 'rgba(220,38,38,0.6)' : 'rgba(255,255,255,0.45)', marginTop: '4px' }}>hs</div>
            </div>

            {/* Activity text */}
            <div style={{ flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: isCurrent || isNext ? 800 : 600, lineHeight: 1.2, color: isCurrent ? '#111' : '#fff' }}>
                {item.activity}
              </div>
              {item.location && (
                <div style={{ fontSize: '20px', marginTop: '6px', color: isCurrent ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)' }}>
                  📍 {item.location}
                </div>
              )}
            </div>

            {/* Badge */}
            <div style={{ width: '100px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
              {isCurrent && (
                <div style={{ background: '#dc2626', color: '#fff', fontSize: '14px', fontWeight: 900, letterSpacing: '0.08em', padding: '8px 12px', borderRadius: '10px', animation: 'blinkSoft 1.8s ease-in-out infinite', textAlign: 'center' }}>
                  AHORA
                </div>
              )}
              {isNext && !isCurrent && (
                <div style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', padding: '7px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.4)', textAlign: 'center' }}>
                  PRÓX.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: 'rgba(255,255,255,0.4)' }}>
          Sin actividades programadas
        </div>
      )}
    </div>
  );
}

// ─── INDIVIDUAL VIEW ──────────────────────────────────────────────────────────
function IndividualView({ item, index, total, nowMins, currentItem, nextItem, minsToNext }: {
  item: ScheduleItem; index: number; total: number; nowMins: number;
  currentItem: ScheduleItem | null; nextItem: ScheduleItem | null; minsToNext: number | null;
}) {
  const isCurrent = currentItem?.time === item.time;
  const isNext    = nextItem?.time === item.time;
  const isPast    = toMins(item.time) < nowMins && !isCurrent;
  const soonNext  = isNext && minsToNext !== null && minsToNext <= 30;
  const imgUrl    = item.imageUrl || null;
  const gradient  = getActivityGradient(item.activity);

  let label = 'PROGRAMADO';
  if (isCurrent)     label = 'EN CURSO AHORA';
  else if (soonNext) label = `PRÓXIMO A COMENZAR · EN ${minsToNext} MIN`;
  else if (isNext)   label = 'A CONTINUACIÓN';
  else if (isPast)   label = 'FINALIZADO';

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 36px 70px' }}>

      {/* Full-screen background: gradient always + image on top */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* Gradient always visible as base */}
        <div style={{ position: 'absolute', inset: 0, background: gradient }} />
        {/* Image overlaid on top (if available) */}
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: `imgZoom ${DUR_INDIVIDUAL}ms ease-in-out both` }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {/* Dark overlay — más oscuro para que el texto resalte */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0.72) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(-45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 24px)` }} />
      </div>

      {/* Ghost time behind content */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '260px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.05)', lineHeight: 1, pointerEvents: 'none', userSelect: 'none', letterSpacing: '-0.06em', whiteSpace: 'nowrap', zIndex: 1 }}>
        {item.time}
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: '32px', animation: 'scaleIn 0.4s ease-out', zIndex: 2 }}>
        <span style={{
          fontSize: '18px', fontWeight: 900, letterSpacing: '0.18em',
          color: isCurrent ? '#dc2626' : '#fff',
          background: isCurrent ? '#fff' : 'rgba(255,255,255,0.25)',
          padding: '12px 30px', borderRadius: '40px',
          border: isCurrent ? '3px solid #fff' : '2px solid rgba(255,255,255,0.5)',
          animation: isCurrent || soonNext ? 'blinkSoft 2s ease-in-out infinite' : 'none',
          backdropFilter: 'blur(10px)',
        }}>
          {label}
        </span>
      </div>

      {/* Time */}
      <div style={{
        fontSize: '140px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.05em',
        fontVariantNumeric: 'tabular-nums',
        color: isPast ? 'rgba(255,255,255,0.25)' : '#fff',
        textShadow: isCurrent ? '0 0 80px rgba(255,255,255,0.6), 0 4px 30px rgba(0,0,0,0.8)' : '0 4px 30px rgba(0,0,0,0.8)',
        animation: isCurrent ? 'floatY 3s ease-in-out infinite' : 'slideUp 0.5s ease-out 0.07s both',
        zIndex: 2, position: 'relative',
      }}>
        {item.time}
        <span style={{ fontSize: '40px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: '10px' }}>hs</span>
      </div>

      {/* Divider */}
      <div style={{ width: '120px', height: '5px', borderRadius: '3px', background: isCurrent ? '#fff' : 'rgba(255,255,255,0.5)', marginTop: '16px', marginBottom: '10px', zIndex: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'rgba(220,38,38,0.8)', animation: 'shimmerBar 1.5s ease-in-out infinite' }} />
      </div>

      {/* Activity name */}
      <div style={{ fontSize: '58px', fontWeight: 800, textAlign: 'center', marginTop: '10px', lineHeight: 1.15, letterSpacing: '-0.01em', color: isPast ? 'rgba(255,255,255,0.25)' : '#fff', textShadow: '0 4px 30px rgba(0,0,0,0.9)', animation: 'slideUp 0.5s ease-out 0.14s both', zIndex: 2 }}>
        {item.activity}
      </div>

      {/* Location */}
      {item.location && (
        <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.8)', marginTop: '18px', textAlign: 'center', animation: 'slideUp 0.5s ease-out 0.22s both', zIndex: 2, textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}>
          📍 {item.location}
        </div>
      )}

      {/* Progress track */}
      <div style={{ position: 'absolute', bottom: '22px', left: '32px', right: '32px', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {[...Array(total)].map((_, j) => (
            <div key={j} style={{ flex: 1, height: '5px', borderRadius: '3px', background: j < index ? 'rgba(255,255,255,0.8)' : j === index ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', position: 'relative', overflow: 'hidden' }}>
              {j === index && <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: `progressBar ${DUR_INDIVIDUAL}ms linear` }} />}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '18px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>
          {index + 1} / {total}
        </div>
      </div>
    </div>
  );
}

// ─── CURRENT VIEW ─────────────────────────────────────────────────────────────
function CurrentView({ currentItem, nextItem, minsToNext, comingSoon }: {
  currentItem: ScheduleItem | null; nextItem: ScheduleItem | null;
  minsToNext: number | null; comingSoon: boolean;
}) {
  if (!currentItem && !nextItem) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={{ fontSize: '72px' }}>🌙</div>
        <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Fin de actividades</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 28px', gap: '18px' }}>

      {/* ── EN CURSO ── */}
      {currentItem ? (
        <div style={{
          flex: nextItem ? '1.6' : '1',
          borderRadius: '24px', overflow: 'hidden',
          border: '3px solid #fff',
          boxShadow: '0 0 60px rgba(255,255,255,0.4), 0 16px 48px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
          animation: 'scaleIn 0.5s ease-out, whitePulse 3s ease-in-out infinite',
        }}>
          {/* Background: gradient always + image on top */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: getActivityGradient(currentItem.activity) }} />
            {currentItem.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentItem.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 16px rgba(255,255,255,0.8)', animation: 'blink 1.4s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.22em', color: '#fff' }}>EN CURSO AHORA</span>
            </div>
            <div style={{ fontSize: '70px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#fff', textShadow: '0 0 40px rgba(255,255,255,0.3)' }}>
              {currentItem.time}
              <span style={{ fontSize: '22px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>hs</span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#fff', marginTop: '12px', lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              {currentItem.activity}
            </div>
            {currentItem.location && (
              <div style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>📍 {currentItem.location}</div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── PRÓXIMO ── */}
      {nextItem && (
        <div style={{
          flex: currentItem ? '1' : '1.6',
          borderRadius: '24px', overflow: 'hidden',
          border: `2px solid ${comingSoon ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}`,
          display: 'flex', flexDirection: 'column',
          position: 'relative',
          animation: 'scaleIn 0.5s ease-out 0.14s both',
        }}>
          {/* Background: gradient always + image on top */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: getActivityGradient(nextItem.activity), opacity: 0.7 }} />
            {nextItem.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nextItem.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: comingSoon ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.5)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', animation: comingSoon ? 'blinkSoft 1.8s ease-in-out infinite' : 'none', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.2em', color: comingSoon ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                {comingSoon ? `PRÓXIMO A COMENZAR · EN ${minsToNext} MIN` : 'A CONTINUACIÓN'}
              </span>
            </div>
            <div style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: comingSoon ? '#fff' : 'rgba(255,255,255,0.75)' }}>
              {nextItem.time}
              <span style={{ fontSize: '17px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>hs</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', lineHeight: 1.2, color: comingSoon ? '#fff' : 'rgba(255,255,255,0.65)' }}>
              {nextItem.activity}
            </div>
            {nextItem.location && (
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginTop: '7px' }}>📍 {nextItem.location}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

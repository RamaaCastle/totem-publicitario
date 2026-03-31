import React from 'react';

interface HotelInfoItem {
  id: string;
  label: string;
  value: string;
}

interface TVInfoScreenProps {
  items: HotelInfoItem[];
  screenName?: string;
}

export function TVInfoScreen({ items, screenName }: TVInfoScreenProps) {
  // Separate WIFI items from regular info items
  const wifiItem = items.find((i) => i.label.toLowerCase().includes('wifi') || i.label.toLowerCase().includes('wi-fi'));
  const regularItems = items.filter((i) => i !== wifiItem);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1208 50%, #0d0d0d 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decorative top bar */}
      <div style={{
        height: 4,
        background: 'linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px 60px 20px',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #c9a84c, #f0d080)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            🏨
          </div>
          <div>
            <div style={{ color: '#c9a84c', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 600 }}>
              Información del hotel
            </div>
            {screenName && (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{screenName}</div>
            )}
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: 1 }}>
          <Clock />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 60px 24px',
        gap: 20,
        overflow: 'hidden',
      }}>
        {/* Regular info items grid */}
        {regularItems.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(regularItems.length, 4)}, 1fr)`,
            gap: 16,
            flex: wifiItem ? '0 0 auto' : 1,
          }}>
            {regularItems.map((item) => (
              <InfoCard key={item.id} label={item.label} value={item.value} />
            ))}
          </div>
        )}

        {/* WiFi section */}
        {wifiItem && (
          <WifiCard item={wifiItem} />
        )}
      </div>

      {/* Decorative bottom bar */}
      <div style={{
        height: 4,
        background: 'linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c)',
      }} />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: 16,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      textAlign: 'center',
      minHeight: 100,
    }}>
      <div style={{
        color: 'rgba(201,168,76,0.7)',
        fontSize: 11,
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{
        color: '#ffffff',
        fontSize: value.length > 12 ? 20 : 28,
        fontWeight: 300,
        lineHeight: 1.2,
        letterSpacing: 0.5,
      }}>
        {value}
      </div>
    </div>
  );
}

function WifiCard({ item }: { item: { label: string; value: string } }) {
  // Parse "NetworkName | Password" or just show value
  const parts = item.value.split('|').map((s) => s.trim());
  const network = parts[0] ?? '';
  const password = parts[1] ?? '';

  return (
    <div style={{
      background: 'rgba(201,168,76,0.07)',
      border: '1px solid rgba(201,168,76,0.35)',
      borderRadius: 16,
      padding: '20px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 32,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'rgba(201,168,76,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        flexShrink: 0,
      }}>
        📶
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 48 }}>
        <div>
          <div style={{ color: 'rgba(201,168,76,0.7)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Red WiFi
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 400, letterSpacing: 0.5 }}>
            {network || item.value}
          </div>
        </div>
        {password && (
          <>
            <div style={{ width: 1, height: 40, background: 'rgba(201,168,76,0.2)' }} />
            <div>
              <div style={{ color: 'rgba(201,168,76,0.7)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                Contraseña
              </div>
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 400, fontFamily: 'monospace', letterSpacing: 1.5 }}>
                {password}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontSize: 28, fontWeight: 200, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' }}>
      {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgStore, ORGS, OrgConfig } from '@/stores/org.store';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api/auth';

interface PublicOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

function buildOrgConfig(apiOrg: PublicOrg): OrgConfig {
  const fallback = ORGS[apiOrg.slug];
  return {
    id: apiOrg.id,
    slug: apiOrg.slug,
    name: apiOrg.name,
    primary: apiOrg.primaryColor ?? fallback?.primary ?? '#3b82f6',
    bg: apiOrg.primaryColor ?? fallback?.bg ?? '#0f172a',
    logoUrl: apiOrg.logoUrl ?? null,
  };
}

function AnimatedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let t = 0;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      t += 0.003;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#080b14');
      bg.addColorStop(0.5, '#0c1020');
      bg.addColorStop(1, '#08100c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      [
        { cx: W * 0.15, cy: H * 0.25, r: 350, c: 'rgba(59,130,246,0.07)', phase: 0 },
        { cx: W * 0.85, cy: H * 0.7, r: 400, c: 'rgba(139,92,246,0.06)', phase: 2 },
        { cx: W * 0.5, cy: H * 0.5, r: 250, c: 'rgba(16,185,129,0.04)', phase: 4 },
      ].forEach(o => {
        const dx = Math.sin(t + o.phase) * 25;
        const dy = Math.cos(t + o.phase) * 18;
        const g = ctx.createRadialGradient(o.cx + dx, o.cy + dy, 0, o.cx + dx, o.cy + dy, o.r);
        g.addColorStop(0, o.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.cx + dx, o.cy + dy, o.r, 0, Math.PI * 2); ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(148,163,184,${0.08 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${p.alpha})`; ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />;
}

export default function OrgSelectPage() {
  const router = useRouter();
  const { setSelectedOrg } = useOrgStore();
  const { isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [ready, setReady] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const { selectedOrg } = useOrgStore();

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && selectedOrg) router.replace('/dashboard');
  }, [_hasHydrated, isAuthenticated, selectedOrg, router]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/api/v1/organizations/public`)
      .then(r => r.json())
      .then(data => {
        const list: PublicOrg[] = Array.isArray(data) ? data : (data?.data ?? []);
        setOrgs(list);
      })
      .catch(() => {
        setOrgs(Object.values(ORGS).map(o => ({ id: '', slug: o.slug, name: o.name, logoUrl: null, primaryColor: o.primary })));
      });
    setTimeout(() => setReady(true), 100);
  }, []);

  const handleSelect = async (apiOrg: PublicOrg) => {
    if (isAuthenticated) { try { await authApi.logout(); } catch {} logout(); }
    setSelectedOrg(buildOrgConfig(apiOrg));
    router.push('/login');
  };

  const displayOrgs: PublicOrg[] = orgs.length > 0
    ? orgs
    : Object.values(ORGS).map(o => ({ id: '', slug: o.slug, name: o.name, logoUrl: null, primaryColor: o.primary }));

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.6; }
          70%  { transform: scale(1.05); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
        <AnimatedBackground />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Header */}
          <div style={{
            animation: ready ? 'fadeUp 0.5s ease both' : 'none', opacity: ready ? undefined : 0,
            marginBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            {/* Circular logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/grupopedraza.png"
              alt="Grupo Pedraza"
              style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 32px rgba(255,255,255,0.08)',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Marketing digital</p>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '4px 0 2px', letterSpacing: '-0.02em' }}>Grupo Pedraza</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>Panel Administrativo</p>
            </div>
          </div>

          {/* Title */}
          <div style={{
            textAlign: 'center', marginBottom: 48,
            animation: ready ? 'fadeUp 0.5s 0.08s ease both' : 'none', opacity: ready ? undefined : 0,
          }}>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800,
              color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10,
            }}>
              Seleccioná tu empresa
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
              Elegí la organización a la que querés ingresar
            </p>
          </div>

          {/* Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: '100%',
            animation: ready ? 'fadeUp 0.5s 0.16s ease both' : 'none', opacity: ready ? undefined : 0,
          }}>
            {displayOrgs.map((org) => {
              const color = org.primaryColor ?? ORGS[org.slug]?.primary ?? '#3b82f6';
              const isHovered = hoveredSlug === org.slug;
              const initials = org.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

              return (
                <button
                  key={org.slug}
                  onClick={() => handleSelect(org)}
                  onMouseEnter={() => setHoveredSlug(org.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  style={{
                    position: 'relative', textAlign: 'left', cursor: 'pointer',
                    background: isHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isHovered ? color + '80' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 20, padding: '28px 24px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: isHovered ? `0 0 40px ${color}20, 0 20px 60px rgba(0,0,0,0.3)` : '0 8px 32px rgba(0,0,0,0.2)',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                    transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Glow top */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: isHovered ? `linear-gradient(90deg, transparent, ${color}60, transparent)` : 'transparent',
                    transition: 'background 0.3s',
                  }} />

                  {/* Logo / initials */}
                  <div style={{ marginBottom: 20, position: 'relative' }}>
                    {org.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logoUrl} alt={org.name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 800, color: 'white',
                        boxShadow: `0 4px 20px ${color}40`,
                      }}>
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, lineHeight: 1.2, marginBottom: 4 }}>
                      {org.name.split(' ')[0]}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                      {org.name.split(' ').slice(1).join(' ')}
                    </p>
                  </div>

                  {/* CTA */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600,
                    color: isHovered ? color : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.2s',
                  }}>
                    Ingresar
                    <span style={{ transform: isHovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s', display: 'inline-block' }}>→</span>
                  </div>

                  {/* Bottom accent */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: 2, borderRadius: '0 0 0 20px',
                    width: isHovered ? '100%' : '0%',
                    background: `linear-gradient(90deg, ${color}, transparent)`,
                    transition: 'width 0.3s ease',
                  }} />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <p style={{
            marginTop: 40, fontSize: 11, color: 'rgba(255,255,255,0.15)',
            animation: ready ? 'fadeUp 0.5s 0.24s ease both' : 'none', opacity: ready ? undefined : 0,
          }}>
            Acceso restringido · Solo personal autorizado
          </p>
        </div>
      </div>
    </>
  );
}

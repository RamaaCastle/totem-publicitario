'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useOrgStore } from '@/stores/org.store';
import { authApi } from '@/lib/api/auth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

/* ── Abstract animated background for Pedraza ── */
function PedrazaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c084fc', '#1b1a36'];
    type Particle = {
      x: number; y: number; r: number;
      vx: number; vy: number; color: string; alpha: number;
    };

    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.5 + 0.15,
    }));

    let t = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      t += 0.004;

      ctx.clearRect(0, 0, W, H);

      // Deep background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   '#0d0c1e');
      bg.addColorStop(0.5, '#111033');
      bg.addColorStop(1,   '#0a0918');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Slow rotating orbs
      const orbs = [
        { cx: W * 0.2, cy: H * 0.3, r: 260, c1: 'rgba(99,102,241,0.18)', c2: 'transparent', phase: 0 },
        { cx: W * 0.75, cy: H * 0.65, r: 300, c1: 'rgba(192,132,252,0.12)', c2: 'transparent', phase: 2 },
        { cx: W * 0.5, cy: H * 0.5, r: 180, c1: 'rgba(129,140,248,0.08)', c2: 'transparent', phase: 4 },
      ];
      orbs.forEach(o => {
        const dx = Math.sin(t + o.phase) * 30;
        const dy = Math.cos(t + o.phase) * 20;
        const g = ctx.createRadialGradient(o.cx + dx, o.cy + dy, 0, o.cx + dx, o.cy + dy, o.r);
        g.addColorStop(0, o.c1);
        g.addColorStop(1, o.c2);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.cx + dx, o.cy + dy, o.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(165,180,252,${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw & move particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `,${p.alpha})`).replace('rgb', 'rgba');
        // Use simple rgba
        ctx.fillStyle = `rgba(165,180,252,${p.alpha})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
      }}
    />
  );
}

/* ── Magna background ── */
function MagnaBackground({ primary }: { primary: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#0f0000' }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '-15%',
        width: '65vw', height: '65vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${primary}25 0%, transparent 65%)`,
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '55vw', height: '55vw', borderRadius: '50%',
        background: `radial-gradient(circle, ${primary}18 0%, transparent 65%)`,
      }} />
    </div>
  );
}

const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [ready, setReady]               = useState(false);
  const router          = useRouter();
  const { setAuth }     = useAuthStore();
  const { selectedOrg } = useOrgStore();

  useEffect(() => {
    if (!selectedOrg) router.replace('/');
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, [selectedOrg, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      const response = await authApi.login(data.email, data.password, selectedOrg?.slug);
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      // Full reload to clear React Query cache from previous org session
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
    }
  };

  if (!selectedOrg) return null;

  const isMagna  = selectedOrg.slug === 'magna';
  const primary  = selectedOrg.primary;
  const accent   = '#6366f1';
  const btnColor = isMagna ? primary : accent;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        display: 'flex', overflow: 'hidden',
      }}>
        {/* Background */}
        {isMagna ? <MagnaBackground primary={primary} /> : <PedrazaCanvas />}

        {/* ── LEFT: branding ── */}
        <div
          className="hidden lg:flex"
          style={{
            position: 'relative', zIndex: 10,
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.5rem 3rem',
          }}
        >
          {/* Top: back */}
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'color 0.2s', width: 'fit-content',
              animation: ready ? 'fadeUp 0.4s ease both' : 'none',
              opacity: ready ? undefined : 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
          >
            <ArrowLeft size={14} /> Cambiar empresa
          </button>

          {/* Center: logo + text */}
          <div style={{
            animation: ready ? 'fadeUp 0.5s 0.1s ease both' : 'none',
            opacity: ready ? undefined : 0,
          }}>
            {/* Logo desde la DB */}
            {selectedOrg.logoUrl && (
              <img
                src={selectedOrg.logoUrl}
                alt={selectedOrg.name}
                style={{
                  height: 56, width: 'auto', maxWidth: 220,
                  objectFit: 'contain', objectPosition: 'left',
                  marginBottom: 32,
                }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}

            <h2 style={{
              fontSize: 'clamp(2rem, 2.8vw, 2.8rem)',
              fontWeight: 800, color: 'white',
              lineHeight: 1.12, letterSpacing: '-0.03em',
              marginBottom: 12,
            }}>
              {isMagna ? (
                <>Bienvenido a<br /><span style={{ color: primary }}>Magna Hoteles</span></>
              ) : (
                <>Pedraza<br />Viajes y Turismo</>
              )}
            </h2>

            <p style={{
              fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.45)',
              maxWidth: 300,
            }}>
              {isMagna ? (
                <>Panel de gestión de cartelería digital.<br />Ingresá con tus credenciales para continuar.</>
              ) : (
                'Panel administrativo'
              )}
            </p>
          </div>

          {/* Bottom */}
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.18)',
            animation: ready ? 'fadeUp 0.4s 0.2s ease both' : 'none',
            opacity: ready ? undefined : 0,
          }}>
            &copy; {new Date().getFullYear()} Signage Platform
          </p>
        </div>

        {/* ── RIGHT: form ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: 420, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
          background: 'white',
          boxShadow: '-32px 0 80px rgba(0,0,0,0.35)',
        }}>
          <div style={{
            width: '100%', maxWidth: 340,
            animation: ready ? 'fadeUp 0.55s 0.1s ease both' : 'none',
            opacity: ready ? undefined : 0,
          }}>

            {/* Mobile: back */}
            <div className="flex items-center mb-8 lg:hidden">
              <button
                onClick={() => router.push('/')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: '#94a3b8', fontSize: 13,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} /> Cambiar empresa
              </button>
            </div>

            {/* Org indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: btnColor,
                boxShadow: `0 0 10px ${btnColor}99`,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#94a3b8',
              }}>
                {selectedOrg.name}
              </span>
            </div>

            <h1 style={{
              fontSize: '1.8rem', fontWeight: 800,
              color: '#0f172a', letterSpacing: '-0.025em',
              lineHeight: 1.15, marginBottom: 6,
            }}>
              Iniciar sesión
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 28 }}>
              Ingresá tus credenciales para continuar
            </p>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email" autoComplete="email" autoFocus
                  placeholder="usuario@empresa.com"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    background: '#f8fafc',
                    border: `2px solid ${focusedField === 'email' ? btnColor : '#e2e8f0'}`,
                    boxShadow: focusedField === 'email' ? `0 0 0 4px ${btnColor}18` : 'none',
                    color: '#0f172a',
                    transition: 'border-color 0.18s, box-shadow 0.18s',
                  }}
                />
                {errors.email && <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" placeholder="••••••••"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%', padding: '11px 42px 11px 14px',
                      borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      background: '#f8fafc',
                      border: `2px solid ${focusedField === 'password' ? btnColor : '#e2e8f0'}`,
                      boxShadow: focusedField === 'password' ? `0 0 0 4px ${btnColor}18` : 'none',
                      color: '#0f172a',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.password.message}</p>}
              </div>

              {/* Error */}
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={isSubmitting}
                style={{
                  marginTop: 8, width: '100%', padding: '13px 20px', borderRadius: 10,
                  border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 600, color: 'white',
                  background: btnColor,
                  boxShadow: `0 4px 16px ${btnColor}55`,
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${btnColor}66`;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = `0 4px 16px ${btnColor}55`;
                }}
              >
                {isSubmitting
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Ingresando...</>
                  : <><span>Ingresar al panel</span><ChevronRight size={14} /></>
                }
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 11, marginTop: 20, color: '#cbd5e1' }}>
              Acceso restringido · Solo personal autorizado
            </p>
          </div>
        </div>

      </div>
    </>
  );
}

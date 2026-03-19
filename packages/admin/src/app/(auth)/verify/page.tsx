'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { useOrgStore } from '@/stores/org.store';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pop {
    0%   { transform: scale(0.8); opacity: 0; }
    60%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
`;

function VerifyContent() {
  const [digits, setDigits]       = useState(['', '', '', '', '', '']);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [ready, setReady]         = useState(false);
  const inputsRef                 = useRef<(HTMLInputElement | null)[]>([]);
  const router                    = useRouter();
  const params                    = useSearchParams();
  const email                     = params.get('email') || '';
  const { selectedOrg }           = useOrgStore();

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, [ready]);

  const isMagna  = selectedOrg?.slug === 'magna';
  const primary  = selectedOrg?.primary || '#6366f1';
  const accent   = isMagna ? primary : '#6366f1';

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    setError('');
    if (val && i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every(d => d !== '')) handleSubmit(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      inputsRef.current[5]?.focus();
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (code: string) => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/api/v1/auth/verify-email`, { email, code });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código incorrecto');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await axios.post(`${API}/api/v1/auth/resend-verification`, { email });
      setError('');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: '1.5rem',
      }}>

        <div style={{
          width: '100%', maxWidth: 420,
          animation: ready ? 'fadeUp 0.5s ease both' : 'none',
          opacity: ready ? undefined : 0,
        }}>

          {/* Back */}
          <button
            onClick={() => router.push('/login')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#94a3b8', fontSize: 13, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              marginBottom: 32, transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            <ArrowLeft size={14} /> Volver al login
          </button>

          {/* Card */}
          <div style={{
            background: 'white', borderRadius: 20,
            padding: '2.5rem 2rem',
            boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}>
            {success ? (
              /* ── Success state ── */
              <div style={{ animation: 'pop 0.4s ease both' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#f0fdf4', margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={36} color="#22c55e" />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                  ¡Cuenta activada!
                </h2>
                <p style={{ fontSize: 14, color: '#64748b' }}>
                  Redirigiendo al login...
                </p>
              </div>
            ) : (
              /* ── Verification form ── */
              <>
                {/* Icon */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: `${accent}12`,
                  margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>
                  ✉️
                </div>

                <h1 style={{
                  fontSize: '1.5rem', fontWeight: 800, color: '#0f172a',
                  letterSpacing: '-0.02em', marginBottom: 8,
                }}>
                  Activá tu cuenta
                </h1>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 6 }}>
                  Te enviamos un código de 6 dígitos a
                </p>
                {email && (
                  <p style={{
                    fontSize: 14, fontWeight: 600, color: '#0f172a',
                    marginBottom: 32,
                  }}>
                    {email}
                  </p>
                )}

                {/* Digit inputs */}
                <div style={{
                  display: 'flex', gap: 10, justifyContent: 'center',
                  marginBottom: 24,
                }} onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputsRef.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      disabled={loading}
                      style={{
                        width: 52, height: 60,
                        textAlign: 'center',
                        fontSize: '1.6rem', fontWeight: 700, color: '#0f172a',
                        borderRadius: 12, outline: 'none',
                        border: `2px solid ${d ? accent : '#e2e8f0'}`,
                        background: d ? `${accent}08` : '#f8fafc',
                        boxShadow: d ? `0 0 0 3px ${accent}18` : 'none',
                        transition: 'all 0.15s',
                        caretColor: accent,
                      }}
                    />
                  ))}
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                    background: '#fef2f2', border: '1px solid #fecaca',
                  }}>
                    <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={() => handleSubmit(digits.join(''))}
                  disabled={loading || digits.some(d => !d)}
                  style={{
                    width: '100%', padding: '13px 20px', borderRadius: 12,
                    border: 'none', cursor: loading || digits.some(d => !d) ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600, color: 'white',
                    background: accent,
                    boxShadow: `0 4px 16px ${accent}44`,
                    opacity: digits.some(d => !d) ? 0.5 : 1,
                    transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 16,
                  }}
                  onMouseEnter={e => {
                    if (!loading && digits.every(d => d))
                      e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                >
                  {loading
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                    : 'Activar cuenta'
                  }
                </button>

                {/* Resend */}
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: 'none', border: 'none', cursor: resending ? 'default' : 'pointer',
                    fontSize: 13, color: '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, width: '100%', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (!resending) e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
                >
                  {resending
                    ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                    : <><RefreshCw size={13} /> Reenviar código</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}

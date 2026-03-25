'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Shield, Mail, UserCheck, UserX, Save, X, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth.store';

const STATUS_VARIANT: Record<string, any> = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'destructive',
  pending: 'warning',
};


export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form');
  const [newName, setNewName]       = useState('');
  const [newEmail, setNewEmail]     = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newOrgId, setNewOrgId]     = useState('');
  const [newRoleId, setNewRoleId]   = useState('');
  const [createError, setCreateError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyDigits, setVerifyDigits] = useState(['', '', '', '', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [resendOk, setResendOk] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/api/v1/users?limit=50'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get('/api/v1/roles'),
  });

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.get('/api/v1/organizations/public').then(r => r.data?.data ?? []),
    enabled: !!user?.isSuperAdmin,
  });

  const roles: any[] = rolesData?.data?.data ?? [];
  const orgOptions: any[] = orgsData ?? [];

  const selectedRole = roles.find(r => r.id === newRoleId);
  const isSuperAdminRole = selectedRole?.name === 'Super Admin';

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/v1/users/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/users', {
      name: newName,
      email: newEmail,
      password: newPassword,
      ...(isSuperAdminRole ? { isSuperAdmin: true } : { organizationId: newOrgId }),
      roleIds: newRoleId ? [newRoleId] : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setStep('done');
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message ?? 'Error al crear usuario');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (code: string) =>
      apiClient.post('/api/v1/auth/verify-email', { email: verifyEmail, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setStep('done');
    },
    onError: (err: any) => {
      setVerifyError(err.response?.data?.message ?? 'Código incorrecto o expirado');
      setVerifyDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/resend-verification', { email: verifyEmail }),
    onSuccess: () => { setResendOk(true); setTimeout(() => setResendOk(false), 3000); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { next[i] = d; });
      setVerifyDigits(next);
      const focusIdx = Math.min(digits.length, 5);
      digitRefs.current[focusIdx]?.focus();
      if (digits.length === 6) {
        setTimeout(() => verifyMutation.mutate(next.join('')), 50);
      }
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const next = [...verifyDigits];
    next[index] = value;
    setVerifyDigits(next);
    if (value && index < 5) digitRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '') && next.join('').length === 6) {
      setTimeout(() => verifyMutation.mutate(next.join('')), 50);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verifyDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const closeModal = () => {
    setShowCreate(false);
    setStep('form');
    setNewName(''); setNewEmail(''); setNewPassword('');
    setNewRoleId(''); setCreateError('');
    setVerifyDigits(['', '', '', '', '', '']);
    setVerifyError('');
  };

  const users = data?.data?.data?.items ?? [];

  const openCreate = () => {
    setNewRoleId(roles[0]?.id ?? '');
    setNewOrgId(orgOptions[0]?.id ?? '');
    setShowCreate(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestioná los usuarios y sus accesos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rol</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Último acceso</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl mb-3">
                      <Users className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{u.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-900 dark:text-white">{u.name}</p>
                            {u.isSuperAdmin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                          <p className="text-slate-400 text-xs flex items-center gap-1">
                            <Mail className="w-3 h-3" />{u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANT[u.status] ?? 'default'}>{u.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.slice(0, 2).map((r: any) => (
                          <span key={r.id} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                            {r.name}
                          </span>
                        ))}
                        {u.roles?.length > 2 && <span className="text-slate-400 text-xs">+{u.roles.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {u.lastLoginAt
                        ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true, locale: es })
                        : 'Nunca'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === 'active' ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'inactive' })}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition"
                            title="Desactivar"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'active' })}
                            className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                            title="Activar"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {!u.isSuperAdmin && (
                          <button
                            onClick={() => { if (confirm(`¿Eliminár a ${u.name}?`)) deleteMutation.mutate(u.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles — sección compacta */}
      {roles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Roles
          </h2>
          <div className="flex flex-wrap gap-2">
            {roles.map((role: any) => (
              <div
                key={role.id}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{role.name}</span>
                {role._count?.users != null && (
                  <span className="text-xs text-slate-400 ml-1">{role._count.users} usuarios</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear / verificar usuario */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {step === 'form' ? 'Nuevo usuario' : step === 'verify' ? 'Verificar cuenta' : 'Cuenta activada'}
              </h3>
              <button onClick={closeModal}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* ── Step 1: Formulario ── */}
            {step === 'form' && (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                    <input
                      type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                      type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña inicial</label>
                    <input
                      type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label>
                    <select
                      value={newRoleId} onChange={e => setNewRoleId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin rol</option>
                      {roles.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  {user?.isSuperAdmin && !isSuperAdminRole && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organización</label>
                      <select
                        value={newOrgId} onChange={e => setNewOrgId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {orgOptions.map((o: any) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isSuperAdminRole && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                      Super Admin tiene acceso a todas las organizaciones — no requiere asignación.
                    </p>
                  )}
                  {createError && <p className="text-red-500 text-sm">{createError}</p>}
                </div>
                <div className="flex justify-end gap-3 px-6 pb-5">
                  <button onClick={closeModal} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">
                    Cancelar
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !newName.trim() || !newEmail.trim() || !newPassword.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Verificación ── */}
            {step === 'verify' && (
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Enviamos un código de 6 dígitos a
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{verifyEmail}</p>
                </div>

                {/* 6-digit input */}
                <div className="flex justify-center gap-2">
                  {verifyDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { digitRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none transition ${
                        verifyError
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 dark:border-slate-600 focus:border-blue-500'
                      }`}
                      style={{ height: '3.25rem' }}
                    />
                  ))}
                </div>

                {verifyError && (
                  <p className="text-red-500 text-sm text-center">{verifyError}</p>
                )}

                {verifyMutation.isPending && (
                  <p className="text-blue-500 text-sm text-center animate-pulse">Verificando...</p>
                )}

                <div className="flex items-center justify-center gap-1 text-sm">
                  <span className="text-slate-400">¿No llegó?</span>
                  <button
                    onClick={() => resendMutation.mutate()}
                    disabled={resendMutation.isPending}
                    className="flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {resendMutation.isPending ? 'Enviando...' : 'Reenviar código'}
                  </button>
                </div>
                {resendOk && <p className="text-green-600 text-sm text-center">✓ Código reenviado</p>}
              </div>
            )}

            {/* ── Step 3: Éxito ── */}
            {step === 'done' && (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">¡Cuenta activada!</p>
                  <p className="text-sm text-slate-400 mt-1">{verifyEmail} ya puede iniciar sesión.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition text-sm"
                >
                  Listo
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

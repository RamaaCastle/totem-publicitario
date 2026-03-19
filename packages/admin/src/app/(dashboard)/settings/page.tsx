'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useOrgStore } from '@/stores/org.store';
import { apiClient } from '@/lib/api/client';
import { Settings, User, Shield, Building2, Key, Upload, Check, X, Eye, EyeOff } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'organization', label: 'Organización', icon: Building2 },
  { id: 'security', label: 'Seguridad', icon: Shield },
];

// ── Organization tab ──────────────────────────────────────────────────────────
function OrganizationTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedOrg, updateSelectedOrg } = useOrgStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-me'],
    queryFn: () => apiClient.get('/api/v1/organizations/me').then((r) => r.data?.data ?? r.data),
    enabled: !!user?.organizationId,
  });

  const [name, setName] = useState('');
  const [nameReady, setNameReady] = useState(false);

  // Initialize name from API response
  if (org && !nameReady) {
    setName(org.name ?? '');
    setNameReady(true);
  }

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // 1. Upload logo first if changed
      if (logoFile) {
        const form = new FormData();
        form.append('logo', logoFile);
        const uploaded = await apiClient.post('/api/v1/organizations/me/logo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const updatedOrg = uploaded.data?.data ?? uploaded.data;
        if (updatedOrg?.logoUrl) {
          updateSelectedOrg({ logoUrl: updatedOrg.logoUrl });
        }
      }
      // 2. Update name
      if (name.trim() && name.trim() !== org?.name) {
        const updated = await apiClient.put('/api/v1/organizations/me', { name: name.trim() }).then((r) => r.data?.data ?? r.data);
        if (updated?.name) updateSelectedOrg({ name: updated.name });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-me'] });
      setLogoFile(null);
      setLogoPreview(null);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const currentLogo = logoPreview ?? org?.logoUrl ?? null;
  const orgInitials = (org?.name ?? '').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const accentColor = selectedOrg?.primary ?? '#3b82f6';

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
      <h2 className="font-semibold text-slate-900 dark:text-white">Información de la organización</h2>

      {/* Logo section */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          {currentLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogo}
              alt="Logo"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-600"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: accentColor }}
            >
              {orgInitials}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Foto de la organización</p>
          <p className="text-xs text-slate-400 mb-3">PNG, JPG o WebP · máx. 5 MB · se mostrará en el selector de empresa y en el menú lateral</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Upload className="w-4 h-4" />
              {currentLogo ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            {logoPreview && (
              <button
                onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>

          {logoPreview && (
            <p className="text-xs text-blue-500 mt-2">Vista previa — guardá para aplicar</p>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Nombre de la organización
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Plan info (read-only) */}
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan actual</p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{org?.plan ?? 'free'}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>Pantallas: {org?.maxScreens ?? 5}</p>
          <p>Almacenamiento: {Math.round((org?.maxStorageBytes ?? 0) / 1024 / 1024 / 1024)} GB</p>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || (!logoFile && name.trim() === (org?.name ?? ''))}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saveOk && (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <Check className="w-4 h-4" /> Cambios guardados
          </span>
        )}
        {updateMutation.isError && (
          <span className="text-red-500 text-sm">
            Error al guardar — intentá de nuevo
          </span>
        )}
      </div>
    </div>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [error, setError]       = useState('');
  const [ok, setOk]             = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/v1/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      }),
    onSuccess: () => {
      setOk(true);
      setCurrent(''); setNext(''); setConfirm(''); setError('');
      setTimeout(() => setOk(false), 4000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'Error al actualizar la contraseña');
    },
  });

  const handleSubmit = () => {
    setError('');
    if (next.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (next !== confirm) { setError('Las contraseñas no coinciden'); return; }
    mutation.mutate();
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
      <h2 className="font-semibold text-slate-900 dark:text-white">Seguridad</h2>

      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" />
          Cambiar contraseña
        </h3>
        <div className="space-y-3 max-w-sm">
          {/* Current password */}
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Contraseña actual"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* New password */}
          <div className="relative">
            <input
              type={showNext ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={next}
              onChange={e => setNext(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowNext(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm */}
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className={`${inputClass} ${confirm && confirm !== next ? 'border-red-400 focus:ring-red-400' : ''}`}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {ok && (
            <p className="flex items-center gap-1.5 text-green-600 text-sm">
              <Check className="w-4 h-4" /> Contraseña actualizada — te enviamos un email de confirmación
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || !current || !next || !confirm}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {mutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('organization');
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Administrá tu cuenta y preferencias</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              <h2 className="font-semibold text-slate-900 dark:text-white">Información personal</h2>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {user?.name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                  <p className="text-slate-500 text-sm">{user?.email}</p>
                  {user?.isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      <Shield className="w-3 h-3" />
                      Super Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    defaultValue={user?.name}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    defaultValue={user?.email}
                    type="email"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  Guardar cambios
                </button>
              </div>
            </div>
          )}

          {activeTab === 'organization' && <OrganizationTab />}

          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

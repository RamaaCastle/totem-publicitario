'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor } from 'lucide-react';
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

// Build OrgConfig from API data, falling back to static ORGS for colors
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

export default function OrgSelectPage() {
  const router = useRouter();
  const { setSelectedOrg } = useOrgStore();
  const { isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);

  // Only auto-redirect if arriving at '/' with an active session AND an org already selected
  // (e.g. page refresh). If clearOrg() was called (org switch), let the user re-select.
  const { selectedOrg } = useOrgStore();
  useEffect(() => {
    if (_hasHydrated && isAuthenticated && selectedOrg) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, selectedOrg, router]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/api/v1/organizations/public`)
      .then((r) => r.json())
      .then((data) => {
        // API returns array directly (not wrapped in data.data)
        const list: PublicOrg[] = Array.isArray(data) ? data : (data?.data ?? []);
        setOrgs(list);
      })
      .catch(() => {
        // Fallback to static orgs if API unavailable
        setOrgs(Object.values(ORGS).map((o) => ({
          id: '',
          slug: o.slug,
          name: o.name,
          logoUrl: null,
          primaryColor: o.primary,
        })));
      });
  }, []);

  const handleSelect = async (apiOrg: PublicOrg) => {
    // If already authenticated, log out first so the new login gets a fresh JWT
    if (isAuthenticated) {
      try { await authApi.logout(); } catch {}
      logout();
    }
    setSelectedOrg(buildOrgConfig(apiOrg));
    router.push('/login');
  };

  // Use static orgs as placeholders while loading
  const displayOrgs: PublicOrg[] = orgs.length > 0
    ? orgs
    : Object.values(ORGS).map((o) => ({ id: '', slug: o.slug, name: o.name, logoUrl: null, primaryColor: o.primary }));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-12">
        <div className="bg-slate-800 p-2.5 rounded-xl">
          <Monitor className="w-6 h-6 text-slate-300" />
        </div>
        <div>
          <p className="font-bold text-white text-lg leading-tight">Signage Platform</p>
          <p className="text-slate-500 text-xs">Panel Administrativo</p>
        </div>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Seleccioná tu empresa</h1>
        <p className="text-slate-400">Elegí la organización a la que querés ingresar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl">
        {displayOrgs.map((org) => {
          const color = org.primaryColor ?? ORGS[org.slug]?.primary ?? '#3b82f6';
          const bg = ORGS[org.slug]?.bg ?? color;
          const isLight = org.slug === 'pedraza';
          const initials = org.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

          return (
            <button
              key={org.slug}
              onClick={() => handleSelect(org)}
              className="group relative overflow-hidden rounded-2xl border-2 border-transparent transition-all duration-300 text-left focus:outline-none"
              style={{ '--hover-color': color } as any}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
            >
              <div className="h-full p-8 flex flex-col gap-4" style={{ background: bg }}>
                {/* Logo or initials */}
                {org.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.logoUrl}
                    alt={org.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white text-xl"
                    style={{ background: color }}
                  >
                    {initials}
                  </div>
                )}

                <div>
                  <h2 className="text-white font-bold text-xl leading-tight">{org.name.split(' ')[0]}</h2>
                  <p className="text-sm mt-0.5" style={{ color: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.5)' }}>
                    {org.name.split(' ').slice(1).join(' ')}
                  </p>
                </div>

                <div className="mt-auto">
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${color}25`, color }}
                  >
                    Ingresar →
                  </span>
                </div>
              </div>
              {/* Bottom accent bar */}
              <div
                className="h-1 w-0 group-hover:w-full transition-all duration-300"
                style={{ background: color }}
              />
            </button>
          );
        })}
      </div>

      <p className="text-slate-700 text-xs mt-12">
        Acceso restringido · Solo personal autorizado
      </p>
    </div>
  );
}

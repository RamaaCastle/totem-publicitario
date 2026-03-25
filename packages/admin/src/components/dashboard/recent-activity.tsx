'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'auth.login':          { label: 'Inicio de sesión',         color: '#22c55e' },
  'auth.logout':         { label: 'Cierre de sesión',         color: '#94a3b8' },
  'auth.login_failed':   { label: 'Acceso fallido',           color: '#ef4444' },
  'playlists.updated':   { label: 'Contenido actualizado',    color: '#3b82f6' },
  'campaigns.assigned':  { label: 'Campaña asignada',         color: '#8b5cf6' },
  'media.uploaded':      { label: 'Archivo subido',           color: '#a855f7' },
  'media.deleted':       { label: 'Archivo eliminado',        color: '#ef4444' },
  'screens.registered':  { label: 'Pantalla registrada',      color: '#22c55e' },
  'screens.updated':     { label: 'Pantalla editada',         color: '#f59e0b' },
  'users.created':       { label: 'Usuario creado',           color: '#22c55e' },
};

function getActionLabel(action: string, meta: any): { label: string; sublabel?: string; color: string } {
  if (action === 'playlists.updated') {
    const ctx = meta?.context;
    if (ctx === 'global') return { label: 'Contenido global actualizado', sublabel: `${meta?.itemCount ?? 0} archivos`, color: '#3b82f6' };
    if (ctx === 'screen') return { label: 'Pantalla actualizada', sublabel: meta?.screenName, color: '#3b82f6' };
  }
  if (action === 'campaigns.assigned') {
    const names: string[] = meta?.screenNames ?? [];
    return { label: 'Campaña asignada', sublabel: names.join(', ') || undefined, color: '#8b5cf6' };
  }
  if (action === 'media.uploaded') return { label: 'Archivo subido', sublabel: meta?.fileName, color: '#a855f7' };
  if (action === 'media.deleted')  return { label: 'Archivo eliminado', sublabel: meta?.fileName, color: '#ef4444' };
  if (action === 'screens.registered') return { label: 'Pantalla registrada', sublabel: meta?.name, color: '#22c55e' };

  const known = ACTION_LABELS[action];
  return known ?? { label: action, color: '#94a3b8' };
}

export function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => apiClient.get('/api/v1/audit?limit=10'),
    refetchInterval: 60000,
  });

  const logs = data?.data?.data?.items ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-white">Actividad reciente</h2>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-3/4 mb-1" />
              <div className="h-2 bg-slate-100 rounded w-1/2" />
            </div>
          ))
        ) : logs.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">Sin actividad</p>
        ) : (
          logs.map((log: any) => {
            const { label, sublabel, color } = getActionLabel(log.action, log.meta);
            return (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <span
                  className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">
                    {label}
                  </p>
                  {sublabel && (
                    <p className="text-xs text-slate-400 truncate">{sublabel}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {log.user?.name ?? 'Sistema'} ·{' '}
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Clock, Monitor, Globe, Film, Image as ImageIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const TZ = 'America/Argentina/Buenos_Aires';
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// ── Human-readable action info ────────────────────────────────────────────────
function getActionInfo(log: any): {
  label: string;
  sublabel: string;
  color: string;
  icon: React.ReactNode;
} {
  const { action, meta } = log;

  if (action === 'playlists.updated') {
    if (meta?.context === 'global') {
      return {
        label: 'Contenido global actualizado',
        sublabel: `Todas las pantallas · ${meta?.itemCount ?? 0} archivo${meta?.itemCount !== 1 ? 's' : ''}`,
        color: 'blue',
        icon: <Globe className="w-4 h-4" />,
      };
    }
    if (meta?.context === 'screen') {
      return {
        label: `Pantalla actualizada`,
        sublabel: `${meta?.screenName ?? 'Pantalla'} · ${meta?.itemCount ?? 0} archivo${meta?.itemCount !== 1 ? 's' : ''}`,
        color: 'blue',
        icon: <Monitor className="w-4 h-4" />,
      };
    }
    return {
      label: 'Playlist actualizada',
      sublabel: `${meta?.itemCount ?? 0} archivos`,
      color: 'blue',
      icon: <ClipboardList className="w-4 h-4" />,
    };
  }

  if (action === 'campaigns.assigned') {
    const screens: string[] = meta?.screenNames ?? [];
    return {
      label: 'Campaña asignada a pantallas',
      sublabel: screens.length > 0 ? screens.join(', ') : `${meta?.screenCount ?? 0} pantalla(s)`,
      color: 'purple',
      icon: <Monitor className="w-4 h-4" />,
    };
  }

  if (action === 'auth.login') return { label: 'Inicio de sesión', sublabel: '', color: 'green', icon: null };
  if (action === 'auth.logout') return { label: 'Cierre de sesión', sublabel: '', color: 'slate', icon: null };
  if (action === 'auth.login_failed') return { label: 'Intento de acceso fallido', sublabel: '', color: 'red', icon: null };
  if (action === 'media.uploaded') return { label: 'Archivo subido', sublabel: meta?.fileName ?? '', color: 'purple', icon: null };
  if (action === 'media.deleted') return { label: 'Archivo eliminado', sublabel: meta?.fileName ?? '', color: 'red', icon: null };
  if (action === 'screens.registered') return { label: 'Pantalla registrada', sublabel: meta?.name ?? '', color: 'green', icon: <Monitor className="w-4 h-4" /> };
  if (action === 'screens.updated') return { label: 'Pantalla editada', sublabel: '', color: 'amber', icon: <Monitor className="w-4 h-4" /> };
  if (action === 'users.created') return { label: 'Usuario creado', sublabel: '', color: 'green', icon: null };

  return { label: action, sublabel: '', color: 'slate', icon: null };
}

const COLOR_CLASSES: Record<string, { badge: string; dot: string }> = {
  blue:   { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   dot: 'bg-blue-500' },
  green:  { badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' },
  red:    { badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',         dot: 'bg-red-500' },
  amber:  { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  purple: { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', dot: 'bg-purple-500' },
  slate:  { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',   dot: 'bg-slate-400' },
};

function FileList({ items }: { items: { name: string; type: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  const preview = items.slice(0, 3);
  const rest = items.length - 3;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? 'Ocultar archivos' : `Ver ${items.length} archivo${items.length !== 1 ? 's' : ''}`}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 pl-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              {item.type === 'video'
                ? <Film className="w-3 h-3 text-slate-400 flex-shrink-0" />
                : <ImageIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />}
              <span className="truncate max-w-xs">{item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => apiClient.get(`/api/v1/audit?page=${page}&limit=30`),
  });

  const logs = data?.data?.data?.items ?? [];
  const total = data?.data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoría</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Historial de cambios de contenido y accesos al sistema
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {total.toLocaleString()} evento{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex gap-4 items-start">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-48 animate-pulse" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-32 animate-pulse" />
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-24 animate-pulse" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <ClipboardList className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No hay registros de auditoría todavía</p>
            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">
              Los cambios de contenido aparecerán aquí
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {logs.map((log: any) => {
              const info = getActionInfo(log);
              const colors = COLOR_CLASSES[info.color] ?? COLOR_CLASSES.slate;
              const userName = log.user?.name ?? 'Sistema';
              const userInitial = userName[0]?.toUpperCase() ?? 'S';

              return (
                <li key={log.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition flex gap-4 items-start">
                  {/* User avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{userInitial}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Color dot */}
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                      {/* Action label */}
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {info.label}
                      </span>
                      {/* Icon badge */}
                      {info.icon && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                          {info.icon}
                        </span>
                      )}
                    </div>

                    {/* Sub-label */}
                    {info.sublabel && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {info.sublabel}
                      </p>
                    )}

                    {/* File list (collapsible) */}
                    {log.meta?.items?.length > 0 && (
                      <FileList items={log.meta.items} />
                    )}

                    {/* User info */}
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="font-medium text-slate-500 dark:text-slate-400">{userName}</span>
                      {log.user?.email && (
                        <span className="ml-1">· {log.user.email}</span>
                      )}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <div className="text-right">
                      <p>{fmtDate(log.createdAt)}</p>
                      <p className="font-mono">{fmtTime(log.createdAt)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Página {page} de {totalPages} · {total} eventos
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

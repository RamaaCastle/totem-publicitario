'use client';

import { useQuery } from '@tanstack/react-query';
import { Wifi, WifiOff, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiClient } from '@/lib/api/client';

export function ScreensStatusList() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-screens'],
    queryFn: () => apiClient.get('/api/v1/screens?limit=50'),
    refetchInterval: 15000,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const screens: any[] = data?.data?.data?.items ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-white">Estado de pantallas</h2>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3 animate-pulse flex gap-4 items-center">
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/2" />
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : screens.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">
            No hay pantallas registradas
          </p>
        ) : (
          screens.map((screen) => (
            <div key={screen.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
              <div className={`p-1.5 rounded-full ${screen.status === 'online' ? 'bg-green-100' : 'bg-slate-100'}`}>
                {screen.status === 'online'
                  ? <Wifi className="w-4 h-4 text-green-600" />
                  : <WifiOff className="w-4 h-4 text-slate-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{screen.name}</p>
                {screen.location && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{screen.location}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  screen.status === 'online'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {screen.status === 'online' ? 'Online' : 'Offline'}
                </span>
                {screen.lastSeenAt && (
                  <p className="text-slate-400 text-xs mt-0.5">
                    {formatDistanceToNow(new Date(screen.lastSeenAt), { addSuffix: true, locale: es })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

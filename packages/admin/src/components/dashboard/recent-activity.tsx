'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity } from 'lucide-react';

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
          logs.map((log: any) => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex items-start gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">{log.action}</p>
                  <p className="text-xs text-slate-400">
                    {log.user?.name ?? 'Sistema'} ·{' '}
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

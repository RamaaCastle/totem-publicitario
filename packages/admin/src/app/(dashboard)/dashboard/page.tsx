'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Monitor, MonitorOff, Image, Video, Play, TrendingUp, Wifi, WifiOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { StatCard } from '@/components/dashboard/stat-card';
import { ScreensStatusList } from '@/components/dashboard/screens-status-list';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { formatBytes } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get('/api/v1/organizations/dashboard'),
    refetchInterval: 30000, // refresh every 30s
  });

  const { data: screensData } = useQuery({
    queryKey: ['screens', { page: 1, limit: 10 }],
    queryFn: () => apiClient.get('/api/v1/screens?page=1&limit=10'),
    refetchInterval: 15000,
  });

  const s = stats?.data?.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Bienvenido, {user?.name}. Aquí está el resumen de tu plataforma.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pantallas totales"
          value={s?.screens?.total ?? '—'}
          icon={Monitor}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Pantallas online"
          value={s?.screens?.online ?? '—'}
          icon={Wifi}
          color="green"
          loading={isLoading}
          trend={s?.screens?.total
            ? `${Math.round((s.screens.online / s.screens.total) * 100)}% activas`
            : undefined
          }
        />
        <StatCard
          title="Pantallas offline"
          value={s?.screens?.offline ?? '—'}
          icon={WifiOff}
          color="red"
          loading={isLoading}
        />
        <StatCard
          title="Almacenamiento usado"
          value={s?.media?.storageBytes ? formatBytes(s.media.storageBytes) : '0 B'}
          icon={Image}
          color="purple"
          loading={isLoading}
          trend={`${s?.media?.total ?? 0} archivos`}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ScreensStatusList screens={screensData?.data?.data?.items ?? []} />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}

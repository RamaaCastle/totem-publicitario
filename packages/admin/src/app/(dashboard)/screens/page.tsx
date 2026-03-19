'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Monitor, Wifi, WifiOff, MapPin, Tv, RectangleVertical, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { CreateScreenModal } from '@/components/screens/create-screen-modal';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ScreensPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['screens', { search }],
    queryFn: () => apiClient.get(`/api/v1/screens?search=${search}&limit=200`),
    refetchInterval: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/screens/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['screens'] }),
  });

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    if (confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(id);
    }
  };

  const screens: any[] = data?.data?.data?.items ?? [];
  const tvScreens = screens.filter((s) => !s.screenType || s.screenType === 'tv');
  const totemScreens = screens.filter((s) => s.screenType === 'totem');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pantallas</h1>
          <p className="text-slate-500 mt-1">Gestiona tus dispositivos de señalización</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nueva pantalla
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pantallas..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : screens.length === 0 ? (
        <div className="text-center py-16">
          <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay pantallas registradas aún</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            Registrar primera pantalla
          </button>
        </div>
      ) : (
        <>
          {/* TVs section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Tv className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">TVs</h2>
              <span className="text-sm text-slate-400">({tvScreens.length})</span>
            </div>
            {tvScreens.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No hay TVs registradas</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tvScreens.map((screen) => (
                  <ScreenCard key={screen.id} screen={screen} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>

          {/* Totems section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <RectangleVertical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Totems</h2>
              <span className="text-sm text-slate-400">({totemScreens.length})</span>
            </div>
            {totemScreens.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No hay totems registrados</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {totemScreens.map((screen) => (
                  <ScreenCard key={screen.id} screen={screen} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showCreate && (
        <CreateScreenModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['screens'] });
          }}
        />
      )}
    </div>
  );
}

function ScreenCard({ screen, onDelete }: { screen: any; onDelete: (e: React.MouseEvent, id: string, name: string) => void }) {
  const isOnline = screen.status === 'online';
  const isTotem = screen.screenType === 'totem';

  return (
    <div className="relative group">
      <Link href={`/screens/${screen.id}`} className="block bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-50' : 'bg-slate-100'}`}>
            {isOnline
              ? <Wifi className="w-5 h-5 text-green-600" />
              : <WifiOff className="w-5 h-5 text-slate-400" />
            }
          </div>
          <div className="flex items-center gap-1.5">
            {isTotem && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                {screen.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
              </span>
            )}
            <Badge variant={isOnline ? 'success' : 'secondary'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{screen.name}</h3>

        {screen.location && (
          <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{screen.location}</span>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
              {screen.deviceCode}
            </span>
            <span>
              {screen.lastSeenAt
                ? formatDistanceToNow(new Date(screen.lastSeenAt), { addSuffix: true, locale: es })
                : 'Nunca'}
            </span>
          </div>
        </div>
      </Link>

      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => onDelete(e, screen.id, screen.name)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition z-10"
        title="Eliminar pantalla"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

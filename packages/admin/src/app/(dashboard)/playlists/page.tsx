'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, List, Film, Image, GripVertical, Trash2, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatBytes } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function PlaylistsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => apiClient.get('/api/v1/playlists?limit=50'),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.post('/api/v1/playlists', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShowCreate(false);
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/playlists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playlists'] }),
  });

  const playlists = data?.data?.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Playlists</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Organizá el contenido en listas de reproducción</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva playlist
        </button>
      </div>

      {/* Quick create form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Crear playlist</h3>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la playlist..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && newName && createMutation.mutate(newName)}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => newName && createMutation.mutate(newName)}
              disabled={!newName || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/5" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl mb-4">
            <List className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">No hay playlists aún</p>
          <p className="text-slate-400 text-sm mt-1">Creá una playlist para empezar a agregar contenido</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            Crear primera playlist
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((pl: any) => (
            <PlaylistRow key={pl.id} playlist={pl} onDelete={() => deleteMutation.mutate(pl.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaylistRow({ playlist, onDelete }: { playlist: any; onDelete: () => void }) {
  const itemCount = playlist.items?.length ?? 0;
  const totalDuration = playlist.items?.reduce((acc: number, item: any) => acc + (item.duration || 0), 0) ?? 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-200 dark:hover:border-blue-900 transition group">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
          <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{playlist.name}</h3>
            {playlist.isActive === false && (
              <Badge variant="secondary">Inactiva</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3" />
              {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(totalDuration / 60)}m {totalDuration % 60}s
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
          <a
            href={`/playlists/${playlist.id}`}
            className="text-blue-600 hover:text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
          >
            Editar
          </a>
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save, Film, Image as ImageIcon, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

function getPlaylistId(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('playlists');
  const urlId = idx !== -1 ? segments[idx + 1] : null;
  return urlId && urlId !== '_' ? urlId : fallback;
}

export default function PlaylistEditClient({ params }: { params: { id: string } }) {
  const urlParams = useParams();
  const id = getPlaylistId((urlParams?.id as string) || params.id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Load playlist
  const { isLoading, data: playlist } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => apiClient.get(`/api/v1/playlists/${id}`).then((r) => r.data?.data),
  });

  useEffect(() => {
    if (playlist && !nameLoaded) {
      setName(playlist.name ?? '');
      setNameLoaded(true);
      const sorted = [...(playlist.items ?? [])].sort((a: any, b: any) => a.order - b.order);
      setItems(sorted.map((i: any) => ({
        mediaFileId: i.mediaFile?.id ?? i.mediaFileId,
        name: i.mediaFile?.name ?? '',
        type: i.mediaFile?.type ?? 'image',
        thumbnailUrl: i.mediaFile?.thumbnailUrl ?? null,
        durationSeconds: i.durationSeconds ?? 10,
        order: i.order,
      })));
    }
  }, [playlist, nameLoaded]);

  // Load available media
  const { data: mediaData } = useQuery({
    queryKey: ['media-all'],
    queryFn: () => apiClient.get('/api/v1/media?limit=200'),
    select: (res) => res.data?.data?.items ?? [],
    enabled: showMediaPicker,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/api/v1/playlists/${id}`, { name });
      await apiClient.put(`/api/v1/playlists/${id}/items`, {
        items: items.map((item, index) => ({
          mediaFileId: item.mediaFileId,
          order: index,
          durationSeconds: item.durationSeconds,
          isActive: true,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      router.push('/playlists');
    },
  });

  const addMedia = (media: any) => {
    if (items.find((i) => i.mediaFileId === media.id)) return;
    setItems((prev) => [
      ...prev,
      {
        mediaFileId: media.id,
        name: media.name,
        type: media.type,
        thumbnailUrl: media.thumbnailUrl ?? null,
        durationSeconds: media.type === 'video' ? 0 : 10,
        order: prev.length,
      },
    ]);
    setShowMediaPicker(false);
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateDuration = (index: number, value: number) =>
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, durationSeconds: value } : item));

  const moveItem = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const target = index + direction;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    setItems(newItems);
  };

  if (isLoading && !nameLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mediaList: any[] = mediaData ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/playlists')}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Editar playlist</h1>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Name */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Nombre de la playlist
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Contenido ({items.length} {items.length === 1 ? 'elemento' : 'elementos'})
          </h2>
          <button
            onClick={() => setShowMediaPicker(true)}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Agregar media
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Film className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay elementos. Agregá archivos de multimedia.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((item, index) => (
              <li key={item.mediaFileId + index} className="flex items-center gap-3 px-5 py-3 group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 text-xs leading-none">▲</button>
                  <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 text-xs leading-none">▼</button>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : item.type === 'video' ? (
                    <Film className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.type === 'video' ? 'Video' : 'Imagen'}</p>
                </div>
                {item.type === 'image' && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <input
                      type="number" min={1} max={3600}
                      value={item.durationSeconds}
                      onChange={(e) => updateDuration(index, Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-center text-xs"
                    />
                    <span>seg</span>
                  </div>
                )}
                <button onClick={() => removeItem(index)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-1 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Media picker modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Seleccionar archivo</h3>
              <button onClick={() => setShowMediaPicker(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {mediaList.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No hay archivos disponibles</p>
              ) : (
                mediaList.map((media: any) => {
                  const alreadyAdded = items.some((i) => i.mediaFileId === media.id);
                  return (
                    <button
                      key={media.id}
                      onClick={() => !alreadyAdded && addMedia(media)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                        alreadyAdded
                          ? 'border-slate-100 dark:border-slate-700 opacity-40 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {media.thumbnailUrl ? (
                          <img src={media.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : media.type === 'video' ? (
                          <Film className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{media.name}</p>
                        <p className="text-xs text-slate-400">{media.type === 'video' ? 'Video' : 'Imagen'}</p>
                      </div>
                      {alreadyAdded && <span className="text-xs text-slate-400">Ya agregado</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

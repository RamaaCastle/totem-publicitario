'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, Image as ImageIcon, Trash2, Search, Clock, Save, Tv, RectangleVertical } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatBytes } from '@/lib/utils';

const GLOBAL_TV_NAME = '__global_tv__';
const GLOBAL_TOTEM_NAME = '__global_totem__';

type GlobalItem = {
  mediaFileId: string;
  name: string;
  type: string;
  publicUrl: string | null;
  durationSeconds: number;
};

function useGlobalSection(campaignName: string, campaigns: any[], screenType: 'tv' | 'totem') {
  const [items, setItems] = useState<GlobalItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const queryClient = useQueryClient();

  const campaign = (campaigns as any[]).find((c: any) => c.name === campaignName);

  const { data: playlist } = useQuery({
    queryKey: ['playlist', campaign?.playlistId],
    queryFn: () =>
      apiClient.get(`/api/v1/playlists/${campaign.playlistId}`).then((r) => r.data?.data),
    enabled: !!campaign?.playlistId,
  });

  useEffect(() => {
    if (playlist && !loaded) {
      const sorted = [...(playlist.items ?? [])].sort((a: any, b: any) => a.order - b.order);
      setItems(sorted.map((i: any) => ({
        mediaFileId: i.mediaFile?.id ?? i.mediaFileId,
        name: i.mediaFile?.name ?? i.mediaFile?.originalName ?? '',
        type: i.mediaFile?.type ?? 'image',
        publicUrl: i.mediaFile?.publicUrl ?? null,
        durationSeconds: i.durationSeconds ?? 10,
      })));
      setLoaded(true);
    }
    if (!campaign && (campaigns as any[]).length > 0 && !loaded) {
      setLoaded(true);
    }
  }, [playlist, campaign, campaigns, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const allCampaigns: any[] = await apiClient
        .get('/api/v1/campaigns?limit=200')
        .then((r) => r.data?.data?.items ?? []);
      const existing = allCampaigns.filter((c: any) => c.name === campaignName);
      const currentCampaign = existing[existing.length - 1] ?? null;

      let playlistId: string = currentCampaign?.playlistId;
      let campaignId: string = currentCampaign?.id;

      if (!playlistId) {
        const pl = await apiClient
          .post('/api/v1/playlists', { name: campaignName })
          .then((r) => r.data?.data);
        playlistId = pl.id;
      }

      if (!campaignId) {
        const camp = await apiClient
          .post('/api/v1/campaigns', {
            name: campaignName,
            playlistId,
            status: 'active',
            priority: 1,
          })
          .then((r) => r.data?.data);
        campaignId = camp.id;
      }

      // Assign only to screens of matching type
      const freshScreens: any[] = await apiClient
        .get('/api/v1/screens?limit=200')
        .then((r) => r.data?.data?.items ?? []);
      const matchingIds = freshScreens
        .filter((s: any) =>
          screenType === 'tv'
            ? !s.screenType || s.screenType === 'tv'
            : s.screenType === 'totem',
        )
        .map((s: any) => s.id);

      if (matchingIds.length > 0) {
        await apiClient.post(`/api/v1/campaigns/${campaignId}/assign`, {
          screenIds: matchingIds,
        });
      }

      await apiClient.put(`/api/v1/playlists/${playlistId}/items`, {
        items: items.map((item, index) => ({
          mediaFileId: item.mediaFileId,
          order: index,
          ...(item.type !== 'video' && { durationSeconds: item.durationSeconds }),
          isActive: true,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-all'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', campaign?.playlistId] });
    },
  });

  const addItem = (file: any) => {
    if (items.find((i) => i.mediaFileId === file.id)) return;
    setItems((prev) => [...prev, {
      mediaFileId: file.id,
      name: file.name ?? file.originalName ?? '',
      type: file.type,
      publicUrl: file.publicUrl ?? null,
      durationSeconds: file.type === 'video' ? 0 : 10,
    }]);
  };

  const removeItem = (mediaFileId: string) =>
    setItems((prev) => prev.filter((i) => i.mediaFileId !== mediaFileId));

  const updateDuration = (index: number, val: number) =>
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, durationSeconds: val } : item));

  const moveItem = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  return { items, addItem, removeItem, updateDuration, moveItem, saveMutation };
}

export default function MediaPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [isDragOverTv, setIsDragOverTv] = useState(false);
  const [isDragOverTotem, setIsDragOverTotem] = useState(false);
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['media', { search, filter }],
    queryFn: () =>
      apiClient
        .get(`/api/v1/media?search=${search}${filter !== 'all' ? `&type=${filter}` : ''}&limit=50`)
        .then((r) => r.data?.data?.items ?? []),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiClient.post('/api/v1/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/media/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const onDrop = useCallback(
    (accepted: File[]) => accepted.forEach((f) => uploadMutation.mutate(f)),
    [uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxSize: 524288000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => apiClient.get('/api/v1/campaigns?limit=200').then((r) => r.data?.data?.items ?? []),
  });

  const tv = useGlobalSection(GLOBAL_TV_NAME, campaigns as any[], 'tv');
  const totem = useGlobalSection(GLOBAL_TOTEM_NAME, campaigns as any[], 'totem');

  const handleDragStart = (e: React.DragEvent, file: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const makeDropHandlers = (
    setter: (v: boolean) => void,
    addFn: (file: any) => void,
  ) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setter(true); },
    onDragLeave: () => setter(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setter(false);
      try {
        const file = JSON.parse(e.dataTransfer.getData('application/json'));
        if (file?.id) addFn(file);
      } catch {}
    },
  });

  return (
    <div className="space-y-8">
      {/* ── Upload ── */}
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Multimedia</h1>
          <p className="text-slate-500 mt-1">Biblioteca de archivos · arrastrá a "Todas las TVs" o "Todos los Totems"</p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-blue-500' : 'text-slate-300'}`} />
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Suelta para subir</p>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                Arrastrá archivos o hacé clic para subir
              </p>
              <p className="text-slate-400 text-sm mt-1">Imágenes y videos — máx. 500MB</p>
            </>
          )}
          {uploadMutation.isPending && (
            <p className="text-blue-600 text-sm mt-2 animate-pulse">Subiendo...</p>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap mt-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar archivos..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            {(['all', 'image', 'video'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'image' ? 'Imágenes' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {/* File grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (files as any[]).length === 0 ? (
          <div className="text-center py-10 text-slate-400 mt-4">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay archivos cargados todavía</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {(files as any[]).map((file: any) => {
              const inTv = tv.items.some((i) => i.mediaFileId === file.id);
              const inTotem = totem.items.some((i) => i.mediaFileId === file.id);
              return (
                <div
                  key={file.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file)}
                  className="group relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden aspect-video border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing"
                >
                  {file.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.publicUrl} alt={file.originalName} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Film className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="flex gap-1">
                        <button
                          onClick={() => tv.addItem(file)}
                          disabled={inTv}
                          title={inTv ? 'Ya en TVs' : 'Agregar a todas las TVs'}
                          className={`p-1 rounded text-white ${inTv ? 'bg-blue-700 cursor-default' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          <Tv className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => totem.addItem(file)}
                          disabled={inTotem}
                          title={inTotem ? 'Ya en Totems' : 'Agregar a todos los Totems'}
                          className={`p-1 rounded text-white ${inTotem ? 'bg-purple-700 cursor-default' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                          <RectangleVertical className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(file.id)}
                        className="bg-red-500 hover:bg-red-600 p-1 rounded text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium truncate">{file.originalName}</p>
                      <p className="text-slate-300 text-xs">{formatBytes(file.sizeBytes)}</p>
                    </div>
                  </div>

                  <div className="absolute top-1 left-1 flex gap-0.5 pointer-events-none">
                    {inTv && <div className="bg-blue-600 rounded p-0.5"><Tv className="w-2.5 h-2.5 text-white" /></div>}
                    {inTotem && <div className="bg-purple-600 rounded p-0.5"><RectangleVertical className="w-2.5 h-2.5 text-white" /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Global sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVs */}
        <GlobalSection
          title="Todas las TVs"
          icon={<Tv className="w-5 h-5 text-blue-500" />}
          accentColor="blue"
          items={tv.items}
          isDragOver={isDragOverTv}
          dropHandlers={makeDropHandlers(setIsDragOverTv, tv.addItem)}
          onRemove={tv.removeItem}
          onMove={tv.moveItem}
          onUpdateDuration={tv.updateDuration}
          saveMutation={tv.saveMutation}
        />

        {/* Totems */}
        <GlobalSection
          title="Todos los Totems"
          icon={<RectangleVertical className="w-5 h-5 text-purple-500" />}
          accentColor="purple"
          items={totem.items}
          isDragOver={isDragOverTotem}
          dropHandlers={makeDropHandlers(setIsDragOverTotem, totem.addItem)}
          onRemove={totem.removeItem}
          onMove={totem.moveItem}
          onUpdateDuration={totem.updateDuration}
          saveMutation={totem.saveMutation}
        />
      </div>
    </div>
  );
}

function GlobalSection({
  title, icon, accentColor, items, isDragOver, dropHandlers,
  onRemove, onMove, onUpdateDuration, saveMutation,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: 'blue' | 'purple';
  items: GlobalItem[];
  isDragOver: boolean;
  dropHandlers: any;
  onRemove: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onUpdateDuration: (index: number, val: number) => void;
  saveMutation: any;
}) {
  const borderClass = isDragOver
    ? accentColor === 'blue' ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

  const btnClass = accentColor === 'blue'
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-purple-600 hover:bg-purple-700';

  return (
    <div
      className={`rounded-xl border-2 transition ${borderClass}`}
      {...dropHandlers}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Arrastrá archivos aquí para asignar</p>
          </div>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={`flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition text-sm ${btnClass}`}
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={`py-10 text-center transition ${isDragOver ? 'opacity-60' : ''}`}>
          <div className="opacity-20 dark:opacity-10 mx-auto mb-2 flex justify-center">{icon}</div>
          <p className="text-slate-400 text-sm">
            {isDragOver ? '¡Soltá aquí!' : 'Arrastrá archivos para asignar a estas pantallas'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {items.map((item, index) => (
            <li key={item.mediaFileId + index} className="flex items-center gap-3 px-5 py-3 group">
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => onMove(index, -1)} disabled={index === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 text-xs leading-none">▲</button>
                <button onClick={() => onMove(index, 1)} disabled={index === items.length - 1} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 text-xs leading-none">▼</button>
              </div>
              <div className="w-12 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {item.publicUrl && item.type === 'image'
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.publicUrl} alt="" className="w-full h-full object-cover" />
                  : item.type === 'video' ? <Film className="w-4 h-4 text-slate-400" /> : <ImageIcon className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.name}</p>
                <p className="text-xs text-slate-400">{item.type === 'video' ? 'Video' : 'Imagen'}</p>
              </div>
              {item.type === 'image' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <input
                    type="number" min={1} max={3600} value={item.durationSeconds}
                    onChange={(e) => onUpdateDuration(index, Number(e.target.value))}
                    className="w-14 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-center text-xs"
                  />
                  <span>seg</span>
                </div>
              )}
              <button
                onClick={() => onRemove(item.mediaFileId)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-1 rounded flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {saveMutation.isSuccess && (
        <p className="text-green-600 text-sm text-center py-3 border-t border-slate-100 dark:border-slate-700">
          ✓ Guardado — las pantallas se actualizarán en hasta 60 segundos
        </p>
      )}
      {saveMutation.isError && (
        <p className="text-red-500 text-sm text-center py-3 border-t border-slate-100 dark:border-slate-700">
          ✗ Error al guardar: {(saveMutation.error as any)?.response?.data?.message ?? 'intentá de nuevo'}
        </p>
      )}
    </div>
  );
}

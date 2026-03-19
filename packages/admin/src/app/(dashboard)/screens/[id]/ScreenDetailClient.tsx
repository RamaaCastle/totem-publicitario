'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft, Plus, Trash2, Save, Film, Image as ImageIcon,
  Clock, Wifi, WifiOff, Copy, Check, Upload, Pencil, RotateCcw, Tv, RectangleVertical,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const AUTO_PREFIX = '__auto__';

// ── Activity catalog types ────────────────────────────────────────────────────
type ActivityTemplate = { id: string; name: string; imageUrl?: string; defaultLocation?: string };
type ScheduleRow = { time: string; activityId: string; activity: string; location: string; imageUrl?: string };

function getArgDateKey(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = p.find(x => x.type === 'year')?.value ?? '';
  const m = p.find(x => x.type === 'month')?.value ?? '';
  const day = p.find(x => x.type === 'day')?.value ?? '';
  return `${y}-${m}-${day}`;
}

function getArgDateLabel(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long', day: 'numeric', month: 'short',
  }).format(d);
}

export default function ScreenDetailClient({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Media/content state ───────────────────────────────────────────────────
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editScreenType, setEditScreenType] = useState<'tv' | 'totem'>('tv');
  const [editOrientation, setEditOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [pendingMedia, setPendingMedia] = useState<{ id: string; name: string; type: string; publicUrl: string | null } | null>(null);
  const [pendingDuration, setPendingDuration] = useState(10);

  // ── Activity catalog state ─────────────────────────────────────────────────
  const [activities, setActivities] = useState<ActivityTemplate[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityFormName, setActivityFormName] = useState('');
  const [activityFormLocation, setActivityFormLocation] = useState('');
  const [activityFormImageUrl, setActivityFormImageUrl] = useState('');
  const [uploadingActivityImg, setUploadingActivityImg] = useState(false);
  const [activitiesSaved, setActivitiesSaved] = useState(false);
  const activityImgRef = useRef<HTMLInputElement>(null);

  // ── Schedule state ─────────────────────────────────────────────────────────
  const [selectedDateOffset, setSelectedDateOffset] = useState(0); // 0=hoy, 1=mañana
  const [scheduleByDate, setScheduleByDate] = useState<Record<string, ScheduleRow[]>>({});
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // ── Screen ────────────────────────────────────────────────────────────────
  const { data: screen, isLoading: loadingScreen } = useQuery({
    queryKey: ['screen', id],
    queryFn: () => apiClient.get(`/api/v1/screens/${id}`).then((r) => r.data?.data),
    refetchInterval: 15000,
  });

  // ── Campaigns → find auto-campaign for this screen ────────────────────────
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => apiClient.get('/api/v1/campaigns?limit=200').then((r) => r.data?.data?.items ?? []),
  });

  const autoCampaignName = `${AUTO_PREFIX}${id}`;
  const autoCampaign = (campaigns as any[]).find((c: any) => c.name === autoCampaignName);

  // ── Playlist ──────────────────────────────────────────────────────────────
  const { data: playlist } = useQuery({
    queryKey: ['playlist', autoCampaign?.playlistId],
    queryFn: () =>
      apiClient.get(`/api/v1/playlists/${autoCampaign.playlistId}`).then((r) => r.data?.data),
    enabled: !!autoCampaign?.playlistId,
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
    if (!autoCampaign && (campaigns as any[]).length > 0 && !loaded) {
      setLoaded(true);
    }
  }, [playlist, autoCampaign, campaigns, loaded]);

  // Load activities + schedules from metadata
  useEffect(() => {
    if (screen && !activitiesLoaded) {
      setActivities(screen.metadata?.activities ?? []);
      setActivitiesLoaded(true);
    }
    if (screen && !schedulesLoaded) {
      const schedules: Record<string, ScheduleRow[]> = screen.metadata?.schedules ?? {};
      // Migrate legacy flat schedule to today's date key
      if (screen.metadata?.schedule?.length && Object.keys(schedules).length === 0) {
        const todayKey = getArgDateKey(0);
        schedules[todayKey] = screen.metadata.schedule;
      }
      setScheduleByDate(schedules);
      setSchedulesLoaded(true);
    }
  }, [screen, activitiesLoaded, schedulesLoaded]);

  // ── Media library ─────────────────────────────────────────────────────────
  const { data: mediaList = [], refetch: refetchMedia } = useQuery({
    queryKey: ['media-all'],
    queryFn: () => apiClient.get('/api/v1/media?limit=200').then((r) => r.data?.data?.items ?? []),
  });

  // ── Upload mutation ───────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiClient.post('/api/v1/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data?.data);
    },
    onSuccess: (uploaded: any) => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      refetchMedia();
      if (uploaded?.id) {
        if (uploaded.type === 'video') {
          setItems((prev) => [...prev, {
            mediaFileId: uploaded.id,
            name: uploaded.name ?? uploaded.originalName ?? '',
            type: uploaded.type,
            publicUrl: uploaded.publicUrl ?? null,
            durationSeconds: 0,
          }]);
        } else {
          setPendingDuration(10);
          setPendingMedia({
            id: uploaded.id,
            name: uploaded.name ?? uploaded.originalName ?? '',
            type: uploaded.type,
            publicUrl: uploaded.publicUrl ?? null,
          });
        }
      }
    },
  });

  const onDrop = useCallback(
    (accepted: File[]) => accepted.forEach((f) => uploadMutation.mutate(f)),
    [uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxSize: 524288000,
    noClick: false,
  });

  // ── Save media playlist ───────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const allCampaigns: any[] = await apiClient
        .get('/api/v1/campaigns?limit=200')
        .then((r) => r.data?.data?.items ?? []);
      const existing = allCampaigns.filter((c: any) => c.name === autoCampaignName);
      const currentCampaign = existing[existing.length - 1] ?? null;

      let playlistId: string = currentCampaign?.playlistId;
      let campaignId: string = currentCampaign?.id;

      if (!playlistId) {
        const pl = await apiClient
          .post('/api/v1/playlists', { name: autoCampaignName })
          .then((r) => r.data?.data);
        playlistId = pl.id;
      }

      await apiClient.put(`/api/v1/playlists/${playlistId}/items`, {
        items: items.map((item, index) => ({
          mediaFileId: item.mediaFileId,
          order: index,
          ...(item.type !== 'video' && { durationSeconds: item.durationSeconds }),
          isActive: true,
        })),
      });

      if (!campaignId) {
        const campaign = await apiClient
          .post('/api/v1/campaigns', {
            name: autoCampaignName,
            playlistId,
            status: 'active',
            priority: 5,
          })
          .then((r) => r.data?.data);
        campaignId = campaign.id;
        await apiClient.post(`/api/v1/campaigns/${campaignId}/assign`, { screenIds: [id] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-all'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', autoCampaign?.playlistId] });
    },
  });

  // ── Item helpers ──────────────────────────────────────────────────────────
  const addMedia = (media: any) => {
    if (items.find((i) => i.mediaFileId === media.id)) return;
    if (media.type === 'video') {
      setItems((prev) => [...prev, {
        mediaFileId: media.id,
        name: media.name ?? media.originalName ?? '',
        type: media.type,
        publicUrl: media.publicUrl ?? null,
        durationSeconds: 0,
      }]);
      setShowPicker(false);
    } else {
      setPendingDuration(10);
      setPendingMedia({
        id: media.id,
        name: media.name ?? media.originalName ?? '',
        type: media.type,
        publicUrl: media.publicUrl ?? null,
      });
    }
  };

  const confirmPendingMedia = () => {
    if (!pendingMedia) return;
    setItems((prev) => [...prev, {
      mediaFileId: pendingMedia.id,
      name: pendingMedia.name,
      type: pendingMedia.type,
      publicUrl: pendingMedia.publicUrl,
      durationSeconds: pendingDuration,
    }]);
    setPendingMedia(null);
    setShowPicker(false);
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateDuration = (index: number, val: number) =>
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, durationSeconds: val } : item));

  const moveItem = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  // ── Edit screen modal ─────────────────────────────────────────────────────
  const openEdit = () => {
    setEditName(screen?.name ?? '');
    setEditScreenType(screen?.screenType ?? 'tv');
    setEditOrientation(screen?.orientation ?? 'landscape');
    setShowEdit(true);
  };

  const editMutation = useMutation({
    mutationFn: () =>
      apiClient.put(`/api/v1/screens/${id}`, {
        name: editName,
        screenType: editScreenType,
        orientation: editScreenType === 'tv' ? 'landscape' : editOrientation,
      }).then((r) => r.data?.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screen', id] });
      setShowEdit(false);
    },
  });

  // ── Activity catalog mutations + helpers ──────────────────────────────────
  const saveActivitiesMutation = useMutation({
    mutationFn: () => apiClient.put(`/api/v1/screens/${id}/activities`, { activities }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screen', id] });
      setActivitiesSaved(true);
      setTimeout(() => setActivitiesSaved(false), 3000);
    },
  });

  const openAddActivity = () => {
    setEditingActivityId(null);
    setActivityFormName('');
    setActivityFormLocation('');
    setActivityFormImageUrl('');
    setShowActivityForm(true);
  };

  const openEditActivity = (act: ActivityTemplate) => {
    setEditingActivityId(act.id);
    setActivityFormName(act.name);
    setActivityFormLocation(act.defaultLocation ?? '');
    setActivityFormImageUrl(act.imageUrl ?? '');
    setShowActivityForm(true);
  };

  const submitActivityForm = () => {
    if (!activityFormName.trim()) return;
    if (editingActivityId) {
      setActivities((prev) => prev.map((a) =>
        a.id === editingActivityId
          ? { ...a, name: activityFormName, defaultLocation: activityFormLocation, imageUrl: activityFormImageUrl }
          : a,
      ));
    } else {
      setActivities((prev) => [...prev, {
        id: crypto.randomUUID(),
        name: activityFormName,
        defaultLocation: activityFormLocation,
        imageUrl: activityFormImageUrl,
      }]);
    }
    setShowActivityForm(false);
  };

  const deleteActivity = (actId: string) =>
    setActivities((prev) => prev.filter((a) => a.id !== actId));

  const handleActivityImgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingActivityImg(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiClient.post('/api/v1/media/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data?.data);
      if (result?.publicUrl) setActivityFormImageUrl(result.publicUrl);
    } catch { /* silent */ } finally {
      setUploadingActivityImg(false);
      if (activityImgRef.current) activityImgRef.current.value = '';
    }
  };

  // ── Schedule helpers ──────────────────────────────────────────────────────
  const saveScheduleMutation = useMutation({
    mutationFn: (dateKey: string) =>
      apiClient.put(`/api/v1/screens/${id}/schedule`, {
        date: dateKey,
        schedule: scheduleByDate[dateKey] ?? [],
      }),
    onSuccess: () => {
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 3000);
    },
  });

  const addScheduleRow = (dateKey: string) =>
    setScheduleByDate((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] ?? []), { time: '', activityId: '', activity: '', location: '', imageUrl: '' }],
    }));

  const updateScheduleRow = (dateKey: string, index: number, field: string, value: string) =>
    setScheduleByDate((prev) => {
      const rows = [...(prev[dateKey] ?? [])];
      const row = { ...rows[index], [field]: value };
      if (field === 'activityId') {
        const template = activities.find((a) => a.id === value);
        if (template) {
          row.activity = template.name;
          row.imageUrl = template.imageUrl ?? '';
          row.location = template.defaultLocation ?? '';
        }
      }
      rows[index] = row;
      return { ...prev, [dateKey]: rows };
    });

  const removeScheduleRow = (dateKey: string, index: number) =>
    setScheduleByDate((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] ?? []).filter((_, i) => i !== index),
    }));

  const copyCode = () => {
    if (!screen?.deviceCode) return;
    navigator.clipboard.writeText(screen.deviceCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingScreen) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOnline = screen?.status === 'online';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/screens')}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-2xl font-bold text-slate-900 dark:text-white">{screen?.name}</h1>
        <button
          onClick={openEdit}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Editar pantalla"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Screen info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isOnline ? 'bg-green-50' : 'bg-slate-100'}`}>
            {isOnline ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-slate-400" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {screen?.lastSeenAt && (
                <span className="text-xs text-slate-400">
                  · visto {formatDistanceToNow(new Date(screen.lastSeenAt), { addSuffix: true, locale: es })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                {screen?.deviceCode}
              </span>
              <button onClick={copyCode} className="text-slate-400 hover:text-blue-500 transition" title="Copiar código">
                {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <span className="text-xs text-slate-400">· código del player</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{screen?.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content list */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Contenido de esta pantalla ({items.length})
          </h2>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Film className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Sin contenido específico para esta pantalla</p>
            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">
              El contenido global de Multimedia se sigue mostrando
            </p>
            <button onClick={() => setShowPicker(true)} className="mt-4 text-blue-600 hover:underline text-sm">
              + Agregar contenido
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((item, index) => (
              <li key={item.mediaFileId + index} className="flex items-center gap-3 px-5 py-3 group">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 text-xs leading-none">▲</button>
                  <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-slate-300 hover:text-slate-500 disabled:opacity-20 text-xs leading-none">▼</button>
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
                      onChange={(e) => updateDuration(index, Number(e.target.value))}
                      className="w-14 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-center text-xs"
                    />
                    <span>seg</span>
                  </div>
                )}
                <button onClick={() => removeItem(index)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-1 rounded flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {saveMutation.isSuccess && (
        <p className="text-green-600 text-sm text-center">✓ Guardado — la pantalla se actualiza en segundos</p>
      )}
      {saveMutation.isError && (
        <p className="text-red-500 text-sm text-center">
          ✗ Error: {(saveMutation.error as any)?.response?.data?.message ?? 'intentá de nuevo'}
        </p>
      )}

      {/* ── Totem: activity catalog + schedule (Magna only) ── */}
      {screen?.screenType === 'totem' && screen?.organization?.slug !== 'pedraza' && (
        <>
          {/* ── Activity catalog ────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Catálogo de actividades</h2>
                <p className="text-xs text-slate-400 mt-0.5">Actividades disponibles para programar en el totem</p>
              </div>
              <button
                onClick={() => saveActivitiesMutation.mutate()}
                disabled={saveActivitiesMutation.isPending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition text-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {saveActivitiesMutation.isPending ? 'Guardando...' : 'Guardar catálogo'}
              </button>
            </div>

            <input
              ref={activityImgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleActivityImgChange}
            />

            <div className="p-4 space-y-2">
              {activities.length === 0 && !showActivityForm && (
                <p className="text-slate-400 text-sm py-2 text-center">
                  Sin actividades. Agregá una para comenzar.
                </p>
              )}

              {activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 group"
                >
                  <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                    {act.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={act.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{act.name}</p>
                    {act.defaultLocation && (
                      <p className="text-xs text-slate-400 truncate">📍 {act.defaultLocation}</p>
                    )}
                  </div>
                  <button onClick={() => openEditActivity(act)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition p-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteActivity(act.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {showActivityForm ? (
                <div className="border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-3 bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {editingActivityId ? 'Editar actividad' : 'Nueva actividad'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => activityImgRef.current?.click()}
                      disabled={uploadingActivityImg}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-500 bg-white dark:bg-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-purple-500 transition overflow-hidden flex-shrink-0"
                    >
                      {uploadingActivityImg ? (
                        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      ) : activityFormImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={activityFormImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-[10px] leading-none">Foto</span>
                        </>
                      )}
                    </button>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={activityFormName}
                        onChange={(e) => setActivityFormName(e.target.value)}
                        placeholder="Nombre de la actividad *"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={activityFormLocation}
                        onChange={(e) => setActivityFormLocation(e.target.value)}
                        placeholder="Lugar predeterminado (opcional)"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 transition">
                      Cancelar
                    </button>
                    <button
                      onClick={submitActivityForm}
                      disabled={!activityFormName.trim()}
                      className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {editingActivityId ? 'Actualizar' : 'Agregar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={openAddActivity} className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm font-medium mt-1 py-1">
                  <Plus className="w-4 h-4" /> Agregar actividad
                </button>
              )}

              {activitiesSaved && <p className="text-emerald-600 text-sm mt-1">✓ Catálogo guardado</p>}
              {saveActivitiesMutation.isError && <p className="text-red-500 text-sm mt-1">✗ Error al guardar catálogo</p>}
            </div>
          </div>

          {/* ── Schedule with date tabs ─────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Horarios del día</h2>
                <p className="text-xs text-slate-400 mt-0.5">Programá las actividades de cada día</p>
              </div>
              <button
                onClick={() => saveScheduleMutation.mutate(getArgDateKey(selectedDateOffset))}
                disabled={saveScheduleMutation.isPending}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
              >
                <Save className="w-4 h-4" />
                {saveScheduleMutation.isPending ? 'Guardando...' : 'Guardar horarios'}
              </button>
            </div>

            <div className="flex border-b border-slate-100 dark:border-slate-700 px-5">
              {[0, 1].map((offset) => {
                const dateKey = getArgDateKey(offset);
                const label = getArgDateLabel(offset);
                const count = scheduleByDate[dateKey]?.length ?? 0;
                const isActive = selectedDateOffset === offset;
                return (
                  <button
                    key={offset}
                    onClick={() => setSelectedDateOffset(offset)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                      isActive
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <span>{offset === 0 ? 'Hoy' : 'Mañana'}</span>
                    <span className="capitalize text-xs text-slate-400 hidden sm:inline">{label}</span>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isActive
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-3">
              {(() => {
                const dateKey = getArgDateKey(selectedDateOffset);
                const rows = scheduleByDate[dateKey] ?? [];
                return (
                  <>
                    {activities.length === 0 && (
                      <p className="text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        Primero agregá actividades al catálogo para poder programar horarios.
                      </p>
                    )}
                    {rows.map((row, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="time"
                          value={row.time}
                          onChange={(e) => updateScheduleRow(dateKey, index, 'time', e.target.value)}
                          className="w-28 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 flex-shrink-0"
                        />
                        <div className="flex-1 relative">
                          <select
                            value={row.activityId}
                            onChange={(e) => updateScheduleRow(dateKey, index, 'activityId', e.target.value)}
                            className="w-full appearance-none px-3 py-2 pr-8 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">— Seleccionar actividad —</option>
                            {activities.map((act) => (
                              <option key={act.id} value={act.id}>{act.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => updateScheduleRow(dateKey, index, 'location', e.target.value)}
                          placeholder="Lugar"
                          className="w-36 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 flex-shrink-0"
                        />
                        <div className="w-10 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                          {row.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                            : <ImageIcon className="w-3.5 h-3.5 text-slate-300" />}
                        </div>
                        <button onClick={() => removeScheduleRow(dateKey, index)} className="text-slate-300 hover:text-red-500 transition p-1.5 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addScheduleRow(dateKey)}
                      disabled={activities.length === 0}
                      className="flex items-center gap-2 text-purple-600 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium mt-2"
                    >
                      <Plus className="w-4 h-4" /> Agregar horario
                    </button>
                  </>
                );
              })()}
            </div>

            {scheduleSaved && (
              <p className="text-green-600 text-sm text-center py-3 border-t border-slate-100 dark:border-slate-700">✓ Horarios guardados</p>
            )}
            {saveScheduleMutation.isError && (
              <p className="text-red-500 text-sm text-center py-3 border-t border-slate-100 dark:border-slate-700">✗ Error al guardar</p>
            )}
          </div>
        </>
      )}

      {/* ── Edit modal ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Editar pantalla</h3>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['tv', 'totem'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setEditScreenType(type); if (type === 'tv') setEditOrientation('landscape'); }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition ${
                        editScreenType === type
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {type === 'tv'
                        ? <Tv className={`w-6 h-6 ${editScreenType === 'tv' ? 'text-blue-600' : 'text-slate-400'}`} />
                        : <RectangleVertical className={`w-6 h-6 ${editScreenType === 'totem' ? 'text-blue-600' : 'text-slate-400'}`} />
                      }
                      <span className={`text-sm font-medium ${editScreenType === type ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {type === 'tv' ? 'TV' : 'Totem'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {editScreenType === 'totem' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Orientación</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['landscape', 'portrait'] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => setEditOrientation(o)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                          editOrientation === o
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`bg-slate-300 dark:bg-slate-600 rounded-sm ${o === 'landscape' ? 'w-10 h-6' : 'w-6 h-10'}`} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {o === 'landscape' ? 'Horizontal' : 'Vertical'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editMutation.isError && (
                <p className="text-red-500 text-sm">
                  Error al guardar: {(editMutation.error as any)?.response?.data?.message ?? 'intentá de nuevo'}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">Cancelar</button>
              <button
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending || !editName.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
              >
                <Save className="w-4 h-4" />
                {editMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Picker modal ── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Agregar contenido</h3>
              <button onClick={() => { setShowPicker(false); setPendingMedia(null); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="px-4 pt-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                  isDragActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className={`w-6 h-6 mx-auto mb-1.5 ${isDragActive ? 'text-blue-500' : 'text-slate-300'}`} />
                {uploadMutation.isPending ? (
                  <p className="text-blue-600 text-sm animate-pulse">Subiendo...</p>
                ) : (
                  <p className="text-slate-400 text-sm">{isDragActive ? 'Suelta aquí' : 'Arrastrá o hacé clic para subir'}</p>
                )}
              </div>
            </div>
            {pendingMedia ? (
              <div className="p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {pendingMedia.publicUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={pendingMedia.publicUrl} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{pendingMedia.name}</p>
                    <p className="text-xs text-slate-400">Imagen</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    ¿Cuántos segundos mostrar esta imagen?
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={3600}
                      value={pendingDuration}
                      onChange={(e) => setPendingDuration(Math.max(1, Number(e.target.value)))}
                      className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <span className="text-sm text-slate-400">segundos</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[5, 10, 15, 30].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPendingDuration(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          pendingDuration === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPendingMedia(null)} className="flex-1 px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition">
                    Volver
                  </button>
                  <button onClick={confirmPendingMedia} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto p-4 space-y-2 flex-1">
                {(mediaList as any[]).length === 0 ? (
                  <p className="text-center text-slate-400 py-4 text-sm">Subí un archivo usando el área de arriba</p>
                ) : (
                  (mediaList as any[]).map((media: any) => {
                    const already = items.some((i) => i.mediaFileId === media.id);
                    return (
                      <button
                        key={media.id}
                        onClick={() => { if (!already) addMedia(media); }}
                        disabled={already}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                          already
                            ? 'border-slate-100 dark:border-slate-700 opacity-40 cursor-not-allowed'
                            : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                        }`}
                      >
                        <div className="w-12 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {media.publicUrl && media.type === 'image'
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={media.publicUrl} alt="" className="w-full h-full object-cover" />
                            : media.type === 'video' ? <Film className="w-4 h-4 text-slate-400" /> : <ImageIcon className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{media.name ?? media.originalName}</p>
                          <p className="text-xs text-slate-400">{media.type === 'video' ? 'Video' : 'Imagen'}</p>
                        </div>
                        {already && <span className="text-xs text-slate-400 flex-shrink-0">Agregado</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

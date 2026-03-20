'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, Archive, Calendar, Layers } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  archived: 'Archivada',
};

const STATUS_VARIANTS: Record<string, any> = {
  draft: 'secondary',
  active: 'success',
  paused: 'warning',
  completed: 'default',
  archived: 'destructive',
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.get('/api/v1/campaigns?limit=50'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/v1/campaigns/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const campaigns = data?.data?.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Campañas</h1>
          <p className="text-slate-500 mt-1">Gestiona y programa tus campañas publicitarias</p>
        </div>
        <a
          href="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </a>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Nombre</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Estado</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Prioridad</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Inicio</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Fin</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Pantallas</th>
                <th className="text-right px-6 py-3 text-slate-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    No hay campañas. Crea la primera.
                  </td>
                </tr>
              ) : (
                campaigns.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                        {c.description && (
                          <p className="text-slate-400 text-xs truncate max-w-xs">{c.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_VARIANTS[c.status]}>
                        {STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{c.priority}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {c.startsAt ? format(new Date(c.startsAt), 'dd/MM/yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {c.endsAt ? format(new Date(c.endsAt), 'dd/MM/yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.assignments?.length ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {c.status === 'draft' || c.status === 'paused' ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: c.id, status: 'active' })}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Activar"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : c.status === 'active' ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: c.id, status: 'paused' })}
                            className="text-orange-500 hover:text-orange-600 p-1"
                            title="Pausar"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : null}
                        <a
                          href={`/campaigns/${c.id}`}
                          className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition"
                        >
                          Editar
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

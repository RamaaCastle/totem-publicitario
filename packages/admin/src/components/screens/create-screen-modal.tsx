'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, Tv, RectangleVertical } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const schema = z.object({
  name: z.string().min(2).max(100),
  screenType: z.enum(['tv', 'totem']).default('tv'),
  orientation: z.enum(['landscape', 'portrait']).default('landscape'),
  location: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateScreenModal({ onClose, onSuccess }: Props) {
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { screenType: 'tv', orientation: 'landscape' },
  });

  const screenType = useWatch({ control, name: 'screenType' });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        // TVs always landscape
        orientation: data.screenType === 'tv' ? 'landscape' : data.orientation,
      };
      return apiClient.post('/api/v1/screens', payload);
    },
    onSuccess,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nueva pantalla</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 space-y-4">

          {/* Tipo — TV o Totem */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['tv', 'totem'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setValue('screenType', type);
                    if (type === 'tv') setValue('orientation', 'landscape');
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    screenType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  {type === 'tv'
                    ? <Tv className={`w-7 h-7 ${screenType === 'tv' ? 'text-blue-600' : 'text-slate-400'}`} />
                    : <RectangleVertical className={`w-7 h-7 ${screenType === 'totem' ? 'text-blue-600' : 'text-slate-400'}`} />
                  }
                  <span className={`text-sm font-medium ${screenType === type ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {type === 'tv' ? 'TV' : 'Totem'}
                  </span>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('screenType')} />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              placeholder={screenType === 'tv' ? 'Ej: TV Recepción' : 'Ej: Totem Entrada'}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
            <input
              {...register('location')}
              placeholder="Ej: Piso 1, Lobby"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Orientación — solo para Totems */}
          {screenType === 'totem' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Orientación</label>
              <select
                {...register('orientation')}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="landscape">Horizontal (Landscape)</option>
                <option value="portrait">Vertical (Portrait)</option>
              </select>
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              Error al crear la pantalla. Intentá nuevamente.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
            >
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear pantalla'}
            </button>
          </div>
        </form>

        {mutation.isSuccess && (
          <div className="px-6 pb-5">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
              <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                Pantalla creada. Código del dispositivo:
              </p>
              <p className="font-mono text-2xl font-bold text-green-800 dark:text-green-300 mt-1">
                {(mutation.data as any)?.data?.data?.deviceCode}
              </p>
              <p className="text-green-600 text-xs mt-1">
                Ingresá este código en el reproductor para vincular la pantalla.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield, Lock, Users, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function RolesPage() {
  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get('/api/v1/roles'),
  });

  const { data: permsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => apiClient.get('/api/v1/roles/permissions'),
  });

  const roles = rolesData?.data?.data ?? [];
  const permissions = permsData?.data?.data ?? [];

  // Group permissions by resource
  const permsByResource: Record<string, any[]> = {};
  permissions.forEach((p: any) => {
    if (!permsByResource[p.resource]) permsByResource[p.resource] = [];
    permsByResource[p.resource].push(p);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles y permisos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Control de acceso basado en roles (RBAC)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
            Roles del sistema
          </h2>
          {loadingRoles ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-3/4" />
              </div>
            ))
          ) : (
            roles.map((role: any) => (
              <div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${role.isSystemRole ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <Shield className={`w-4 h-4 ${role.isSystemRole ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{role.name}</p>
                      {role.isSystemRole && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                          Sistema
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-slate-400 text-xs mt-0.5">{role.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {role.permissions?.length ?? 0} permisos
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Permissions matrix */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1 mb-3">
            Matriz de permisos
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Recurso</th>
                    {roles.map((role: any) => (
                      <th key={role.id} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {Object.entries(permsByResource).map(([resource, perms]) => (
                    <tr key={resource} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                          {resource}
                        </span>
                      </td>
                      {roles.map((role: any) => {
                        const rolePermNames = new Set(role.permissions?.map((p: any) => p.name) ?? []);
                        const hasAll = perms.every((p) => rolePermNames.has(p.name));
                        const hasSome = perms.some((p) => rolePermNames.has(p.name));
                        return (
                          <td key={role.id} className="px-3 py-3 text-center">
                            {hasAll ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : hasSome ? (
                              <div className="w-4 h-4 bg-blue-200 dark:bg-blue-800 rounded-full mx-auto" />
                            ) : (
                              <div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 px-1">
            <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />Acceso completo &nbsp;
            <span className="inline-block w-3 h-3 bg-blue-200 rounded-full align-middle mr-1" />Acceso parcial &nbsp;
            <span className="inline-block w-3 h-3 bg-slate-100 rounded-full align-middle mr-1" />Sin acceso
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Monitor, LayoutDashboard, Image, Megaphone, List, Users, Settings,
  Shield, ChevronLeft, ChevronRight, Building2, ClipboardList, LogOut, ArrowLeftRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useOrgStore } from '@/stores/org.store';
import { authApi } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/screens', icon: Monitor, label: 'Pantallas' },
  { href: '/media', icon: Image, label: 'Multimedia' },
  { href: '/users', icon: Users, label: 'Usuarios' },
  { href: '/audit', icon: ClipboardList, label: 'Auditoría' },
  { href: '/settings', icon: Settings, label: 'Configuración' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { selectedOrg, clearOrg } = useOrgStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    clearOrg();
    window.location.href = '/';
  };

  const handleSwitchOrg = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    clearOrg();
    window.location.href = '/';
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 text-white transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-slate-700', collapsed && 'justify-center')}>
        {selectedOrg?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedOrg.logoUrl}
            alt={selectedOrg.name}
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ background: selectedOrg?.primary ?? '#3b82f6' }}
          >
            <Monitor className="w-5 h-5 text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-sm leading-tight truncate">
              {selectedOrg?.name ?? 'Signage Platform'}
            </p>
            <p className="text-slate-400 text-xs">Admin Panel</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={handleSwitchOrg}
            title="Cambiar organización"
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition mb-0.5',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-slate-700 p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-slate-700 hover:bg-slate-600 text-white rounded-full p-1 shadow-lg transition"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>
    </aside>
  );
}

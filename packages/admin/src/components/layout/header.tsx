'use client';

import { Bell, Moon, Sun, ChevronRight, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/screens': 'Pantallas',
  '/media': 'Multimedia',
  '/playlists': 'Playlists',
  '/campaigns': 'Campañas',
  '/users': 'Usuarios',
  '/roles': 'Roles y permisos',
  '/audit': 'Auditoría',
  '/settings': 'Configuración',
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const pathname = usePathname();

  const pageTitle = PAGE_TITLES[pathname] ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k)) ?? ''] ?? 'Panel';

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Panel</span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          <span className="font-medium text-slate-700 dark:text-slate-200">{pageTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition relative">
          <Bell className="w-4 h-4" />
        </button>

        <div className="ml-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}

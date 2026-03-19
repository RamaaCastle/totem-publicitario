import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorMap = {
  blue:   { icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',   border: 'border-blue-100 dark:border-blue-900/30',  glow: 'shadow-blue-100 dark:shadow-blue-900/20' },
  green:  { icon: 'bg-green-500/10 text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900/30', glow: 'shadow-green-100 dark:shadow-green-900/20' },
  red:    { icon: 'bg-red-500/10 text-red-600 dark:text-red-400',       border: 'border-red-100 dark:border-red-900/30',    glow: 'shadow-red-100 dark:shadow-red-900/20' },
  purple: { icon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30', glow: 'shadow-purple-100 dark:shadow-purple-900/20' },
  orange: { icon: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30', glow: 'shadow-orange-100 dark:shadow-orange-900/20' },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: keyof typeof colorMap;
  loading?: boolean;
  trend?: string;
}

export function StatCard({ title, value, icon: Icon, color, loading, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow',
      c.border,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide truncate">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {value}
            </p>
          )}
          {trend && !loading && (
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 truncate">{trend}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl flex-shrink-0', c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

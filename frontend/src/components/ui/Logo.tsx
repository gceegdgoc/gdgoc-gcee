import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function Logo({ light = false, to = '/' }: { light?: boolean; to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5" aria-label="GDGoC GCEE home">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 shadow-card">
        <span className="font-display text-lg font-bold text-white">G</span>
        <span className="absolute inset-x-1.5 bottom-1 flex gap-[3px]">
          <span className="h-1 flex-1 rounded-full bg-g-blue" />
          <span className="h-1 flex-1 rounded-full bg-g-green" />
          <span className="h-1 flex-1 rounded-full bg-g-yellow" />
          <span className="h-1 flex-1 rounded-full bg-g-red" />
        </span>
      </div>
      <div className="leading-tight">
        <p className={cn('font-display text-base font-bold tracking-tight', light ? 'text-white' : 'text-navy-900')}>
          GDGoC <span className="text-g-blue">GCEE</span>
        </p>
        <p className={cn('text-[10px] font-medium tracking-wide', light ? 'text-white/60' : 'text-ink-muted')}>
          Government College of Engineering, Erode
        </p>
      </div>
    </Link>
  );
}

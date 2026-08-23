import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Tone = 'blue' | 'green' | 'yellow' | 'red' | 'navy' | 'gray';

const tones: Record<Tone, string> = {
  blue: 'bg-g-blue/10 text-blue-700 border-g-blue/20',
  green: 'bg-g-green/10 text-green-700 border-g-green/25',
  yellow: 'bg-g-yellow/15 text-yellow-700 border-g-yellow/30',
  red: 'bg-g-red/10 text-red-600 border-g-red/20',
  navy: 'bg-navy-900/5 text-navy-800 border-navy-900/10',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn('chip border', tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Tone> = {
    UPCOMING: 'blue',
    ONGOING: 'yellow',
    COMPLETED: 'green',
    CANCELLED: 'red',
    PRESENT: 'green',
    ABSENT: 'red',
    VALID: 'green',
    REVOKED: 'red',
    REGISTERED: 'blue',
  };
  return (
    <Badge tone={map[status] || 'gray'} className="capitalize">
      {status.replace(/_/g, ' ').toLowerCase()}
    </Badge>
  );
}

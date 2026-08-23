import { cn } from '../../lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn('mb-10', align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && (
        <div
          className={cn(
            'mb-3 flex items-center gap-2',
            align === 'center' ? 'justify-center' : 'justify-start'
          )}
        >
          <span className="h-2 w-2 rounded-full bg-g-blue" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-g-blue">{eyebrow}</span>
        </div>
      )}
      <h2 className="font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-base text-ink-muted">{subtitle}</p>}
    </div>
  );
}

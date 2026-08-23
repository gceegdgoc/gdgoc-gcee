import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-6 w-6 animate-spin rounded-full border-[3px] border-g-blue border-t-transparent', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <Spinner className="h-9 w-9" />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}

export function ButtonSpinner() {
  return <Spinner className="h-4 w-4 border-2 border-white/40 border-t-white" />;
}

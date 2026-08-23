import type { ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { cn } from '../../lib/utils';

/** Wraps content in a scroll-triggered fade-in / slide-up reveal. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn('reveal', className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

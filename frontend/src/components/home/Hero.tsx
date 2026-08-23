import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, Terminal, Braces, Cloud, Cpu, GitBranch, Sparkles } from 'lucide-react';

const floatingIcons = [
  { Icon: Braces, className: 'left-[6%] top-[18%] text-g-blue', delay: '0s' },
  { Icon: Terminal, className: 'right-[8%] top-[24%] text-g-green', delay: '1.2s' },
  { Icon: GitBranch, className: 'left-[12%] bottom-[22%] text-g-red', delay: '2s' },
  { Icon: Cloud, className: 'right-[14%] bottom-[18%] text-g-yellow', delay: '0.8s' },
  { Icon: Cpu, className: 'left-[45%] top-[10%] text-g-blue/60', delay: '1.6s' },
  { Icon: Sparkles, className: 'right-[42%] bottom-[12%] text-g-yellow', delay: '2.4s' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      {/* Ambient gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-g-blue/20 blur-3xl animate-blob" />
        <div className="absolute top-24 right-0 h-80 w-80 rounded-full bg-g-green/15 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-g-yellow/10 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Floating code symbols */}
      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
        {floatingIcons.map(({ Icon, className, delay }, i) => (
          <div
            key={i}
            className={`absolute animate-float-slow ${className}`}
            style={{ animationDelay: delay, opacity: 0.8 }}
          >
            <Icon className="h-8 w-8" strokeWidth={1.5} />
          </div>
        ))}
        <div className="absolute right-[30%] top-[12%] h-2 w-2 animate-pulse rounded-full bg-g-green" />
        <div className="absolute left-[30%] bottom-[28%] h-2 w-2 animate-pulse rounded-full bg-g-blue" style={{ animationDelay: '1s' }} />
        <div className="absolute right-[22%] top-[52%] h-1.5 w-1.5 animate-pulse rounded-full bg-g-yellow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container-x relative z-10 flex flex-col items-center pt-36 pb-24 text-center sm:pt-44 sm:pb-32">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 animate-fade-in">
          <span className="chip border border-white/15 bg-white/5 text-white/80">
            <span className="h-2 w-2 animate-pulse rounded-full bg-g-green" />
            Google Developer Groups on Campus
          </span>
          <span className="chip border border-white/15 bg-white/5 text-white/60">GCEE · Erode</span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl animate-fade-in">
          Build. Learn.{' '}
          <span className="bg-gradient-to-r from-g-blue via-g-green to-g-yellow bg-clip-text text-transparent">
            Innovate.
          </span>{' '}
          Together.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg animate-fade-in" style={{ animationDelay: '150ms' }}>
          GDGoC GCEE — A student developer community at Government College of Engineering, Erode. Workshops,
          hackathons, open source and hands-on learning for every student developer.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row animate-fade-in" style={{ animationDelay: '250ms' }}>
          <Link to="/events" className="btn-primary !px-6 !py-3 text-base">
            Explore Events
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/join" className="btn !px-6 !py-3 border border-white/20 bg-white/5 text-base text-white hover:bg-white/10">
            <CalendarPlus className="h-4 w-4" />
            Join Community
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid w-full max-w-3xl grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '350ms' }}>
          {[
            ['120+', 'Community Members'],
            ['15+', 'Events & Workshops'],
            ['8+', 'Technologies'],
          ].map(([num, label]) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-white sm:text-3xl">{num}</p>
              <p className="mt-1 text-xs text-white/50 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="relative z-10 flex h-1.5">
        <div className="flex-1 bg-g-blue" />
        <div className="flex-1 bg-g-green" />
        <div className="flex-1 bg-g-yellow" />
        <div className="flex-1 bg-g-red" />
      </div>
    </section>
  );
}

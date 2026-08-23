import { useEffect, useCallback, useState, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Events', to: '/events' },
  { label: 'Team', to: '/team' },
  { label: 'Join Us', to: '/join' },
  { label: 'Contact', to: '/contact' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { student, logoutStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollPos = useRef(0);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (open) {
      scrollPos.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPos.current}px`;
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollPos.current > 0) {
        window.scrollTo(0, scrollPos.current);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [open]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) close();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [close]);

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ menuOpen: true }, '');
    const handlePopState = () => {
      setOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open]);

  const handleLogout = async () => {
    await logoutStudent();
    navigate('/');
    close();
  };

  return (
    <>
      {/* Mobile pill header — sticky, full-width padding, pill-shaped */}
      <header
        className="fixed inset-x-0 top-0 z-40 p-3 md:hidden"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex h-12 items-center justify-between rounded-full border border-black/15 bg-white px-2 shadow-sm">
          <Link to="/" className="flex items-center gap-2 pl-2" aria-label="GDGoC GCEE home">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900">
              <span className="font-display text-sm font-bold text-white">G</span>
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-navy-900">
              GDGoC <span className="text-g-blue">GCEE</span>
            </span>
          </Link>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-black transition-colors active:bg-black active:text-white"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            type="button"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Desktop header — original style */}
      <header
        className="fixed inset-x-0 top-0 z-40 hidden border-b border-black/5 bg-white/95 backdrop-blur-md md:block"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors',
                    isActive ? 'text-black' : 'text-black/40 hover:text-black'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {student ? (
              <>
                <Link to="/dashboard" className="border border-black/10 px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-black hover:text-white">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="font-mono text-xs font-bold uppercase tracking-wider text-black/40 transition hover:text-black">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-mono text-xs font-bold uppercase tracking-wider text-black/40 transition hover:text-black">
                  Login
                </Link>
                <Link to="/join" className="rounded-lg bg-g-blue px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-blue-600">
                  Join Community
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        ref={menuRef}
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-white transition-all duration-300 ease-in-out md:hidden',
          open
            ? 'opacity-100 translate-y-0 visible'
            : 'opacity-0 -translate-y-2 invisible pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 px-4">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-black/30">
            Menu
          </span>
          <button
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded border border-black/10 text-black transition-colors active:bg-black active:text-white"
            aria-label="Close menu"
            type="button"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'rounded border border-transparent px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider transition-all',
                    isActive
                      ? 'border-black bg-black text-white'
                      : 'text-black/50 hover:border-black/10 hover:text-black active:bg-black/5'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="my-4 h-px bg-black/10" />
            {student ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={close}
                  className="flex w-full items-center justify-center gap-2 border border-black bg-black px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black active:bg-white active:text-black"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-center gap-2 border border-black/10 px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-black/50 transition hover:border-black hover:text-black active:bg-black/5"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="flex w-full items-center justify-center gap-2 border border-black/10 px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-black/50 transition hover:border-black hover:text-black active:bg-black/5"
                >
                  Login
                </Link>
                <Link
                  to="/join"
                  onClick={close}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-g-blue px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-white transition hover:bg-blue-600 active:bg-blue-700"
                >
                  Join Community
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

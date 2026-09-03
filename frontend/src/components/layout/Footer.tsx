import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { SITE_EMAIL } from '../../lib/site';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-4.05s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const footerCols = [
  {
    heading: 'Explore',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Events', to: '/events' },
      { label: 'Team', to: '/team' },
      { label: 'Gallery', to: '/gallery' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Join Us', to: '/join' },
      { label: 'Contact', to: '/contact' },
      { label: 'Resources', to: '/resources' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            GCEE Tech Hub — Government College of Engineering, Erode. A student developer
            community built to learn, build and innovate together.
          </p>
          <div className="mt-5 flex gap-3">
            {[
              { icon: GithubIcon, href: 'https://github.com/gceegdgoc/gdgoc-gcee', label: 'GitHub' },
              { icon: Mail, href: `mailto:${SITE_EMAIL}`, label: 'Email us' },
            ].map(({ icon: Icon, href, label }, i) => (
              <a
                key={i}
                href={href}
                target={href.startsWith('mailto') ? undefined : '_blank'}
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70 transition hover:bg-g-blue hover:text-white"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {footerCols.map((col) => (
          <div key={col.heading}>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">{col.heading}</h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-white/60 transition hover:text-g-blue">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-center text-xs text-white/40 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} GCEE Tech Hub — Government College of Engineering, Erode.</p>
          <p className="flex items-center gap-3">
            <Link to="/admin/login" className="transition hover:text-white/70">Admin</Link>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              <a href={`mailto:${SITE_EMAIL}`} className="transition hover:text-white/70">{SITE_EMAIL}</a>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Erode, Tamil Nadu
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Mail, MapPin, Github } from 'lucide-react';
import { Logo } from '../ui/Logo';

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
            Google Developer Groups on Campus — Government College of Engineering, Erode. A student developer
            community built to learn, build and innovate together.
          </p>
          <div className="mt-5 flex gap-3">
            {[
              { icon: Github, href: 'https://github.com/HARIESHV', label: 'GitHub' },
              { icon: Mail, href: 'mailto:gceegdgoc@gmail.com', label: 'Email us' },
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
          <p>© {new Date().getFullYear()} GDGoC on Campus — Government College of Engineering, Erode.</p>
          <p className="flex items-center gap-3">
            <Link to="/admin/login" className="transition hover:text-white/70">Admin</Link>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              <a href="mailto:gceegdgoc@gmail.com" className="transition hover:text-white/70">gceegdgoc@gmail.com</a>
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

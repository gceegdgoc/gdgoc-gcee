import { Linkedin } from 'lucide-react';
import type { Member } from '../../types';

export function MemberCard({ member }: { member: Member }) {
  const socials = member.socialLinks || {};
  return (
    <div className="member-card group overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.06)]">
      {/* Member image */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-[#f3f4f6] select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            draggable="false"
            className="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6]">
            <span className="font-display text-5xl font-bold text-black/[0.07] sm:text-6xl">
              {member.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-3 text-center sm:px-4 sm:py-3.5">
        <h3 className="text-[0.82rem] font-bold leading-tight text-[#111] sm:text-sm">
          {member.name}
        </h3>
        {member.coordinatorRole ? (
          <p className="mt-0.5 text-[0.72rem] font-medium text-black/55 sm:text-xs">
            {member.coordinatorRole}
          </p>
        ) : null}
        <p className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-black/30 sm:text-[0.7rem]">
          {member.role}
        </p>

        {/* Social icons */}
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {socials.linkedin && (
            <a
              href={socials.linkedin}
              target="_blank"
              rel="noreferrer"
              className="flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-black/[0.08] text-black/25 transition-all duration-200 hover:border-[#0a66c2] hover:bg-[#0a66c2] hover:text-white sm:h-7 sm:w-7"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-3 w-3" />
            </a>
          )}
          {socials.github && (
            <a
              href={socials.github}
              target="_blank"
              rel="noreferrer"
              className="flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-black/[0.08] text-black/25 transition-all duration-200 hover:border-[#333] hover:bg-[#333] hover:text-white sm:h-7 sm:w-7"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
          )}
          {socials.instagram && (
            <a
              href={socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-black/[0.08] text-black/25 transition-all duration-200 hover:border-[#e4405f] hover:bg-[#e4405f] hover:text-white sm:h-7 sm:w-7"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          )}
          {socials.twitter && (
            <a
              href={socials.twitter}
              target="_blank"
              rel="noreferrer"
              className="flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-black/[0.08] text-black/25 transition-all duration-200 hover:border-[#1da1f2] hover:bg-[#1da1f2] hover:text-white sm:h-7 sm:w-7"
              aria-label="Twitter"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

import { QrCode, Calendar } from 'lucide-react';

const NAVY = '#0b2545';
const DEEP_NAVY = '#07162c';
const ROYAL_BLUE = '#134074';
const GOLD = '#c5a53a';
const GOLD_LIGHT = '#f3e5ab';
const GOLD_DARK = '#9a7b20';
const GRAY = '#475569';

export interface CertificatePreviewData {
  participantName: string;
  eventName: string;
  eventDateLabel: string;
  certificateId: string;
  organization?: string;
  institution?: string;
  qrCode?: string;
}

/**
 * Visual template for the GDGoC GCEE Certificate of Participation.
 * Matches the reference certificate image with Google Developer Groups on Campus branding,
 * GCEE crest, gold double borders, 3D ribbon medal, and QR seal.
 */
export function CertificatePreview({ data }: { data: CertificatePreviewData }) {
  const org = data.organization || 'GDGoC GCEE';
  const inst = data.institution || 'Government College of Engineering, Erode';
  const name = data.participantName || 'Student Name';
  const event = data.eventName || 'AI Prompt Engineering Workshop';
  const date = data.eventDateLabel || '18 August 2026';
  const certId = data.certificateId || 'GDGCEE-20260818-A123';

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-white shadow-2xl select-none"
      style={{ aspectRatio: '841.89 / 595.28', fontFamily: 'Georgia, serif' }}
    >
      {/* 1. Diagonal Layered Geometric Corners (Top-Left and Bottom-Right) */}
      {/* Top-Left Geometric Corner */}
      <svg className="pointer-events-none absolute left-0 top-0 h-[38%] w-[26%]" viewBox="0 0 220 220" fill="none">
        <polygon points="0,0 170,0 0,210" fill={DEEP_NAVY} />
        <polygon points="0,0 130,0 0,165" fill={ROYAL_BLUE} />
        <polygon points="0,212 0,222 180,0 172,0" fill={GOLD} />
        <polygon points="0,226 0,230 187,0 183,0" fill={GOLD_LIGHT} />
      </svg>

      {/* Bottom-Right Geometric Corner */}
      <svg className="pointer-events-none absolute bottom-0 right-0 h-[38%] w-[26%]" viewBox="0 0 220 220" fill="none">
        <g transform="rotate(180 110 110)">
          <polygon points="0,0 170,0 0,210" fill={DEEP_NAVY} />
          <polygon points="0,0 130,0 0,165" fill={ROYAL_BLUE} />
          <polygon points="0,212 0,222 180,0 172,0" fill={GOLD} />
          <polygon points="0,226 0,230 187,0 183,0" fill={GOLD_LIGHT} />
        </g>
      </svg>

      {/* 2. Double Gold Frame with Corner Knots */}
      <div className="absolute inset-[3%] rounded-[2px] border-[2px]" style={{ borderColor: GOLD }} />
      <div className="absolute inset-[3.8%] rounded-[1px] border-[0.8px]" style={{ borderColor: GOLD_DARK }} />

      {/* 3. Certificate Content */}
      <div className="relative flex h-full w-full flex-col justify-between px-[7%] py-[4%] text-center">
        {/* Top Header: GDGoC on Left, GCEE on Right */}
        <div className="flex w-full items-center justify-between text-left">
          {/* Left: Google Developer Groups on Campus */}
          <div className="flex items-center gap-2 pl-[8%] sm:pl-[11%]">
            <div className="flex items-center font-mono text-[clamp(12px,1.8vw,20px)] font-black">
              <span style={{ color: '#4285F4' }}>&lt;</span>
              <span style={{ color: '#34A853' }}>&gt;</span>
            </div>
            <div>
              <div className="font-sans text-[clamp(10px,1.4vw,17px)] font-extrabold leading-tight tracking-tight">
                <span style={{ color: '#4285F4' }}>G</span>
                <span style={{ color: '#EA4335' }}>o</span>
                <span style={{ color: '#FBBC05' }}>o</span>
                <span style={{ color: '#4285F4' }}>g</span>
                <span style={{ color: '#34A853' }}>l</span>
                <span style={{ color: '#EA4335' }}>e</span>
                <span className="text-navy-900 ml-1 font-bold">Developer Groups</span>
              </div>
              <p className="font-sans text-[clamp(6px,0.8vw,10px)] text-slate-500 font-medium leading-none">
                on Campus
              </p>
              <p className="font-sans text-[clamp(7px,0.9vw,11px)] font-bold text-navy-950 mt-0.5">
                {org}
              </p>
            </div>
          </div>

          {/* Right: GCEE Crest & Title */}
          <div className="flex items-center gap-2.5 pr-[4%]">
            {/* Crest SVG representation */}
            <div className="flex h-[clamp(28px,4.5vw,50px)] w-[clamp(28px,4.5vw,50px)] items-center justify-center rounded-full border-[1.5px] border-navy-900 bg-white p-1">
              <div className="h-full w-full rounded-full border border-navy-800 flex flex-col items-center justify-center text-[5px] font-bold text-navy-900 leading-none">
                <span className="text-[4px] uppercase tracking-tighter">GCEE</span>
                <span>★</span>
              </div>
            </div>
            <div>
              <p className="font-sans text-[clamp(8px,1.2vw,14px)] font-extrabold uppercase leading-tight text-navy-950">
                GOVERNMENT COLLEGE
              </p>
              <p className="font-sans text-[clamp(8px,1.2vw,14px)] font-extrabold uppercase leading-tight text-navy-950">
                OF ENGINEERING, ERODE
              </p>
              <p className="font-sans text-[clamp(6px,0.8vw,9px)] font-bold tracking-widest text-[#c5a53a] mt-0.5">
                LEARN • BUILD • IMPACT
              </p>
            </div>
          </div>
        </div>

        {/* Center Section: Main Title & Presentation */}
        <div className="my-auto flex flex-col items-center">
          {/* Heading */}
          <h1
            className="font-serif text-[clamp(22px,4vw,44px)] font-bold tracking-wider leading-none text-navy-950"
            style={{ color: NAVY }}
          >
            CERTIFICATE
          </h1>

          {/* Subheading: "— OF PARTICIPATION —" */}
          <div className="mt-[0.6%] flex items-center justify-center gap-3">
            <div className="h-[1.5px] w-12 sm:w-20 rounded-full" style={{ backgroundColor: GOLD }} />
            <span
              className="font-sans text-[clamp(8px,1.2vw,13px)] font-bold tracking-[0.25em] uppercase"
              style={{ color: GOLD_DARK }}
            >
              OF PARTICIPATION
            </span>
            <div className="h-[1.5px] w-12 sm:w-20 rounded-full" style={{ backgroundColor: GOLD }} />
          </div>

          {/* Subtitle */}
          <p className="mt-[1.5%] font-sans text-[clamp(7px,0.9vw,11px)] font-bold uppercase tracking-[0.2em] text-slate-500">
            THIS IS PROUDLY PRESENTED TO
          </p>

          {/* Student Name */}
          <p
            className="mt-[0.8%] max-w-[85%] truncate font-serif text-[clamp(18px,3.8vw,42px)] italic font-semibold text-[#0f2c59]"
            style={{ fontFamily: 'Times New Roman, Georgia, serif' }}
          >
            {name}
          </p>

          {/* Gold ornamental divider */}
          <div className="mt-[1%] flex items-center justify-center gap-1">
            <div className="h-[1px] w-20 sm:w-32" style={{ backgroundColor: GOLD }} />
            <div className="h-2 w-2 rotate-45" style={{ backgroundColor: GOLD }} />
            <div className="h-[1px] w-20 sm:w-32" style={{ backgroundColor: GOLD }} />
          </div>

          {/* Event description */}
          <p className="mt-[1.2%] font-sans text-[clamp(7.5px,1vw,12px)] text-slate-600">
            for actively participating in the event
          </p>

          {/* Event Name */}
          <p className="mt-[0.4%] max-w-[85%] truncate font-sans text-[clamp(11px,1.8vw,21px)] font-bold text-navy-950">
            {event}
          </p>

          <p className="mt-[0.4%] font-sans text-[clamp(7.5px,1vw,12px)] text-slate-600">
            organized by {org}
          </p>

          {/* Event Date Badge */}
          <div className="mt-[1.2%] inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-slate-800">
            <Calendar className="h-3 w-3 text-blue-600" />
            <span className="font-sans text-[clamp(7.5px,1vw,12px)] font-bold text-navy-900">
              {date}
            </span>
          </div>
        </div>

        {/* Bottom Row: Badges & Footer */}
        <div className="relative flex w-full items-end justify-between px-2">
          {/* Left Badge: 3D Gold Ribbon Medal */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-[clamp(44px,7vw,76px)] w-[clamp(44px,7vw,76px)] items-center justify-center">
              {/* Ribbon tails */}
              <div className="absolute -bottom-4 -left-1 h-8 w-4 -rotate-12 bg-navy-900" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }} />
              <div className="absolute -bottom-4 -right-1 h-8 w-4 rotate-12 bg-navy-900" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }} />
              {/* Circular Gold Seal */}
              <div
                className="relative z-10 flex h-full w-full items-center justify-center rounded-full shadow-lg border-[3px]"
                style={{ backgroundColor: GOLD, borderColor: GOLD_DARK }}
              >
                <div className="flex h-[80%] w-[80%] flex-col items-center justify-center rounded-full bg-navy-950 text-center p-1 border border-[#e0c870]">
                  <span className="font-sans text-[clamp(4px,0.6vw,7px)] font-black uppercase tracking-tighter text-[#f3e5ab] leading-none">
                    BUILD
                  </span>
                  <span className="font-sans text-[clamp(4px,0.6vw,7px)] font-black uppercase tracking-tighter text-[#f3e5ab] leading-none">
                    CONNECT
                  </span>
                  <span className="font-sans text-[clamp(4px,0.6vw,7px)] font-black uppercase tracking-tighter text-[#f3e5ab] leading-none">
                    INSPIRE
                  </span>
                  <span className="text-[clamp(5px,0.7vw,8px)] text-[#c5a53a] mt-0.5 leading-none">
                    ★★★
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Footer: Certificate ID */}
          <div className="flex flex-col items-center pb-1">
            {/* Gold flourish */}
            <div className="flex items-center gap-1 opacity-75 mb-1">
              <div className="h-[1px] w-8 bg-[#c5a53a]" />
              <span className="text-[9px] text-[#c5a53a]">❦</span>
              <div className="h-[1px] w-8 bg-[#c5a53a]" />
            </div>
            <p className="font-mono text-[clamp(6.5px,0.9vw,10px)] font-bold tracking-widest text-slate-600">
              CERTIFICATE ID: {certId}
            </p>
          </div>

          {/* Right Badge: Gold Starburst QR Seal */}
          <div className="flex flex-col items-center pr-2">
            <div
              className="flex h-[clamp(44px,7vw,78px)] w-[clamp(44px,7vw,78px)] flex-col items-center justify-center rounded-full p-1 shadow-md border-[2.5px]"
              style={{ backgroundColor: GOLD, borderColor: GOLD_DARK }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white p-1">
                {data.qrCode ? (
                  <img src={data.qrCode} alt="Certificate QR" className="h-[65%] w-[65%] object-contain" />
                ) : (
                  <QrCode className="h-[60%] w-[60%] text-navy-900" />
                )}
                <span className="font-sans text-[clamp(3.5px,0.5vw,5.5px)] font-extrabold uppercase leading-none text-navy-950 mt-0.5 text-center">
                  SCAN TO DOWNLOAD<br />YOUR CERTIFICATE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
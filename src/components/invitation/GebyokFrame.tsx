import React from 'react';

interface GebyokFrameProps {
  children: React.ReactNode;
  variant?: 'cover' | 'section';
  className?: string;
}

/**
 * Reproduces the signature SIMANTEN Javanese Gebyok carved archway border,
 * hanging Janur/Kembar Mayang palm arches, monochrome botanical toile etching,
 * and sculpted dark monochrome corner florals transformed into luxury Black Edition.
 */
export const GebyokFrame: React.FC<GebyokFrameProps> = ({
  children,
  variant = 'section',
  className = '',
}) => {
  const uid = variant === 'cover' ? 'cov' : 'sec';
  return (
    <div
      className={`relative overflow-hidden bg-[#101010] text-white ${className}`}
    >
      {/* Subtle monochrome engraved botanical toile forest backdrop */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 430 900"
      >
        <defs>
          <pattern id={`toile-trees-${uid}`} width="430" height="450" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#B8A88A" strokeLinecap="round">
              {/* Distant rolling horizon and fine etching crosshatch */}
              <path d="M0 326 Q105 304 215 322 T430 310" strokeWidth="0.6" opacity="0.45" />
              <path d="M0 368 Q125 352 245 366 T430 356" strokeWidth="0.55" opacity="0.35" />
              {/* Left classical engraved toile tree canopy & trunk */}
              <path d="M46 448 C56 376 62 316 58 258 C56 230 48 206 38 186" strokeWidth="1.3" opacity="0.7" />
              <path d="M98 448 C88 378 82 320 86 264 C88 232 96 206 108 184" strokeWidth="1.2" opacity="0.65" />
              <path d="M58 274 C32 260 12 232 18 198 C24 168 48 152 68 148 C82 126 112 124 130 144 C154 148 168 176 158 206 C150 232 128 248 102 254" strokeWidth="0.95" opacity="0.6" />
              <path d="M36 226 C52 204 72 194 94 198 M64 176 C84 162 108 164 128 180 M44 190 C62 178 82 178 100 186" strokeWidth="0.7" opacity="0.5" />
              <path d="M30 242 Q54 228 76 244 M84 234 Q108 218 134 232 M56 156 Q78 144 98 156" strokeWidth="0.65" opacity="0.45" />
              {/* Right tall engraved toile tree canopy & fine branches */}
              <path d="M294 448 C306 356 312 288 308 216 C305 186 296 164 282 142" strokeWidth="1.35" opacity="0.7" />
              <path d="M350 448 C338 358 332 292 336 222 C339 190 348 166 364 144" strokeWidth="1.25" opacity="0.65" />
              <path d="M298 228 C258 214 236 182 246 144 C256 108 286 92 314 96 C332 68 372 68 394 96 C420 104 428 140 416 174 C406 206 380 224 348 228" strokeWidth="0.95" opacity="0.6" />
              <path d="M268 176 C294 152 324 142 356 148 M296 124 C324 108 356 110 384 130 M282 198 C312 184 344 184 374 198" strokeWidth="0.75" opacity="0.5" />
              <path d="M262 152 Q284 136 308 152 M338 118 Q364 104 388 122 M314 170 Q342 156 370 170" strokeWidth="0.65" opacity="0.45" />
              {/* Wildflower meadow & reeds along bottom */}
              <path d="M10 448 Q26 392 48 368 M22 448 Q46 402 74 386 M134 448 Q154 398 182 378 M168 448 Q186 408 214 392 M234 448 Q254 396 280 374 M368 448 Q392 396 418 372" strokeWidth="0.8" opacity="0.5" />
            </g>
          </pattern>
        </defs>
        <rect width="430" height="900" fill={`url(#toile-trees-${uid})`} />
      </svg>

      {/* Subtle radial vignette to focus center typography */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,17,15,0.25)_0%,rgba(8,8,8,0.82)_100%)]"
      />

      {/* Left & Right Carved Javanese Gebyok Pillars */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[18px] border-r border-[#B8A88A]/35 bg-gradient-to-r from-[#040404] via-[#1B1813] to-[#0E0D0B]"
      >
        <div
          className="h-full w-full opacity-55"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(184,168,138,0.34) 0px, rgba(184,168,138,0.34) 1.5px, transparent 1.5px, transparent 10px)',
          }}
        />
        <div className="absolute inset-y-0 right-[3px] w-px bg-[#B8A88A]/25" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[18px] border-l border-[#B8A88A]/35 bg-gradient-to-l from-[#040404] via-[#1B1813] to-[#0E0D0B]"
      >
        <div
          className="h-full w-full opacity-55"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(184,168,138,0.34) 0px, rgba(184,168,138,0.34) 1.5px, transparent 1.5px, transparent 10px)',
          }}
        />
        <div className="absolute inset-y-0 left-[3px] w-px bg-[#B8A88A]/25" />
      </div>

      {/* Top Carved Javanese Gebyok Archway Crown with Filigree Corners */}
      <svg
        aria-hidden="true"
        viewBox="0 0 430 156"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`carvingTop-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050504" />
            <stop offset="55%" stopColor="#161411" />
            <stop offset="100%" stopColor="#24201A" />
          </linearGradient>
        </defs>
        {/* Outer carved wooden arch */}
        <path
          d="M0 0 H430 V156 C416 112, 398 86, 368 74 C354 48, 326 32, 290 30 C268 15, 242 8, 215 8 C188 8, 162 15, 140 30 C104 32, 76 48, 62 74 C32 86, 14 112, 0 156 Z"
          fill={`url(#carvingTop-${uid})`}
          stroke="#B8A88A"
          strokeOpacity="0.52"
          strokeWidth="1.3"
        />
        {/* Inner double-bevel carved ridge */}
        <path
          d="M10 132 C24 96, 44 76, 70 66 C84 42, 110 26, 144 24 C168 10, 192 4, 215 4 C238 4, 262 10, 286 24 C320 26, 346 42, 360 66 C386 76, 406 96, 420 132"
          fill="none"
          stroke="#B8A88A"
          strokeOpacity="0.36"
          strokeWidth="0.9"
        />
        <path
          d="M18 118 C32 88, 52 72, 76 62 C90 40, 114 28, 146 26 C170 14, 193 9, 215 9 C237 9, 260 14, 284 26 C316 28, 340 40, 354 62 C378 72, 398 88, 412 118"
          fill="none"
          stroke="#B8A88A"
          strokeOpacity="0.22"
          strokeWidth="0.8"
          strokeDasharray="2.5 3.5"
        />
        {/* Ornate Left & Right Ukir Jawa Corner Filigree */}
        <g stroke="#B8A88A" strokeOpacity="0.48" fill="none" strokeWidth="0.95">
          {/* Left carving scrolls */}
          <path d="M16 14 C46 8, 76 16, 94 38 C72 42, 52 52, 36 74 C24 60, 20 38, 16 14 Z" fill="#181511" fillOpacity="0.65" />
          <path d="M26 24 C46 20, 66 26, 76 40 M32 42 C48 38, 58 44, 54 58" />
          <path d="M18 68 C28 56, 42 52, 52 58 M42 18 C58 14, 74 18, 86 28" />
          <circle cx="48" cy="32" r="2.6" fill="#B8A88A" fillOpacity="0.55" />
          <circle cx="30" cy="54" r="1.8" fill="#B8A88A" fillOpacity="0.45" />
          {/* Right carving scrolls (mirrored) */}
          <path d="M414 14 C384 8, 354 16, 336 38 C358 42, 378 52, 394 74 C406 60, 410 38, 414 14 Z" fill="#181511" fillOpacity="0.65" />
          <path d="M404 24 C384 20, 364 26, 354 40 M398 42 C382 38, 372 44, 376 58" />
          <path d="M412 68 C402 56, 388 52, 378 58 M388 18 C372 14, 356 18, 344 28" />
          <circle cx="382" cy="32" r="2.6" fill="#B8A88A" fillOpacity="0.55" />
          <circle cx="400" cy="54" r="1.8" fill="#B8A88A" fillOpacity="0.45" />
        </g>
        {/* Central carved Javanese Gunungan / Nanasan pendant crest */}
        <g transform="translate(215, 24)" stroke="#B8A88A" strokeOpacity="0.72" fill="#15120E">
          <path d="M0 -20 C14 -11, 16 11, 0 24 C-16 11, -14 -11, 0 -20 Z" strokeWidth="1.2" />
          <path d="M0 -12 C7 -5, 8 6, 0 15 C-8 6, -7 -5, 0 -12 Z" fill="none" strokeWidth="0.85" />
          <path d="M-24 -6 C-16 -2, -14 4, -18 8 M24 -6 C16 -2, 14 4, 18 8" fill="none" strokeWidth="0.8" />
          <circle cx="0" cy="2" r="2.4" fill="#B8A88A" fillOpacity="0.75" />
        </g>
      </svg>

      {/* Hanging Janur / Kembar Mayang Palm Arches & Sculpted Corner Florals */}
      {variant === 'cover' && (
        <>
          {/* Top-left sweeping Janur arch with woven ketupat tassel */}
          <svg
            aria-hidden="true"
            viewBox="0 0 210 210"
            className="pointer-events-none absolute left-1 top-6 z-10 h-44 w-44 opacity-70"
          >
            <g fill="none" stroke="#B8A88A">
              <path d="M8 158 C18 42, 92 8, 152 60" strokeWidth="2.6" strokeOpacity="0.65" />
              <path d="M12 156 C24 48, 94 16, 148 62" strokeWidth="0.9" strokeOpacity="0.35" />
              {/* Woven hanging palm fringe strands */}
              <path d="M30 78 L30 164 M48 56 L48 148 M68 42 L68 134 M88 34 L88 120 M108 36 L108 106" strokeWidth="1.15" strokeDasharray="5 3.5" strokeOpacity="0.58" />
              <path d="M38 66 L38 152 M58 48 L58 138 M78 38 L78 124 M98 35 L98 110" strokeWidth="0.7" strokeDasharray="2.5 4.5" strokeOpacity="0.4" />
              {/* Woven Ketupat Lantern & Tassels */}
              <g transform="translate(152, 62)">
                <path d="M0 0 L12 12 L8 32 L-8 32 L-12 12 Z" fill="#181511" strokeWidth="1.2" strokeOpacity="0.75" />
                <path d="M-9 14 L9 14 M-7 22 L7 22 M0 2 L0 32" strokeWidth="0.7" strokeOpacity="0.5" />
                <path d="M-5 32 L-6 46 M0 32 L0 50 M5 32 L6 46" strokeWidth="0.9" strokeOpacity="0.6" />
              </g>
            </g>
          </svg>

          {/* Bottom-right rising Janur arch */}
          <svg
            aria-hidden="true"
            viewBox="0 0 210 210"
            className="pointer-events-none absolute bottom-10 right-1 z-10 h-40 w-40 opacity-60"
          >
            <g fill="none" stroke="#B8A88A" transform="scale(-1, 1) translate(-210, 0)">
              <path d="M8 158 C18 42, 92 8, 152 60" strokeWidth="2.4" strokeOpacity="0.62" />
              <path d="M30 78 L30 154 M52 54 L52 138 M74 40 L74 124 M96 36 L96 110" strokeWidth="1.1" strokeDasharray="5 3.5" strokeOpacity="0.55" />
              <g transform="translate(152, 62)">
                <path d="M0 0 L11 11 L7 28 L-7 28 L-11 11 Z" fill="#181511" strokeWidth="1.1" strokeOpacity="0.7" />
                <path d="M-4 28 L-5 40 M0 28 L0 44 M4 28 L5 40" strokeWidth="0.85" strokeOpacity="0.55" />
              </g>
            </g>
          </svg>

          {/* Sculpted monochrome botanical floral clusters at bottom corners */}
          <svg
            aria-hidden="true"
            viewBox="0 0 180 140"
            className="pointer-events-none absolute bottom-0 left-0 z-10 h-32 w-40 opacity-65"
          >
            <g stroke="#B8A88A" strokeWidth="0.9" fill="#1A1713">
              <path d="M18 134 C24 98, 46 72, 82 64 C66 86, 48 112, 24 134 Z" fillOpacity="0.75" />
              <path d="M52 134 C66 108, 96 92, 134 94 C108 112, 84 126, 58 134 Z" fillOpacity="0.65" />
              {/* Stylized charcoal & champagne blossom */}
              <g transform="translate(46, 108)">
                <circle cx="0" cy="0" r="18" fill="#1D1915" strokeOpacity="0.6" />
                <circle cx="0" cy="0" r="11" fill="#2A241C" strokeOpacity="0.7" />
                <circle cx="0" cy="0" r="4" fill="#B8A88A" fillOpacity="0.75" />
              </g>
              <g transform="translate(86, 118)">
                <circle cx="0" cy="0" r="12" fill="#171411" strokeOpacity="0.55" />
                <circle cx="0" cy="0" r="5" fill="#B8A88A" fillOpacity="0.55" />
              </g>
            </g>
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 180 140"
            className="pointer-events-none absolute bottom-0 right-0 z-10 h-32 w-40 opacity-65"
          >
            <g stroke="#B8A88A" strokeWidth="0.9" fill="#1A1713" transform="scale(-1, 1) translate(-180, 0)">
              <path d="M18 134 C24 98, 46 72, 82 64 C66 86, 48 112, 24 134 Z" fillOpacity="0.75" />
              <path d="M52 134 C66 108, 96 92, 134 94 C108 112, 84 126, 58 134 Z" fillOpacity="0.65" />
              <g transform="translate(46, 108)">
                <circle cx="0" cy="0" r="18" fill="#1D1915" strokeOpacity="0.6" />
                <circle cx="0" cy="0" r="11" fill="#2A241C" strokeOpacity="0.7" />
                <circle cx="0" cy="0" r="4" fill="#B8A88A" fillOpacity="0.75" />
              </g>
              <g transform="translate(86, 118)">
                <circle cx="0" cy="0" r="12" fill="#171411" strokeOpacity="0.55" />
                <circle cx="0" cy="0" r="5" fill="#B8A88A" fillOpacity="0.55" />
              </g>
            </g>
          </svg>
        </>
      )}

      {/* Bottom Carved Gebyok Archway Base */}
      <svg
        aria-hidden="true"
        viewBox="0 0 430 130"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0 130 H430 V0 C414 40, 396 60, 368 68 C354 90, 330 102, 294 104 C272 116, 244 122, 215 122 C186 122, 158 116, 136 104 C100 102, 76 90, 62 68 C34 60, 16 40, 0 0 Z"
          fill="#090807"
          stroke="#B8A88A"
          strokeOpacity="0.46"
          strokeWidth="1.25"
        />
        <path
          d="M14 26 C28 58, 48 74, 72 82 C86 102, 112 112, 144 114 C168 124, 192 128, 215 128 C238 128, 262 124, 286 114 C318 112, 344 102, 358 82 C382 74, 402 58, 416 26"
          fill="none"
          stroke="#B8A88A"
          strokeOpacity="0.28"
          strokeWidth="0.9"
        />
        <g transform="translate(215, 106)" stroke="#B8A88A" strokeOpacity="0.68" fill="#16130F">
          <path d="M0 -18 C12 -10, 13 8, 0 18 C-13 8, -12 -10, 0 -18 Z" strokeWidth="1.1" />
          <circle cx="0" cy="0" r="2.2" fill="#B8A88A" fillOpacity="0.72" />
        </g>
      </svg>

      {/* Main Content Container */}
      <div className="relative z-20 px-7 py-24 sm:px-9">{children}</div>
    </div>
  );
};

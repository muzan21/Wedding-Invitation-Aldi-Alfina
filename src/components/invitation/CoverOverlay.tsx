import React from 'react';
import { MailOpen } from 'lucide-react';
import type { WeddingConfig } from '../../types/wedding';
import { GebyokFrame } from './GebyokFrame';

interface CoverOverlayProps {
  config: WeddingConfig;
  guestName: string;
  isOpen: boolean;
  onOpen: () => void;
}

export const CoverOverlay: React.FC<CoverOverlayProps> = ({
  config,
  guestName,
  isOpen,
  onOpen,
}) => {
  return (
    <div
      data-testid="invitation-cover"
      aria-hidden={isOpen}
      className={`fixed inset-0 z-50 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:left-auto lg:w-[440px] ${
        isOpen
          ? 'pointer-events-none -translate-y-full opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <GebyokFrame
        variant="cover"
        className="flex h-full min-h-[100dvh] w-full flex-col items-center justify-center"
      >
        <div className="mx-auto flex w-full max-w-[300px] flex-col items-center text-center">
          {/* Intertwined Serif Monogram echoing SIMANTEN demo711 cover */}
          <div
            aria-label={`Monogram ${config.monogramLeft} dan ${config.monogramRight}`}
            className="relative mb-6 flex h-44 w-52 select-none items-center justify-center"
          >
            <span className="font-serif-editorial -translate-x-4 -translate-y-4 text-[104px] font-normal leading-none text-[#C4B497] drop-shadow-[0_6px_22px_rgba(0,0,0,0.85)]">
              {config.monogramLeft || config.groomShortName.charAt(0)}
            </span>
            <span className="font-script absolute left-1/2 top-1/2 -translate-x-[48%] -translate-y-[38%] text-[124px] leading-none text-white/95 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              &amp;
            </span>
            <span className="font-serif-editorial translate-x-5 translate-y-4 text-[104px] font-normal leading-none text-[#C4B497] drop-shadow-[0_6px_22px_rgba(0,0,0,0.85)]">
              {config.monogramRight || config.brideShortName.charAt(0)}
            </span>
          </div>

          <p className="font-serif-editorial text-[13px] tracking-[0.26em] text-[#D8D3C8] uppercase">
            {config.groomShortName} &amp; {config.brideShortName}
          </p>
          <p className="mt-1.5 font-serif-editorial text-xs tracking-[0.24em] text-[#9A948A]">
            {config.heroDateDisplay}
          </p>

          {/* Personalized Guest Greeting when ?to= is present */}
          <div className="mt-7 mb-7 min-h-[60px] w-full border-y border-[#B8A88A]/20 py-3.5">
            <p className="font-serif-editorial text-xs italic tracking-wider text-[#A0A0A0]">
              Kepada Yth. Bapak/Ibu/Saudara/i
            </p>
            <p
              data-testid="cover-guest-name"
              className="mt-1 font-serif-editorial text-xl font-semibold tracking-wide text-white"
            >
              {guestName || 'Tamu Undangan'}
            </p>
          </div>

          {/* Original solid pill-shaped BUKA UNDANGAN CTA in Black Edition */}
          <button
            type="button"
            onClick={onOpen}
            className="group inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-full border border-[#B8A88A]/55 bg-gradient-to-b from-[#23201B] to-[#12110F] px-10 py-3 font-ui text-[11px] font-semibold tracking-[0.24em] text-white uppercase shadow-[0_12px_34px_rgba(0,0,0,0.85)] transition-all duration-200 hover:border-white hover:from-white hover:to-[#EFECE6] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8A88A] whitespace-nowrap cursor-pointer"
          >
            <MailOpen className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span>BUKA UNDANGAN</span>
          </button>
        </div>
      </GebyokFrame>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Disc3, Volume2, VolumeX, X } from 'lucide-react';
import type { AttendanceStatus, InvitationBundle } from '../../types/wedding';
import {
  fetchPublicInvitation,
  lookupPublicGuest,
  submitPublicRsvp,
} from '../../services/weddingApi';
import { WeddingAudioController } from '../../utils/ambientAudio';
import { parseGuestNameFromSearch } from '../../utils/weddingLogic';
import { DEFAULT_WEDDING_BUNDLE } from '../../data/defaultWedding';
import { CoverOverlay } from './CoverOverlay';
import { FloatingPetals } from './FloatingPetals';
import { InvitationSections } from './InvitationSections';

interface PublicInvitationPageProps {
  onNavigateAdmin: () => void;
}

export const PublicInvitationPage: React.FC<PublicInvitationPageProps> = ({
  onNavigateAdmin,
}) => {
  const [bundle, setBundle] = useState<InvitationBundle>({
    config: DEFAULT_WEDDING_BUNDLE.config,
    events: DEFAULT_WEDDING_BUNDLE.events,
    gifts: DEFAULT_WEDDING_BUNDLE.gifts,
    gallery: DEFAULT_WEDDING_BUNDLE.gallery,
    wishes: DEFAULT_WEDDING_BUNDLE.wishes,
  });
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState<string>(() =>
    typeof window !== 'undefined' ? parseGuestNameFromSearch(window.location.search) : ''
  );
  const [guestQrToken, setGuestQrToken] = useState<string>('');
  const [coverOpened, setCoverOpened] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const audioRef = useRef<WeddingAudioController | null>(null);

  // Initialize audio controller
  useEffect(() => {
    const controller = new WeddingAudioController();
    audioRef.current = controller;
    return () => {
      controller.dispose();
      audioRef.current = null;
    };
  }, []);

  // Load live invitation data from backend
  useEffect(() => {
    let active = true;
    fetchPublicInvitation()
      .then((data) => {
        if (!active) return;
        setBundle(data);
        if (data.config.visibility.cover === false) {
          setCoverOpened(true);
        }
        audioRef.current?.setUrl(data.config.musicUrl || '');
      })
      .catch((err) => {
        console.error('Failed to fetch invitation data:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync audio URL whenever config changes
  useEffect(() => {
    audioRef.current?.setUrl(bundle.config.musicUrl || '');
  }, [bundle.config.musicUrl]);

  // Lookup personalized guest QR token if ?to=... is provided
  useEffect(() => {
    const nameFromUrl = parseGuestNameFromSearch(window.location.search);
    setGuestName(nameFromUrl);
    if (!nameFromUrl) return;
    let active = true;
    lookupPublicGuest(nameFromUrl)
      .then((res) => {
        if (!active) return;
        if (res.name) setGuestName(res.name);
        if (res.qrToken) setGuestQrToken(res.qrToken);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Lock body scroll while cover is closed on mobile
  useEffect(() => {
    if (!coverOpened && bundle.config.visibility.cover) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [coverOpened, bundle.config.visibility.cover]);

  const handleOpenInvitation = async () => {
    setCoverOpened(true);
    if (bundle.config.musicEnabled && bundle.config.musicAutoplayOnOpen && audioRef.current) {
      const started = await audioRef.current.play();
      setIsMusicPlaying(started);
    }
  };

  const handleToggleMusic = async () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      const started = await audioRef.current.play();
      setIsMusicPlaying(started);
    }
  };

  const handleSubmitRsvp = async (payload: {
    guestName: string;
    attendance: AttendanceStatus;
    attendeeCount: number;
    message: string;
  }) => {
    const result = await submitPublicRsvp(payload);
    if (result.wish) {
      setBundle((prev) => ({
        ...prev,
        wishes: [result.wish!, ...prev.wishes],
      }));
    }
  };

  const { config } = bundle;
  const coupleLabel = `${config.groomShortName} & ${config.brideShortName}`;

  return (
    <div className="min-h-screen w-full bg-[#080808] text-white">
      {/* Desktop Split-Screen Layout matching https://simanten.com/view/?web=... */}
      <div className="lg:flex lg:min-h-screen">
        {/* LEFT FIXED EDITORIAL PORTRAIT PANEL (Desktop >= 1024px) */}
        <aside
          aria-label="Potret Mempelai"
          className="relative hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[calc(100%-440px)] lg:flex-col lg:justify-between lg:overflow-hidden lg:border-r lg:border-[#242424] lg:bg-[#050505]"
        >
          <img
            src={config.desktopSplitPhoto}
            alt={`Potret Editorial ${coupleLabel}`}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080808]/90 via-transparent to-[#080808]/45" />

          {/* Subtle top editorial caption */}
          <div className="relative z-10 flex items-center justify-between px-10 py-8">
            <span className="font-serif-editorial text-xs tracking-[0.28em] text-[#D0D0D0] uppercase">
              The Wedding Invitation
            </span>
            <span className="font-serif-editorial text-xs tracking-[0.22em] text-[#B8A88A]">
              {config.heroDateDisplay}
            </span>
          </div>

          {/* Bottom couple signature on desktop editorial backdrop */}
          <div className="relative z-10 px-10 pb-10">
            <p className="font-script text-6xl tracking-wide text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
              {config.groomShortName}
              <span className="mx-3 text-[#C4B497]">&amp;</span>
              {config.brideShortName}
            </p>
            <p className="mt-2 max-w-md font-serif-editorial text-sm tracking-wide text-[#D0D0D0]">
              {config.weddingDescription}
            </p>
          </div>
        </aside>

        {/* RIGHT SCROLLABLE INVITATION COLUMN (440px desktop / full-width mobile) */}
        <div className="relative mx-auto w-full max-w-[480px] bg-[#080808] shadow-[0_0_60px_rgba(0,0,0,0.95)] lg:ml-auto lg:mr-0 lg:w-[440px] lg:max-w-[440px]">
          {/* Ambient drifting champagne petals */}
          <FloatingPetals />

          {/* Opening Invitation Cover Overlay */}
          {config.visibility.cover && (
            <CoverOverlay
              config={config}
              guestName={guestName}
              isOpen={coverOpened}
              onOpen={handleOpenInvitation}
            />
          )}

          {/* Main Scrollable Invitation Sections */}
          {loading ? (
            <div className="flex min-h-screen items-center justify-center bg-[#080808]">
              <p className="font-serif-editorial text-sm tracking-[0.22em] text-[#A0A0A0] uppercase">
                Memuat Undangan...
              </p>
            </div>
          ) : (
            <InvitationSections
              config={config}
              events={bundle.events}
              gifts={bundle.gifts}
              gallery={bundle.gallery}
              wishes={bundle.wishes}
              guestName={guestName}
              guestQrToken={guestQrToken}
              onSelectGalleryIndex={(idx) => setLightboxIdx(idx)}
              onSubmitRsvp={handleSubmitRsvp}
              onNavigateAdmin={onNavigateAdmin}
            />
          )}

          {/* Floating Vinyl Disc Music Player Toggle (exact Simanten bottom-right vinyl disc) */}
          {config.musicEnabled && (
            <button
              type="button"
              onClick={handleToggleMusic}
              aria-label={isMusicPlaying ? 'Jeda musik latar' : 'Putar musik latar'}
              title={config.musicTitle || 'Musik Latar'}
              className="fixed right-5 bottom-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#B8A88A]/50 bg-[#050505] text-white shadow-[0_8px_24px_rgba(0,0,0,0.9)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#B8A88A] cursor-pointer"
            >
              <div
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-[#303030] bg-[radial-gradient(circle,#ffffff_0%,#ffffff_18%,#141414_22%,#000000_70%,#2a2a2a_100%)] ${
                  isMusicPlaying ? 'animate-vinyl-spin' : ''
                }`}
              >
                <Disc3 className="h-4 w-4 text-[#B8A88A]/70 opacity-0" />
              </div>
              <span className="sr-only">{isMusicPlaying ? 'Playing' : 'Paused'}</span>
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#171717] border border-[#303030]"
              >
                {isMusicPlaying ? (
                  <Volume2 className="h-2.5 w-2.5 text-[#B8A88A]" />
                ) : (
                  <VolumeX className="h-2.5 w-2.5 text-[#A0A0A0]" />
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Photo Gallery Lightbox Modal */}
      {lightboxIdx !== null && bundle.gallery[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Foto Galeri"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Tutup galeri"
            className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-[#303030] bg-[#171717] text-white transition-colors hover:bg-white hover:text-black cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {bundle.gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto sebelumnya"
                onClick={() =>
                  setLightboxIdx((prev) =>
                    prev === null ? 0 : (prev - 1 + bundle.gallery.length) % bundle.gallery.length
                  )
                }
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#303030] bg-[#171717] text-white transition-colors hover:bg-white hover:text-black cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                onClick={() =>
                  setLightboxIdx((prev) =>
                    prev === null ? 0 : (prev + 1) % bundle.gallery.length
                  )
                }
                className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#303030] bg-[#171717] text-white transition-colors hover:bg-white hover:text-black cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="max-h-[85vh] max-w-3xl text-center">
            <img
              src={bundle.gallery[lightboxIdx].url}
              alt={bundle.gallery[lightboxIdx].caption || 'Galeri Pernikahan'}
              referrerPolicy="no-referrer"
              className={`max-h-[75vh] w-auto rounded-lg border border-[#303030] object-contain ${
                bundle.gallery[lightboxIdx].monochrome ? 'grayscale' : ''
              }`}
            />
            {bundle.gallery[lightboxIdx].caption && (
              <p className="mt-3 font-serif-editorial text-sm text-[#D0D0D0]">
                {bundle.gallery[lightboxIdx].caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Check,
  ChevronsUp,
  Copy,
  Download,
  Gift,
  Instagram,
  MapPin,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AttendanceStatus,
  DigitalGift,
  GalleryPhoto,
  GuestWish,
  WeddingConfig,
  WeddingEvent,
} from '../../types/wedding';
import {
  buildGoogleCalendarUrl,
  buildGuestQrPayload,
  buildIcsContent,
  computeCountdown,
  generateDeterministicQrToken,
  sanitizeExternalUrl,
  validateRsvpInput,
} from '../../utils/weddingLogic';
import { GebyokFrame } from './GebyokFrame';
import { QrCodeCanvas } from './QrCodeCanvas';
import { ScrollReveal } from './ScrollReveal';

const RELATIONSHIP_OPTIONS = [
  'Sahabat Mempelai',
  'Keluarga Besar',
  'Teman Sekolah/Kuliah',
  'Rekan Kerja',
  'Tamu Kehormatan',
  'Tetangga/Kerabat',
] as const;

interface InvitationSectionsProps {
  config: WeddingConfig;
  events: WeddingEvent[];
  gifts: DigitalGift[];
  gallery: GalleryPhoto[];
  wishes: GuestWish[];
  guestName: string;
  guestQrToken: string;
  onSelectGalleryIndex: (index: number) => void;
  onSubmitRsvp: (payload: {
    guestName: string;
    attendance: AttendanceStatus;
    attendeeCount: number;
    message: string;
  }) => Promise<void>;
  onNavigateAdmin: () => void;
}

export const InvitationSections: React.FC<InvitationSectionsProps> = ({
  config,
  events,
  gifts,
  gallery,
  wishes,
  guestName,
  guestQrToken,
  onSelectGalleryIndex,
  onSubmitRsvp,
  onNavigateAdmin,
}) => {
  const vis = config.visibility;

  const showAdminButton =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('akses') === 'admin';

  // Pre-wedding video ref & custom dark-gold player state (muted by default)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleToggleVideo = async () => {
    const el = videoRef.current;
    if (!el) return;
    setVideoError(null);
    try {
      if (el.paused || el.ended) {
        el.muted = true;
        await el.play();
        setIsVideoPlaying(true);
      } else {
        el.pause();
        setIsVideoPlaying(false);
      }
    } catch {
      setVideoError('Video tidak dapat diputar. Pastikan file /media/prewedding.mp4 berformat MP4 (H.264).');
      setIsVideoPlaying(false);
    }
  };

  const handleRestartVideo = async () => {
    const el = videoRef.current;
    if (!el) return;
    setVideoError(null);
    try {
      el.currentTime = 0;
      el.muted = true;
      await el.play();
      setIsVideoPlaying(true);
    } catch {
      setVideoError('Video tidak dapat diputar ulang.');
      setIsVideoPlaying(false);
    }
  };

  // Live ticking countdown based on configured weddingDateIso
  const [countdown, setCountdown] = useState(() => computeCountdown(config.weddingDateIso));
  useEffect(() => {
    setCountdown(computeCountdown(config.weddingDateIso));
    const timer = window.setInterval(() => {
      setCountdown(computeCountdown(config.weddingDateIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [config.weddingDateIso]);

  // QRIS toggle + copy confirmation state
  const [qrisOpen, setQrisOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
    } catch {
      // Fallback copy via temporary textarea
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
    }
  };

  // RSVP & Ucapan Form state
  const [rsvpName, setRsvpName] = useState(guestName);
  const [attendance, setAttendance] = useState<'' | AttendanceStatus>('');
  const [attendeeCount, setAttendeeCount] = useState<number>(1);
  const [relationshipCategory, setRelationshipCategory] = useState<string>('');
  const [wishMessage, setWishMessage] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (guestName && !rsvpName) {
      setRsvpName(guestName);
    }
  }, [guestName, rsvpName]);

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setSubmitError(null);
    const count = attendance === 'Hadir' ? attendeeCount : 0;
    const validation = validateRsvpInput({
      guestName: rsvpName,
      attendance,
      attendeeCount: count,
      message: wishMessage,
    });
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);

    const cleanMessage = wishMessage.trim();
    const formattedMessage = relationshipCategory
      ? cleanMessage
        ? `[${relationshipCategory}] ${cleanMessage}`
        : `[${relationshipCategory}]`
      : cleanMessage;

    try {
      await onSubmitRsvp({
        guestName: rsvpName.trim(),
        attendance: attendance as AttendanceStatus,
        attendeeCount: count,
        message: formattedMessage,
      });
      setSubmitSuccess('Terima kasih! Konfirmasi kehadiran dan ucapan Anda telah tersimpan.');
      setRelationshipCategory('');
      setWishMessage('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal mengirim RSVP.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryEvent = events[events.length - 1] || events[0];
  const coupleLabel = `${config.groomShortName} & ${config.brideShortName}`;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://simanten.app';

  const handleDownloadIcs = () => {
    if (!primaryEvent) return;
    const ics = buildIcsContent(primaryEvent, coupleLabel);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `undangan-${config.groomShortName.toLowerCase()}-${config.brideShortName.toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const qrPayload = useMemo(() => {
    const token =
      guestQrToken || generateDeterministicQrToken(guestName || 'Tamu Undangan', 'PUBLIC-QR');
    return buildGuestQrPayload(guestName || 'Tamu Undangan', token, config.weddingTitle);
  }, [guestName, guestQrToken, config.weddingTitle]);

  const handleScrollDown = () => {
    const target = document.getElementById('section-verse') || document.getElementById('section-couple');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group gallery into alternating 2-column asymmetric rows (5+7, 7+5) matching Simanten layout
  const galleryPairs = useMemo(() => {
    const pairs: GalleryPhoto[][] = [];
    for (let i = 0; i < gallery.length; i += 2) {
      pairs.push(gallery.slice(i, i + 2));
    }
    return pairs;
  }, [gallery]);

  return (
    <main className="relative w-full bg-[#080808] text-white">
      {/* 1. HERO SECTION */}
      {vis.hero && (
        <section
          id="section-hero"
          className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#080808]"
        >
          <img
            src={config.heroPhoto}
            alt={`Potret Pernikahan ${coupleLabel}`}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Measured dark top and bottom scrims preserving legibility */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080808]/90 via-[#080808]/20 to-[#080808]/88" />

          {/* Top Stacked Hero Typography (exact Simanten Demo 711 vertical alignment) */}
          <div className="relative z-10 px-6 pt-16 text-center">
            <ScrollReveal direction="down">
              <p className="font-serif-editorial text-lg tracking-[0.16em] text-[#D0D0D0]">
                The Wedding of
              </p>
              <h1 className="mt-2.5 font-script text-[46px] leading-[1.15] tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)] sm:text-[52px]">
                {config.groomShortName}
                <span className="mx-2.5 text-[#C4B497]">&amp;</span>
                {config.brideShortName}
              </h1>
              <p className="mt-2.5 font-serif-editorial text-base tracking-[0.28em] text-[#D0D0D0]">
                {config.heroDateDisplay}
              </p>
            </ScrollReveal>
          </div>

          {/* Bottom Swipe Up Indicator */}
          <div className="relative z-10 flex justify-center pb-8">
            <button
              type="button"
              onClick={handleScrollDown}
              aria-label="Scroll ke bagian berikutnya"
              className="animate-swipe-bounce flex flex-col items-center gap-1 text-[#D0D0D0] transition-colors hover:text-white cursor-pointer"
            >
              <ChevronsUp className="h-5 w-5 text-[#B8A88A]" />
              <span className="font-serif-editorial text-xs tracking-[0.2em] uppercase">
                Swipe Up
              </span>
            </button>
          </div>
        </section>
      )}

      {/* 2. QURANIC VERSE BAND (Full-bleed solid Black Edition band replacing brown #856346) */}
      {vis.verse && (
        <section
          id="section-verse"
          className="relative border-y border-[#242424] bg-[#000000] px-7 py-16 text-center sm:px-9"
        >
          <ScrollReveal direction="up">
            <p
              dir="rtl"
              lang="ar"
              className="font-arabic text-[22px] leading-[2.15] text-white sm:text-[24px]"
            >
              {config.verseArabic}
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delayMs={120}>
            <p className="mt-7 font-serif-editorial text-[16px] italic leading-[1.75] text-[#D0D0D0]">
              {config.verseTranslation}
            </p>
          </ScrollReveal>
          <ScrollReveal direction="fade" delayMs={220}>
            <p className="mt-5 font-serif-editorial text-base font-semibold italic tracking-wider text-[#B8A88A]">
              {config.verseSurah}
            </p>
          </ScrollReveal>
        </section>
      )}

      {/* 3. OPENING GREETING & COUPLE PROFILES (Gebyok Carved Frame) */}
      {vis.couple && (
        <section id="section-couple">
          <GebyokFrame variant="section">
            <div className="text-center">
              <ScrollReveal direction="up">
                <p className="font-serif-editorial text-lg font-medium tracking-wide text-white">
                  {config.openingGreetingBismillah}
                </p>
                <p className="mt-2 font-serif-editorial text-lg italic text-[#B8A88A]">
                  {config.openingGreetingSalam}
                </p>
                <p className="mt-4 font-serif-editorial text-[15px] leading-relaxed text-[#D0D0D0]">
                  {config.openingGreetingBody}
                </p>
              </ScrollReveal>

              {/* Groom Profile — Tall Vertical Oval Portrait */}
              <ScrollReveal direction="scale" delayMs={100} className="mt-11 flex flex-col items-center">
                <div className="h-[228px] w-[176px] overflow-hidden rounded-full border-2 border-[#B8A88A]/45 bg-[#171717] p-1 shadow-[0_14px_38px_rgba(0,0,0,0.8)]">
                  <img
                    src={config.groomPhoto}
                    alt={config.groomFullName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full rounded-full object-cover object-top"
                  />
                </div>
                <h2 className="mt-6 font-script text-[36px] leading-tight text-[#B8A88A]">
                  {config.groomFullName}
                </h2>
                <p className="mt-2 font-serif-editorial text-sm font-semibold text-white">
                  {config.groomChildOrder}
                </p>
                <p className="mt-1 font-serif-editorial text-[15px] leading-snug text-[#D0D0D0]">
                  {config.groomFather} &amp;
                  <br />
                  {config.groomMother}
                </p>
                {config.groomInstagram && (
                  <a
                    href={sanitizeExternalUrl(config.groomInstagram)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Instagram ${config.groomFullName}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#303030] bg-[#171717] px-3.5 py-1.5 font-ui text-[11px] text-[#D0D0D0] transition-colors hover:border-[#B8A88A] hover:text-white"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    <span>Instagram</span>
                  </a>
                )}
              </ScrollReveal>

              {/* Ornamental Ampersand Separator */}
              <div aria-hidden="true" className="my-8 flex items-center justify-center gap-4">
                <span className="h-px w-12 bg-[#303030]" />
                <span className="font-script text-3xl text-[#B8A88A]">&amp;</span>
                <span className="h-px w-12 bg-[#303030]" />
              </div>

              {/* Bride Profile — Tall Vertical Oval Portrait */}
              <ScrollReveal direction="scale" delayMs={140} className="flex flex-col items-center">
                <div className="h-[228px] w-[176px] overflow-hidden rounded-full border-2 border-[#B8A88A]/45 bg-[#171717] p-1 shadow-[0_14px_38px_rgba(0,0,0,0.8)]">
                  <img
                    src={config.bridePhoto}
                    alt={config.brideFullName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full rounded-full object-cover object-top"
                  />
                </div>
                <h2 className="mt-6 font-script text-[36px] leading-tight text-[#B8A88A]">
                  {config.brideFullName}
                </h2>
                <p className="mt-2 font-serif-editorial text-sm font-semibold text-white">
                  {config.brideChildOrder}
                </p>
                <p className="mt-1 font-serif-editorial text-[15px] leading-snug text-[#D0D0D0]">
                  {config.brideFather} &amp;
                  <br />
                  {config.brideMother}
                </p>
                {config.brideInstagram && (
                  <a
                    href={sanitizeExternalUrl(config.brideInstagram)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Instagram ${config.brideFullName}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#303030] bg-[#171717] px-3.5 py-1.5 font-ui text-[11px] text-[#D0D0D0] transition-colors hover:border-[#B8A88A] hover:text-white"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    <span>Instagram</span>
                  </a>
                )}
              </ScrollReveal>
            </div>
          </GebyokFrame>
        </section>
      )}

      {/* 4. WEDDING EVENTS + LIVE COUNTDOWN + SAVE THE DATE (Iconic Tall Translucent Pill-Arch Card) */}
      {(vis.events || vis.countdown) && (
        <section
          id="section-events"
          className="relative overflow-hidden bg-[#080808] px-5 py-16"
        >
          <img
            src={config.eventBackdropPhoto}
            alt="Latar Acara Pernikahan"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
          />
          <div className="pointer-events-none absolute inset-0 bg-[#080808]/45" />

          <ScrollReveal direction="up">
            <div className="relative z-10 mx-auto max-w-[376px] rounded-[185px] border border-[#303030] bg-[#0D0D0D]/86 px-7 py-16 text-center shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-sm">
              {vis.events && (
                <div className="space-y-10">
                  {events.map((ev, index) => (
                    <div
                      key={ev.id}
                      className={index > 0 ? 'border-t border-[#303030]/80 pt-9' : ''}
                    >
                      <h2 className="font-script text-[44px] leading-none text-white">
                        {ev.title}
                      </h2>
                      <p className="mt-4 font-serif-editorial text-lg font-semibold text-white">
                        {ev.dateLabel}
                      </p>
                      <p className="mt-1 font-serif-editorial text-[15px] font-medium text-[#D0D0D0]">
                        {ev.startTime} - {ev.endTime} {ev.timezone}
                      </p>
                      {ev.venueSubtitle && (
                        <p className="mt-5 font-serif-editorial text-sm font-semibold tracking-[0.26em] text-[#B8A88A] uppercase">
                          {ev.venueSubtitle}
                        </p>
                      )}
                      <p className="mt-1.5 font-serif-editorial text-[16px] font-semibold text-white">
                        {ev.venueName}
                      </p>
                      <p className="mt-1 font-serif-editorial text-sm leading-relaxed text-[#D0D0D0]">
                        {ev.address}
                      </p>
                      {ev.description && (
                        <p className="mt-2 font-serif-editorial text-xs italic text-[#A0A0A0]">
                          {ev.description}
                        </p>
                      )}
                      {ev.mapsUrl && (
                        <div className="mt-5">
                          <a
                            href={sanitizeExternalUrl(ev.mapsUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#303030] bg-white px-6 py-2.5 font-ui text-xs font-semibold text-black shadow-md transition-all hover:bg-[#B8A88A] hover:text-black whitespace-nowrap"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Buka Google MAPS</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Live Countdown Timer & Save The Date */}
              {vis.countdown && (
                <div className="mt-11 border-t border-[#303030]/80 pt-9">
                  <p className="font-serif-editorial text-base text-[#D0D0D0]">
                    {config.countdownTitle}
                  </p>

                  <div
                    data-testid="countdown-timer"
                    className="mt-4 grid grid-cols-4 gap-2"
                  >
                    {[
                      { label: 'Hari', value: countdown.days },
                      { label: 'Jam', value: countdown.hours },
                      { label: 'Menit', value: countdown.minutes },
                      { label: 'Detik', value: countdown.seconds },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-xl border border-[#303030] bg-[#171717]/95 px-1.5 py-3 shadow-inner"
                      >
                        <div className="font-mono-num text-xl font-semibold text-white">
                          {String(tile.value).padStart(2, '0')}
                        </div>
                        <div className="mt-0.5 font-serif-editorial text-xs text-[#A0A0A0]">
                          {tile.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {primaryEvent && (
                    <div className="mt-6 flex flex-col items-center gap-2.5">
                      <a
                        href={buildGoogleCalendarUrl(primaryEvent, coupleLabel, currentUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#303030] bg-white px-7 py-2.5 font-ui text-xs font-semibold text-black shadow-md transition-all hover:bg-[#B8A88A] whitespace-nowrap"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        <span>Simpan Tanggal</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleDownloadIcs}
                        className="inline-flex items-center gap-1.5 font-ui text-[11px] text-[#A0A0A0] underline-offset-4 transition-colors hover:text-white hover:underline cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Unduh File Kalender (.ics)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* 5. DIGITAL WEDDING GIFT & WEDDING FILTER (Asymmetric Left-Then-Right inside Gebyok Frame) */}
      {(vis.gift || vis.filter) && (
        <section id="section-gift">
          <GebyokFrame variant="section">
            <div className="space-y-14">
              {/* Left-aligned Kado Digital matching ref-sec-5.png */}
              {vis.gift && (
                <ScrollReveal direction="up" className="text-left">
                  <h2 className="font-script text-[38px] leading-tight text-[#B8A88A]">
                    Kado Digital
                  </h2>
                  <p className="mt-3 font-serif-editorial text-[15px] leading-relaxed text-[#D0D0D0]">
                    {config.giftDescription}
                  </p>

                  {/* Bank Accounts, E-Wallets & Shipping Address (Langsung Tampil) */}
                  <div
                    data-testid="digital-gift-list"
                    className="mt-6 space-y-3 rounded-2xl border border-[#303030] bg-[#171717]/95 p-4"
                  >
                    {gifts.map((gift) => (
                      <div
                        key={gift.id}
                        className="border-b border-[#262626] pb-3.5 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-ui text-xs font-semibold text-[#B8A88A]">
                              {gift.providerName}
                            </p>
                            <p className="mt-1 font-mono-num text-base font-medium tracking-wider text-white">
                              {gift.accountNumber}
                            </p>
                            <p className="mt-0.5 font-serif-editorial text-sm text-[#D0D0D0]">
                              a.n. {gift.accountHolder}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(gift.id, gift.accountNumber)}
                            aria-label={`Salin nomor ${gift.providerName}`}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#303030] bg-[#0D0D0D] px-3 py-1.5 font-ui text-[11px] font-medium text-white transition-colors hover:border-[#B8A88A] hover:text-[#B8A88A] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {copiedId === gift.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    {config.giftShippingAddress && (
                      <div className="border-t border-[#262626] pt-3.5">
                        <p className="font-ui text-[11px] font-semibold uppercase tracking-wider text-[#B8A88A]">
                          Alamat Pengiriman Kado
                        </p>
                        <p className="mt-1 font-serif-editorial text-sm font-medium text-white">
                          {config.giftShippingRecipient}
                        </p>
                        <p className="mt-0.5 font-serif-editorial text-sm text-[#D0D0D0]">
                          {config.giftShippingAddress}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopy('shipping-address', config.giftShippingAddress)}
                          className="mt-2 inline-flex items-center gap-1.5 font-ui text-[11px] text-[#B8A88A] hover:text-white cursor-pointer"
                        >
                          {copiedId === 'shipping-address' ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span>Alamat tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Salin Alamat</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Toggle QRIS di dalam Kado Digital (muncul hanya saat dibuka) */}
                    <div className="border-t border-[#262626] pt-3.5">
                      {!qrisOpen ? (
                        <button
                          type="button"
                          aria-expanded={qrisOpen}
                          onClick={() => setQrisOpen(true)}
                          className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#303030] bg-white px-6 py-2.5 font-ui text-xs font-semibold text-black shadow-md transition-all hover:bg-[#B8A88A] whitespace-nowrap cursor-pointer"
                        >
                          <Gift className="h-3.5 w-3.5" />
                          <span>Buka QRIS</span>
                        </button>
                      ) : (
                        <div className="relative mt-2 rounded-2xl border border-[#B8A88A]/45 bg-[#121212] p-5 text-center shadow-[0_14px_38px_rgba(0,0,0,0.75)]">
                          <button
                            type="button"
                            aria-label="Tutup QRIS"
                            onClick={() => setQrisOpen(false)}
                            className="absolute right-3.5 top-3.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-[#A0A0A0] transition-colors hover:bg-[#222222] hover:text-white cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>

                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#B8A88A]/35 bg-[#1C1914] text-[#B8A88A]">
                            <QrCode className="h-5 w-5" />
                          </div>

                          <h3 className="mt-2.5 font-serif-editorial text-xl font-semibold tracking-wide text-white">
                            QRIS Amplop Digital
                          </h3>
                          <p className="mx-auto mt-1 max-w-[265px] font-ui text-xs leading-relaxed text-[#A0A0A0]">
                            Scan melalui BCA, GoPay, OVO, Dana, ShopeePay, atau Mobile Banking apa
                            saja
                          </p>

                          <div className="mx-auto mt-4 inline-block rounded-2xl border border-dashed border-[#B8A88A]/65 bg-white p-3 shadow-inner">
                            <img
                              src="/media/qris.png"
                              alt="QRIS Amplop Digital Atas Nama Aldi & Alfina"
                              referrerPolicy="no-referrer"
                              className="max-h-[220px] w-auto rounded-lg object-contain"
                            />
                          </div>

                          <div className="mt-4">
                            <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0]">
                              Atas Nama
                            </p>
                            <p className="mt-1 font-serif-editorial text-lg font-semibold tracking-wider text-[#B8A88A]">
                              Aldi &amp; Alfina
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setQrisOpen(false)}
                            className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full border border-[#303030] bg-white px-6 py-2.5 font-ui text-xs font-semibold text-black shadow-md transition-all hover:bg-[#B8A88A] cursor-pointer"
                          >
                            <Gift className="h-3.5 w-3.5" />
                            <span>Tutup QRIS</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* Right-aligned Wedding Filter matching ref-sec-5.png */}
              {vis.filter && (
                <ScrollReveal direction="up" delayMs={100} className="text-right">
                  <h2 className="font-script text-[38px] leading-tight text-[#B8A88A]">
                    {config.filterTitle}
                  </h2>
                  <p className="mt-3 ml-auto max-w-[290px] font-serif-editorial text-[15px] leading-relaxed text-[#D0D0D0]">
                    {config.filterDescription}
                  </p>
                  <div className="mt-5 flex justify-end">
                    <a
                      href={sanitizeExternalUrl(config.filterInstagramUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#303030] bg-white px-7 py-2.5 font-ui text-xs font-semibold text-black shadow-md transition-all hover:bg-[#B8A88A] whitespace-nowrap"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Buka Filter</span>
                    </a>
                  </div>
                </ScrollReveal>
              )}
            </div>
          </GebyokFrame>
        </section>
      )}

      {/* 6. ASYMMETRIC EDITORIAL PRE-WEDDING GALLERY */}
      {vis.gallery && gallery.length > 0 && (
        <section id="section-gallery" className="bg-[#080808] p-2">
          <div className="space-y-2">
            {galleryPairs.map((pair, rowIndex) => {
              const leftSpan = rowIndex % 2 === 0 ? 'col-span-5' : 'col-span-7';
              const rightSpan = rowIndex % 2 === 0 ? 'col-span-7' : 'col-span-5';
              return (
                <div key={rowIndex} className="grid grid-cols-12 gap-2">
                  {pair.map((photo, colIdx) => {
                    const globalIdx = rowIndex * 2 + colIdx;
                    const spanClass = pair.length === 1 ? 'col-span-12' : colIdx === 0 ? leftSpan : rightSpan;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => onSelectGalleryIndex(globalIdx)}
                        aria-label={`Lihat foto galeri: ${photo.caption || `Foto ${globalIdx + 1}`}`}
                        className={`group relative ${spanClass} h-[210px] overflow-hidden bg-[#141414] focus-visible:outline-2 focus-visible:outline-[#B8A88A] cursor-pointer`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || `Galeri ${coupleLabel}`}
                          referrerPolicy="no-referrer"
                          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                            photo.monochrome ? 'grayscale contrast-110' : ''
                          }`}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* VIDEO PREWEDDING (Kontrol Tema Gelap-Emas + Tanpa Suara) */}
      <section id="section-video">
        <GebyokFrame variant="section">
          <ScrollReveal direction="up" className="text-center">
            <h2 className="font-script text-[38px] leading-tight text-[#B8A88A]">
              Pre-Wedding Film
            </h2>
            <p className="mt-2 font-serif-editorial text-[15px] leading-relaxed text-[#D0D0D0]">
              Cuplikan kisah perjalanan cinta {coupleLabel} sebelum hari bahagia.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[#303030] bg-[#141414] shadow-[0_14px_38px_rgba(0,0,0,0.8)]">
              <video
                ref={videoRef}
                src="/media/prewedding.mp4"
                poster={config.heroPhoto}
                muted
                playsInline
                preload="auto"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
                onError={() => {
                  setVideoError(
                    'Gagal memuat /media/prewedding.mp4. Pastikan file ada di folder public/media/ dan memakai format MP4 (H.264).'
                  );
                  setIsVideoPlaying(false);
                }}
                className="aspect-video w-full object-cover"
              >
                Browser Anda tidak mendukung pemutaran video.
              </video>

              <div className="flex items-center justify-between gap-2 border-t border-[#262626] bg-[#0D0D0D] px-4 py-3">
                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[#B8A88A]/60 bg-white px-4 py-1.5 font-ui text-xs font-semibold text-black transition-all hover:bg-[#B8A88A] cursor-pointer"
                >
                  {isVideoPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Jeda Video</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Putar Video</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRestartVideo}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#303030] bg-[#171717] px-3.5 py-1.5 font-ui text-[11px] font-medium text-[#D0D0D0] transition-colors hover:border-[#B8A88A] hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Ulangi</span>
                </button>
              </div>
            </div>

            {videoError && (
              <p role="alert" className="mt-3 font-ui text-xs text-red-400">
                {videoError}
              </p>
            )}
          </ScrollReveal>
        </GebyokFrame>
      </section>

      {/* 7. GUEST WISHES WALL (Over Full-Bleed Backdrop with Translucent Glass Panel matching ref-sec-6.png) */}
      {vis.wishes && (
        <section
          id="section-wishes"
          className="relative overflow-hidden bg-[#080808] px-5 py-14"
        >
          <img
            src={config.wishesBackdropPhoto}
            alt="Latar Ucapan dan Doa"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover opacity-65"
          />
          <div className="pointer-events-none absolute inset-0 bg-[#080808]/45" />

          <ScrollReveal direction="up">
            <div className="relative z-10 mx-auto rounded-3xl border border-[#303030] bg-[#0D0D0D]/86 p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-5 text-center">
                <h2 className="font-script text-[36px] leading-tight text-[#B8A88A]">
                  Ucapan &amp; Doa
                </h2>
                <p className="mt-1 font-ui text-xs text-[#A0A0A0]">
                  {wishes.length} ucapan terbaik dari keluarga &amp; sahabat
                </p>
              </div>

              <div
                data-testid="wishes-wall"
                className="max-h-[380px] space-y-3.5 overflow-y-auto pr-1"
              >
                {wishes.length === 0 ? (
                  <p className="py-10 text-center font-serif-editorial text-sm italic text-[#A0A0A0]">
                    Jadilah yang pertama mengirimkan doa restu untuk kedua mempelai.
                  </p>
                ) : (
                  wishes.map((wish) => (
                    <article
                      key={wish.id}
                      className="border-b border-[#242424] pb-3.5 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-serif-editorial text-base font-semibold text-white">
                          {wish.guestName}
                        </h3>
                        <span className="font-ui text-[11px] text-[#B8A88A] shrink-0">
                          {wish.attendance}
                        </span>
                      </div>
                      <p className="mt-1.5 font-serif-editorial text-[15px] leading-relaxed text-[#D0D0D0]">
                        {wish.message}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* 8. RSVP & UCAPAN FORM (Inside Gebyok Carved Frame matching ref-sec-7.png) */}
      {vis.rsvp && (
        <section id="section-rsvp">
          <GebyokFrame variant="section">
            <ScrollReveal direction="up">
              <div className="text-center">
                <h2 className="font-script text-[38px] leading-tight text-[#B8A88A]">
                  RSVP &amp; Ucapan
                </h2>
                <p className="mt-2 font-serif-editorial text-[15px] leading-relaxed text-[#D0D0D0]">
                  Dimohon kesediaannya untuk mengisi konfirmasi kehadiran dan ucapan untuk kedua
                  mempelai di bawah ini:
                </p>
              </div>

              <form onSubmit={handleRsvpSubmit} className="mt-7 space-y-4 text-left" noValidate>
                <div>
                  <label
                    htmlFor="rsvp-name"
                    className="block font-serif-editorial text-sm font-medium text-[#D0D0D0]"
                  >
                    Nama*
                  </label>
                  <input
                    id="rsvp-name"
                    type="text"
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    maxLength={120}
                    className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 font-ui text-sm text-white placeholder-[#707070] transition-colors focus:border-[#B8A88A] focus:outline-none"
                  />
                  {formErrors.guestName && (
                    <p className="mt-1 font-ui text-xs text-red-400">{formErrors.guestName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rsvp-attendance"
                    className="block font-serif-editorial text-sm font-medium text-[#D0D0D0]"
                  >
                    Konfirmasi Kehadiran*
                  </label>
                  <select
                    id="rsvp-attendance"
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value as '' | AttendanceStatus)}
                    className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 font-ui text-sm text-white transition-colors focus:border-[#B8A88A] focus:outline-none"
                  >
                    <option value="">-- Option --</option>
                    <option value="Hadir">Hadir</option>
                    <option value="Tidak Hadir">Tidak Hadir</option>
                  </select>
                  {formErrors.attendance && (
                    <p className="mt-1 font-ui text-xs text-red-400">{formErrors.attendance}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rsvp-count"
                    className="block font-serif-editorial text-sm font-medium text-[#D0D0D0]"
                  >
                    Jumlah Datang*
                  </label>
                  <select
                    id="rsvp-count"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 font-ui text-sm text-white transition-colors focus:border-[#B8A88A] focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Orang
                      </option>
                    ))}
                  </select>
                  {formErrors.attendeeCount && (
                    <p className="mt-1 font-ui text-xs text-red-400">{formErrors.attendeeCount}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rsvp-category"
                    className="block font-serif-editorial text-sm font-medium text-[#D0D0D0]"
                  >
                    Hubungan / Kategori
                  </label>
                  <select
                    id="rsvp-category"
                    value={relationshipCategory}
                    onChange={(e) => setRelationshipCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 font-ui text-sm text-white transition-colors focus:border-[#B8A88A] focus:outline-none"
                  >
                    <option value="">-- Pilih Hubungan / Kategori --</option>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rsvp-message"
                    className="block font-serif-editorial text-sm font-medium text-[#D0D0D0]"
                  >
                    Ucapan &amp; Doa
                  </label>
                  <textarea
                    id="rsvp-message"
                    rows={4}
                    value={wishMessage}
                    onChange={(e) => setWishMessage(e.target.value)}
                    placeholder="Tuliskan doa restu untuk kedua mempelai..."
                    maxLength={600}
                    className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 font-ui text-sm text-white placeholder-[#707070] transition-colors focus:border-[#B8A88A] focus:outline-none"
                  />
                  {formErrors.message && (
                    <p className="mt-1 font-ui text-xs text-red-400">{formErrors.message}</p>
                  )}
                </div>

                {submitSuccess && (
                  <div
                    role="status"
                    className="rounded-lg border border-emerald-800/70 bg-emerald-950/60 px-3.5 py-2.5 font-ui text-xs text-emerald-200"
                  >
                    {submitSuccess}
                  </div>
                )}
                {submitError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-800/70 bg-red-950/60 px-3.5 py-2.5 font-ui text-xs text-red-200"
                  >
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-[#B8A88A]/60 bg-white px-5 py-2.5 font-ui text-xs font-semibold tracking-[0.14em] text-black uppercase transition-all hover:bg-[#B8A88A] disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Mengirim...' : 'Kirim'}</span>
                </button>
              </form>
            </ScrollReveal>
          </GebyokFrame>
        </section>
      )}

      {/* 9. CLOSING THANK-YOU SECTION (Close-up Couple Backdrop + Translucent Arch Card matching ref-sec-8.png) */}
      {vis.closing && (
        <section
          id="section-closing"
          className="relative overflow-hidden bg-[#080808] px-5 pt-16 pb-20"
        >
          <img
            src={config.closingBackdropPhoto}
            alt="Latar Penutup Undangan"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          />
          <div className="pointer-events-none absolute inset-0 bg-[#080808]/45" />

          <ScrollReveal direction="up">
            <div className="relative z-10 mx-auto max-w-[376px] rounded-[150px] border border-[#303030] bg-[#0D0D0D]/86 px-9 py-24 text-center shadow-2xl backdrop-blur-sm">
              <p className="font-serif-editorial text-[14px] leading-relaxed text-[#D0D0D0]">
                {config.closingMessage}
              </p>
              <p className="mt-5 font-serif-editorial text-[15px] italic text-white">
                {config.closingSalam}
              </p>
              <p className="mt-6 font-serif-editorial text-xs text-[#A0A0A0]">
                {config.closingFamilyHeader}
              </p>
              <h2 className="mt-2 font-script text-[36px] leading-tight text-[#B8A88A]">
                {config.brideShortName} &amp; {config.groomShortName}
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#303030]/80 px-2 pt-5 text-[11px] text-[#D0D0D0]">
                <div className="text-left font-serif-editorial leading-snug">
                  <p>{config.brideFather}</p>
                  <p>&amp; {config.brideMother}</p>
                </div>
                <div className="text-right font-serif-editorial leading-snug">
                  <p>{config.groomFather}</p>
                  <p>&amp; {config.groomMother}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* 10. QR-CODE ATTENDANCE BAND WITH DOUBLE ORGANIC WAVES (matching ref-sec-8.png & ref-sec-9.png in Black Edition) */}
      {vis.qrCode && (
        <section id="section-qrcode" className="relative bg-[#000000]">
          {/* Top Double Organic Wave */}
          <div aria-hidden="true" className="-mt-10 overflow-hidden leading-none">
            <svg viewBox="0 0 430 56" className="block h-12 w-full" preserveAspectRatio="none">
              <path
                d="M0 32 C95 6, 175 48, 280 24 C345 10, 395 22, 430 34 L430 56 L0 56 Z"
                fill="#171717"
                opacity="0.7"
              />
              <path
                d="M0 40 C110 18, 215 52, 325 22 C375 10, 405 16, 430 24 L430 56 L0 56 Z"
                fill="#000000"
              />
            </svg>
          </div>

          <div className="px-7 py-14 text-center">
            <ScrollReveal direction="up">
              <h2 className="font-script text-[38px] leading-tight text-white">QR-Code</h2>
              {guestName && (
                <p className="mt-1 font-ui text-xs tracking-wider text-[#B8A88A] uppercase">
                  {guestName}
                </p>
              )}

              <div className="mt-6 flex justify-center">
                <div className="rounded-sm border border-[#303030] bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
                  <QrCodeCanvas
                    value={qrPayload}
                    size={184}
                    label={`QR Code Tamu ${guestName || 'Undangan'}`}
                  />
                </div>
              </div>

              <p className="mx-auto mt-6 max-w-[300px] font-serif-editorial text-sm leading-relaxed text-[#D0D0D0]">
                Please show this <strong className="text-white">QR-Code</strong> to the receptionist
                to be scanned as proof of your presence in the guestbook.
              </p>
            </ScrollReveal>
          </div>

          {/* Bottom Organic Wave into Closing Portrait Footer */}
          <div aria-hidden="true" className="-mb-10 relative z-20 overflow-hidden leading-none">
            <svg viewBox="0 0 430 56" className="block h-12 w-full" preserveAspectRatio="none">
              <path
                d="M0 0 L430 0 L430 28 C350 48, 255 10, 145 34 C80 48, 35 38, 0 24 Z"
                fill="#171717"
                opacity="0.65"
              />
              <path
                d="M0 0 L430 0 L430 18 C340 42, 240 4, 130 28 C72 40, 30 30, 0 18 Z"
                fill="#000000"
              />
            </svg>
          </div>
        </section>
      )}

      {/* 11. FINAL CLOSING COUPLE PORTRAIT & FOOTER (matching ref-sec-9.png) */}
      <footer className="relative flex min-h-[540px] flex-col justify-end overflow-hidden bg-[#080808]">
        <img
          src={config.footerCouplePhoto}
          alt={`Penutup ${coupleLabel}`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/55 to-transparent" />

        <div className="relative z-10 px-6 pb-10 pt-24 text-center">
          <p className="font-serif-editorial text-xs tracking-wider text-[#D0D0D0]">
            Website Invitation by
          </p>
          <p className="mt-1 font-serif-editorial text-3xl tracking-[0.14em] text-white">
            {config.footerBrand}
          </p>
          <p className="mt-1 font-mono-num text-xs text-[#A0A0A0]">{config.footerContact}</p>

          {showAdminButton && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#303030] bg-[#111111]/85 px-4 py-1.5 font-ui text-[11px] font-medium text-[#A0A0A0] transition-colors hover:border-[#B8A88A] hover:text-white cursor-pointer"
              >
                <Shield className="h-3 w-3" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </main>
  );
};
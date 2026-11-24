export interface SectionVisibility {
  cover: boolean;
  hero: boolean;
  verse: boolean;
  couple: boolean;
  events: boolean;
  countdown: boolean;
  gift: boolean;
  filter: boolean;
  gallery: boolean;
  wishes: boolean;
  rsvp: boolean;
  closing: boolean;
  qrCode: boolean;
}

export interface WeddingConfig {
  groomShortName: string;
  groomFullName: string;
  groomChildOrder: string;
  groomFather: string;
  groomMother: string;
  groomInstagram: string;
  brideShortName: string;
  brideFullName: string;
  brideChildOrder: string;
  brideFather: string;
  brideMother: string;
  brideInstagram: string;
  monogramLeft: string;
  monogramRight: string;
  weddingDateIso: string;
  heroDateDisplay: string;
  weddingTitle: string;
  weddingDescription: string;
  countdownTitle: string;
  verseArabic: string;
  verseTranslation: string;
  verseSurah: string;
  openingGreetingBismillah: string;
  openingGreetingSalam: string;
  openingGreetingBody: string;
  closingMessage: string;
  closingSalam: string;
  closingFamilyHeader: string;
  footerBrand: string;
  footerContact: string;
  giftDescription: string;
  giftShippingAddress: string;
  giftShippingRecipient: string;
  filterTitle: string;
  filterDescription: string;
  filterInstagramUrl: string;
  desktopSplitPhoto: string;
  heroPhoto: string;
  groomPhoto: string;
  bridePhoto: string;
  eventBackdropPhoto: string;
  wishesBackdropPhoto: string;
  closingBackdropPhoto: string;
  footerCouplePhoto: string;
  musicEnabled: boolean;
  musicAutoplayOnOpen: boolean;
  musicUrl: string;
  musicTitle: string;
  visibility: SectionVisibility;
  updatedAt?: string;
}

export interface WeddingEvent {
  id: string;
  title: string;
  dateLabel: string;
  isoDateTime: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueSubtitle: string;
  venueName: string;
  address: string;
  mapsUrl: string;
  description: string;
  sortOrder: number;
  createdAt?: string;
}

export interface DigitalGift {
  id: string;
  type: 'bank' | 'ewallet';
  providerName: string;
  accountNumber: string;
  accountHolder: string;
  description: string;
  sortOrder: number;
  createdAt?: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  aspect: 'portrait' | 'landscape';
  monochrome: boolean;
  sortOrder: number;
  createdAt?: string;
}

export type AttendanceStatus = 'Hadir' | 'Tidak Hadir';

export interface RsvpSubmission {
  id: string;
  guestName: string;
  attendance: AttendanceStatus;
  attendeeCount: number;
  message: string;
  guestSlug: string;
  createdAt: string;
}

export type WishStatus = 'approved' | 'pending' | 'rejected';

export interface GuestWish {
  id: string;
  guestName: string;
  attendance: AttendanceStatus;
  message: string;
  status: WishStatus;
  createdAt: string;
}

export interface GuestRecord {
  id: string;
  name: string;
  slug: string;
  group: string;
  phone: string;
  maxGuests: number;
  qrToken: string;
  checkedIn: boolean;
  createdAt: string;
}

export interface InvitationBundle {
  config: WeddingConfig;
  events: WeddingEvent[];
  gifts: DigitalGift[];
  gallery: GalleryPhoto[];
  wishes: GuestWish[];
}

export interface AdminBundle extends InvitationBundle {
  rsvps: RsvpSubmission[];
  allWishes: GuestWish[];
  guests: GuestRecord[];
}

export interface AdminStats {
  totalInvitations: number;
  totalGuestQuota: number;
  totalRsvps: number;
  confirmedRsvps: number;
  confirmedAttendees: number;
  declinedRsvps: number;
  totalWishes: number;
  approvedWishes: number;
  pendingWishes: number;
  totalQrRegistrations: number;
  checkedInCount: number;
}

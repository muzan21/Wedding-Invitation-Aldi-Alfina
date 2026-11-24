import type {
  AdminStats,
  AttendanceStatus,
  GuestRecord,
  GuestWish,
  RsvpSubmission,
  WeddingEvent,
} from '../types/wedding';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export function computeCountdown(targetIso: string, nowMs: number = Date.now()): CountdownParts {
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, isPast: false };
}

export function parseGuestNameFromSearch(search: string): string {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('to') || params.get('guest') || '';
    const cleaned = raw
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 100);
    return cleaned;
  } catch {
    return '';
  }
}

export function slugifyGuestName(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || 'tamu-undangan';
}

export function buildPersonalizedInviteUrl(origin: string, guestName: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const encoded = encodeURIComponent(guestName.trim());
  return `${cleanOrigin}/?to=${encoded}`;
}

export function generateDeterministicQrToken(guestName: string, uniqueSeed: string): string {
  const base = `${slugifyGuestName(guestName)}-${uniqueSeed}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const prefix = slugifyGuestName(guestName).slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GUEST';
  return `SMN-${prefix}-${hex}`;
}

export function buildGuestQrPayload(guestName: string, qrToken: string, weddingTitle: string): string {
  const safeName = (guestName.trim() || 'Tamu Undangan').slice(0, 100);
  const safeToken = (qrToken.trim() || generateDeterministicQrToken(safeName, 'PUBLIC')).slice(0, 80);
  const safeTitle = (weddingTitle.trim() || 'Simanten Black Edition').slice(0, 100);
  return JSON.stringify({
    event: safeTitle,
    guest: safeName,
    code: safeToken,
  });
}

export function sanitizeExternalUrl(url: string): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '#';
  } catch {
    return '#';
  }
}

function toGoogleCalendarStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

export function buildGoogleCalendarUrl(
  event: Pick<WeddingEvent, 'title' | 'isoDateTime' | 'venueName' | 'address'>,
  coupleLabel: string,
  inviteUrl: string
): string {
  const start = new Date(event.isoDateTime);
  const validStart = Number.isNaN(start.getTime()) ? new Date('2026-12-20T12:00:00Z') : start;
  const end = new Date(validStart.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `UNDANGAN PERNIKAHAN ${coupleLabel.toUpperCase()} — ${event.title}`,
    dates: `${toGoogleCalendarStamp(validStart)}/${toGoogleCalendarStamp(end)}`,
    details: `Undangan Digital: ${inviteUrl}`,
    location: `${event.venueName}, ${event.address}`,
  });
  return `https://www.google.com/calendar/event?${params.toString()}`;
}

export function buildIcsContent(
  event: Pick<WeddingEvent, 'title' | 'isoDateTime' | 'venueName' | 'address' | 'description'>,
  coupleLabel: string
): string {
  const start = new Date(event.isoDateTime);
  const validStart = Number.isNaN(start.getTime()) ? new Date('2026-12-20T12:00:00Z') : start;
  const end = new Date(validStart.getTime() + 2 * 60 * 60 * 1000);
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Simanten Black Edition//Wedding Invitation//ID',
    'BEGIN:VEVENT',
    `DTSTART:${toGoogleCalendarStamp(validStart)}`,
    `DTEND:${toGoogleCalendarStamp(end)}`,
    `SUMMARY:${esc(`Pernikahan ${coupleLabel} - ${event.title}`)}`,
    `LOCATION:${esc(`${event.venueName}, ${event.address}`)}`,
    `DESCRIPTION:${esc(event.description || `Undangan Pernikahan ${coupleLabel}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export interface RsvpValidationInput {
  guestName: string;
  attendance: string;
  attendeeCount: number;
  message: string;
}

export function validateRsvpInput(input: RsvpValidationInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const name = input.guestName.trim();
  if (!name) {
    errors.guestName = 'Nama wajib diisi.';
  } else if (name.length > 120) {
    errors.guestName = 'Nama maksimal 120 karakter.';
  }

  if (input.attendance !== 'Hadir' && input.attendance !== 'Tidak Hadir') {
    errors.attendance = 'Silakan pilih konfirmasi kehadiran.';
  }

  if (input.attendance === 'Hadir') {
    if (!Number.isInteger(input.attendeeCount) || input.attendeeCount < 1 || input.attendeeCount > 10) {
      errors.attendeeCount = 'Jumlah tamu harus antara 1 sampai 10 orang.';
    }
  }

  if (input.message.trim().length > 600) {
    errors.message = 'Ucapan maksimal 600 karakter.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function escapeCsvCell(value: string | number | boolean): string {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportRsvpsToCsv(rsvps: RsvpSubmission[]): string {
  const header = ['Nama Tamu', 'Kehadiran', 'Jumlah Tamu', 'Ucapan', 'Tanggal Kirim'];
  const rows = rsvps.map((r) => [
    escapeCsvCell(r.guestName),
    escapeCsvCell(r.attendance),
    escapeCsvCell(r.attendeeCount),
    escapeCsvCell(r.message),
    escapeCsvCell(r.createdAt),
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function exportGuestsToCsv(guests: GuestRecord[], origin: string): string {
  const header = ['Nama Tamu', 'Grup', 'Telepon', 'Kuota', 'QR Token', 'Status Check-In', 'Link Undangan'];
  const rows = guests.map((g) => [
    escapeCsvCell(g.name),
    escapeCsvCell(g.group),
    escapeCsvCell(g.phone),
    escapeCsvCell(g.maxGuests),
    escapeCsvCell(g.qrToken),
    escapeCsvCell(g.checkedIn ? 'Checked In' : 'Pending'),
    escapeCsvCell(buildPersonalizedInviteUrl(origin, g.name)),
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export interface ParsedGuestImport {
  name: string;
  group: string;
  phone: string;
  maxGuests: number;
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

export function parseGuestsCsv(csvText: string): ParsedGuestImport[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const firstCols = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader =
    firstCols[0]?.includes('nama') ||
    firstCols[0]?.includes('name') ||
    firstCols[0]?.includes('tamu');

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const parsed: ParsedGuestImport[] = [];
  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    const name = (cols[0] || '').trim().slice(0, 120);
    if (!name) continue;
    const group = (cols[1] || 'Umum').trim().slice(0, 80);
    const phone = (cols[2] || '').trim().slice(0, 40);
    const rawMax = Number.parseInt(cols[3] || '2', 10);
    const maxGuests = Number.isFinite(rawMax) ? Math.min(20, Math.max(1, rawMax)) : 2;
    parsed.push({ name, group, phone, maxGuests });
  }
  return parsed;
}

export function computeAdminStats(
  rsvps: RsvpSubmission[],
  wishes: GuestWish[],
  guests: GuestRecord[]
): AdminStats {
  const confirmed = rsvps.filter((r) => r.attendance === ('Hadir' as AttendanceStatus));
  const declined = rsvps.filter((r) => r.attendance === ('Tidak Hadir' as AttendanceStatus));
  const confirmedAttendees = confirmed.reduce((sum, r) => sum + (r.attendeeCount || 0), 0);
  const approvedWishes = wishes.filter((w) => w.status === 'approved').length;
  const pendingWishes = wishes.filter((w) => w.status === 'pending').length;
  const totalGuestQuota = guests.reduce((sum, g) => sum + (g.maxGuests || 1), 0);
  const checkedInCount = guests.filter((g) => g.checkedIn).length;

  return {
    totalInvitations: guests.length,
    totalGuestQuota,
    totalRsvps: rsvps.length,
    confirmedRsvps: confirmed.length,
    confirmedAttendees,
    declinedRsvps: declined.length,
    totalWishes: wishes.length,
    approvedWishes,
    pendingWishes,
    totalQrRegistrations: guests.filter((g) => Boolean(g.qrToken)).length,
    checkedInCount,
  };
}

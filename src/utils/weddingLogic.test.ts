import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleCalendarUrl,
  buildGuestQrPayload,
  buildIcsContent,
  buildPersonalizedInviteUrl,
  computeAdminStats,
  computeCountdown,
  exportRsvpsToCsv,
  generateDeterministicQrToken,
  parseGuestNameFromSearch,
  parseGuestsCsv,
  sanitizeExternalUrl,
  validateRsvpInput,
} from './weddingLogic';

test('computeCountdown calculates exact future remaining time', () => {
  const now = Date.parse('2026-12-10T10:00:00Z');
  const target = '2026-12-20T12:30:45Z';
  const result = computeCountdown(target, now);
  assert.equal(result.isPast, false);
  assert.equal(result.days, 10);
  assert.equal(result.hours, 2);
  assert.equal(result.minutes, 30);
  assert.equal(result.seconds, 45);
});

test('computeCountdown clamps past dates to zero', () => {
  const now = Date.parse('2026-12-25T00:00:00Z');
  const result = computeCountdown('2026-12-20T12:00:00Z', now);
  assert.equal(result.isPast, true);
  assert.equal(result.days, 0);
  assert.equal(result.hours, 0);
});

test('parseGuestNameFromSearch decodes and sanitizes personalized URL guest', () => {
  assert.equal(parseGuestNameFromSearch('?to=Saeful%20Muzani'), 'Saeful Muzani');
  assert.equal(parseGuestNameFromSearch('?to=<script>Budi</script>'), 'scriptBudi/script');
  assert.equal(parseGuestNameFromSearch(''), '');
});

test('buildPersonalizedInviteUrl & QR payload generate deterministic guest verification data', () => {
  const url = buildPersonalizedInviteUrl('https://wedding.example.com/', 'Saeful Muzani');
  assert.equal(url, 'https://wedding.example.com/?to=Saeful%20Muzani');

  const token1 = generateDeterministicQrToken('Saeful Muzani', 'G1');
  const token2 = generateDeterministicQrToken('Saeful Muzani', 'G1');
  assert.equal(token1, token2);
  assert.ok(token1.startsWith('SMN-'));

  const payload = JSON.parse(buildGuestQrPayload('Saeful Muzani', token1, 'Aliandra & Adinda'));
  assert.equal(payload.guest, 'Saeful Muzani');
  assert.equal(payload.code, token1);
});

test('sanitizeExternalUrl blocks javascript and data URLs', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), '#');
  assert.equal(sanitizeExternalUrl('data:text/html,hi'), '#');
  assert.equal(sanitizeExternalUrl('https://maps.app.goo.gl/abc'), 'https://maps.app.goo.gl/abc');
  assert.equal(sanitizeExternalUrl('/uploads/photo.jpg'), '/uploads/photo.jpg');
});

test('Google Calendar URL and ICS generation include event details', () => {
  const ev = {
    title: 'Resepsi',
    isoDateTime: '2026-12-20T12:00:00Z',
    venueName: 'Sheraton Grand Jakarta',
    address: 'Jl. Sultan Iskandar Muda',
    description: 'Resepsi Pernikahan',
  };
  const gcal = buildGoogleCalendarUrl(ev, 'Aliandra & Adinda', 'https://example.com');
  assert.ok(gcal.includes('google.com/calendar/event'));
  assert.ok(gcal.includes('20261220T120000Z'));

  const ics = buildIcsContent(ev, 'Aliandra & Adinda');
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('DTSTART:20261220T120000Z'));
});

test('validateRsvpInput catches missing required fields and invalid attendee counts', () => {
  const emptyRes = validateRsvpInput({ guestName: '', attendance: '', attendeeCount: 0, message: '' });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.guestName);
  assert.ok(emptyRes.errors.attendance);

  const okRes = validateRsvpInput({
    guestName: 'Saeful Muzani',
    attendance: 'Hadir',
    attendeeCount: 2,
    message: 'Selamat menempuh hidup baru!',
  });
  assert.equal(okRes.valid, true);

  const declinedRes = validateRsvpInput({
    guestName: 'Andi',
    attendance: 'Tidak Hadir',
    attendeeCount: 0,
    message: 'Doa terbaik',
  });
  assert.equal(declinedRes.valid, true);
});

test('CSV guest import and RSVP export neutralize formula injection and preserve quotes', () => {
  const imported = parseGuestsCsv('Nama,Grup,Telepon,Kuota\n"Budi, S.T.",VIP,08123456789,3\nSiti Rahma,Keluarga,,2');
  assert.equal(imported.length, 2);
  assert.equal(imported[0].name, 'Budi, S.T.');
  assert.equal(imported[0].maxGuests, 3);
  assert.equal(imported[1].group, 'Keluarga');

  const csv = exportRsvpsToCsv([
    {
      id: '1',
      guestName: '=CMD()',
      attendance: 'Hadir',
      attendeeCount: 2,
      message: 'Selamat, bahagia selalu!',
      guestSlug: 'cmd',
      createdAt: '2026-11-23T10:00:00Z',
    },
  ]);
  assert.ok(csv.includes("'=CMD()"));
  assert.ok(csv.includes('"Selamat, bahagia selalu!"'));
});

test('computeAdminStats aggregates RSVPs, wishes, and guest QR counts accurately', () => {
  const stats = computeAdminStats(
    [
      { id: '1', guestName: 'A', attendance: 'Hadir', attendeeCount: 2, message: '', guestSlug: 'a', createdAt: '' },
      { id: '2', guestName: 'B', attendance: 'Hadir', attendeeCount: 3, message: '', guestSlug: 'b', createdAt: '' },
      { id: '3', guestName: 'C', attendance: 'Tidak Hadir', attendeeCount: 0, message: '', guestSlug: 'c', createdAt: '' },
    ],
    [
      { id: 'w1', guestName: 'A', attendance: 'Hadir', message: 'Hi', status: 'approved', createdAt: '' },
      { id: 'w2', guestName: 'B', attendance: 'Hadir', message: 'Wait', status: 'pending', createdAt: '' },
    ],
    [
      { id: 'g1', name: 'A', slug: 'a', group: 'VIP', phone: '', maxGuests: 2, qrToken: 'SMN-1', checkedIn: true, createdAt: '' },
      { id: 'g2', name: 'B', slug: 'b', group: 'VIP', phone: '', maxGuests: 4, qrToken: 'SMN-2', checkedIn: false, createdAt: '' },
    ]
  );
  assert.equal(stats.totalInvitations, 2);
  assert.equal(stats.totalGuestQuota, 6);
  assert.equal(stats.totalRsvps, 3);
  assert.equal(stats.confirmedRsvps, 2);
  assert.equal(stats.confirmedAttendees, 5);
  assert.equal(stats.declinedRsvps, 1);
  assert.equal(stats.approvedWishes, 1);
  assert.equal(stats.pendingWishes, 1);
  assert.equal(stats.checkedInCount, 1);
});

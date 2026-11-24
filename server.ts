import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_WEDDING_BUNDLE } from './src/data/defaultWedding.ts';
import type {
  AdminBundle,
  DigitalGift,
  GalleryPhoto,
  GuestRecord,
  GuestWish,
  RsvpSubmission,
  WeddingConfig,
  WeddingEvent,
} from './src/types/wedding.ts';
import {
  generateDeterministicQrToken,
  parseGuestsCsv,
  slugifyGuestName,
  validateRsvpInput,
} from './src/utils/weddingLogic.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const UPLOADS_DIR = path.resolve(ROOT_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'wedding-store.json');
const AUTH_PATH = path.join(DATA_DIR, 'admin-auth.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- Persistent Store Helpers ---
function cloneDefault(): AdminBundle {
  return JSON.parse(JSON.stringify(DEFAULT_WEDDING_BUNDLE)) as AdminBundle;
}

function readStore(): AdminBundle {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const initial = cloneDefault();
      writeStore(initial);
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AdminBundle>;
    const defaults = cloneDefault();
    return {
      config: {
        ...defaults.config,
        ...(parsed.config || {}),
        visibility: {
          ...defaults.config.visibility,
          ...(parsed.config?.visibility || {}),
        },
      },
      events: Array.isArray(parsed.events) ? parsed.events : defaults.events,
      gifts: Array.isArray(parsed.gifts) ? parsed.gifts : defaults.gifts,
      gallery: Array.isArray(parsed.gallery) ? parsed.gallery : defaults.gallery,
      wishes: Array.isArray(parsed.allWishes)
        ? parsed.allWishes.filter((w) => w.status === 'approved')
        : defaults.wishes,
      allWishes: Array.isArray(parsed.allWishes) ? parsed.allWishes : defaults.allWishes,
      rsvps: Array.isArray(parsed.rsvps) ? parsed.rsvps : defaults.rsvps,
      guests: Array.isArray(parsed.guests) ? parsed.guests : defaults.guests,
    };
  } catch (err) {
    console.error('Failed to load wedding store, falling back to seed:', err);
    return cloneDefault();
  }
}

function writeStore(bundle: AdminBundle): void {
  const sanitized: AdminBundle = {
    ...bundle,
    wishes: bundle.allWishes.filter((w) => w.status === 'approved'),
  };
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(sanitized, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

// --- Secure Admin Authentication (scrypt hashing + Bearer session tokens in memory) ---
interface StoredAdminAuth {
  username: string;
  salt: string;
  hash: string;
  updatedAt: string;
}

interface SessionRecord {
  username: string;
  expiresAt: number;
}

const activeSessions = new Map<string, SessionRecord>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPasswordHash(password: string, salt: string, expectedHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function constantTimeStringMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function readAdminAuth(): StoredAdminAuth | null {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8')) as StoredAdminAuth;
    if (parsed && parsed.salt && parsed.hash && parsed.username) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeAdminAuth(record: StoredAdminAuth): void {
  const tmp = `${AUTH_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, AUTH_PATH);
}

function issueSessionToken(username: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Admin sign-in required.' });
    return;
  }
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    activeSessions.delete(token);
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  next();
}

function cleanString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function safeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

// --- Multer Upload Configuration ---
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const AUDIO_MIMES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']);

function createUploadMiddleware(allowedExts: Set<string>, allowedMimes: Set<string>, maxBytes: number) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = allowedExts.has(ext) ? ext : '';
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
        cb(null, filename);
      },
    }),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExts.has(ext) || !allowedMimes.has(file.mimetype)) {
        cb(new Error('Format file tidak didukung.'));
        return;
      }
      cb(null, true);
    },
  });
}

const imageUpload = createUploadMiddleware(IMAGE_EXTENSIONS, IMAGE_MIMES, 8 * 1024 * 1024);
const audioUpload = createUploadMiddleware(AUDIO_EXTENSIONS, AUDIO_MIMES, 15 * 1024 * 1024);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Serve uploaded files safely without directory listing or HTML execution
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    })
  );

  // --- PUBLIC ROUTES ---
  app.get('/api/public/invitation', (_req, res) => {
    const store = readStore();
    res.json({
      config: store.config,
      events: [...store.events].sort((a, b) => a.sortOrder - b.sortOrder),
      gifts: [...store.gifts].sort((a, b) => a.sortOrder - b.sortOrder),
      gallery: [...store.gallery].sort((a, b) => a.sortOrder - b.sortOrder),
      wishes: store.allWishes.filter((w) => w.status === 'approved'),
    });
  });

  app.get('/api/public/guest-lookup', (req, res) => {
    const name = cleanString(req.query.name, 120);
    if (!name) {
      res.json({ found: false });
      return;
    }
    const store = readStore();
    const targetSlug = slugifyGuestName(name);
    const match = store.guests.find(
      (g) => g.slug === targetSlug || g.name.toLowerCase() === name.toLowerCase()
    );
    if (!match) {
      res.json({
        found: false,
        name,
        qrToken: generateDeterministicQrToken(name, 'OPEN-INVITE'),
        maxGuests: 2,
      });
      return;
    }
    res.json({
      found: true,
      name: match.name,
      qrToken: match.qrToken,
      maxGuests: match.maxGuests,
      group: match.group,
    });
  });

  app.post('/api/public/rsvp', (req, res) => {
    const guestName = cleanString(req.body?.guestName, 120);
    const attendance = cleanString(req.body?.attendance, 32);
    const attendeeCount = attendance === 'Hadir' ? Number(req.body?.attendeeCount) : 0;
    const message = cleanString(req.body?.message, 600);

    const validation = validateRsvpInput({
      guestName,
      attendance,
      attendeeCount,
      message,
    });
    if (!validation.valid) {
      res.status(400).json({ error: 'Validasi gagal', errors: validation.errors });
      return;
    }

    const store = readStore();
    const now = new Date().toISOString();
    const rsvp: RsvpSubmission = {
      id: safeId('rsvp'),
      guestName,
      attendance: attendance as 'Hadir' | 'Tidak Hadir',
      attendeeCount,
      message,
      guestSlug: slugifyGuestName(guestName),
      createdAt: now,
    };
    store.rsvps.unshift(rsvp);

    let createdWish: GuestWish | null = null;
    if (message.length > 0) {
      createdWish = {
        id: safeId('wish'),
        guestName,
        attendance: attendance as 'Hadir' | 'Tidak Hadir',
        message,
        status: 'approved',
        createdAt: now,
      };
      store.allWishes.unshift(createdWish);
    }

    writeStore(store);
    res.status(201).json({ rsvp, wish: createdWish });
  });

  // --- ADMIN AUTH ROUTES ---
  app.get('/api/admin/auth/status', (req, res) => {
    const envPass = process.env.ADMIN_PASSWORD?.trim() || '';
    const stored = readAdminAuth();
    const token = getBearerToken(req);
    const session = token ? activeSessions.get(token) : undefined;
    const authenticated = Boolean(session && session.expiresAt > Date.now());
    res.json({
      needsSetup: !envPass && !stored,
      usesEnvOverride: Boolean(envPass),
      authenticated,
      username: authenticated ? session?.username : undefined,
    });
  });

  app.post('/api/admin/auth/setup', (req, res) => {
    const envPass = process.env.ADMIN_PASSWORD?.trim() || '';
    if (envPass) {
      res.status(403).json({ error: 'Admin password is managed by environment secrets.' });
      return;
    }
    if (readAdminAuth()) {
      res.status(409).json({ error: 'Admin account has already been initialized.' });
      return;
    }
    const username = cleanString(req.body?.username || 'admin', 64) || 'admin';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password minimal 8 karakter.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    writeAdminAuth({
      username,
      salt,
      hash,
      updatedAt: new Date().toISOString(),
    });
    const token = issueSessionToken(username);
    res.status(201).json({ token, username });
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const username = cleanString(req.body?.username || 'admin', 64) || 'admin';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const envPass = process.env.ADMIN_PASSWORD?.trim() || '';

    if (!password) {
      res.status(400).json({ error: 'Password wajib diisi.' });
      return;
    }

    if (envPass) {
      if (!constantTimeStringMatch(password, envPass)) {
        res.status(401).json({ error: 'Kredensial admin tidak valid.' });
        return;
      }
      const token = issueSessionToken(username);
      res.json({ token, username });
      return;
    }

    const stored = readAdminAuth();
    if (!stored) {
      res.status(409).json({ error: 'Akun admin belum diatur. Silakan buat password awal.' });
      return;
    }

    const userMatch = stored.username.toLowerCase() === username.toLowerCase();
    const passMatch = verifyPasswordHash(password, stored.salt, stored.hash);
    if (!userMatch || !passMatch) {
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }

    const token = issueSessionToken(stored.username);
    res.json({ token, username: stored.username });
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    const token = getBearerToken(req);
    if (token) activeSessions.delete(token);
    res.json({ ok: true });
  });

  app.post('/api/admin/auth/change-password', requireAdmin, (req, res) => {
    const envPass = process.env.ADMIN_PASSWORD?.trim() || '';
    if (envPass) {
      res.status(400).json({
        error: 'Password dikelola melalui environment variable ADMIN_PASSWORD.',
      });
      return;
    }
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
      return;
    }
    const stored = readAdminAuth();
    if (!stored || !verifyPasswordHash(currentPassword, stored.salt, stored.hash)) {
      res.status(401).json({ error: 'Password saat ini tidak sesuai.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);
    writeAdminAuth({
      username: stored.username,
      salt,
      hash,
      updatedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  });

  // --- PROTECTED ADMIN DATA ROUTES ---
  app.get('/api/admin/bundle', requireAdmin, (_req, res) => {
    res.json(readStore());
  });

  app.put('/api/admin/config', requireAdmin, (req, res) => {
    const store = readStore();
    const incoming = req.body as Partial<WeddingConfig>;
    store.config = {
      ...store.config,
      ...incoming,
      visibility: {
        ...store.config.visibility,
        ...(incoming.visibility || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    res.json(store.config);
  });

  // Events CRUD
  app.post('/api/admin/events', requireAdmin, (req, res) => {
    const store = readStore();
    const b = req.body || {};
    const title = cleanString(b.title, 100);
    const venueName = cleanString(b.venueName, 180);
    if (!title || !venueName) {
      res.status(400).json({ error: 'Judul acara dan nama lokasi wajib diisi.' });
      return;
    }
    const ev: WeddingEvent = {
      id: safeId('event'),
      title,
      dateLabel: cleanString(b.dateLabel, 100),
      isoDateTime: cleanString(b.isoDateTime, 64),
      startTime: cleanString(b.startTime, 32),
      endTime: cleanString(b.endTime, 32),
      timezone: cleanString(b.timezone || 'WIB', 16),
      venueSubtitle: cleanString(b.venueSubtitle, 140),
      venueName,
      address: cleanString(b.address, 400),
      mapsUrl: cleanString(b.mapsUrl, 500),
      description: cleanString(b.description, 500),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : store.events.length,
      createdAt: new Date().toISOString(),
    };
    store.events.push(ev);
    writeStore(store);
    res.status(201).json(ev);
  });

  app.put('/api/admin/events/:id', requireAdmin, (req, res) => {
    const store = readStore();
    const idx = store.events.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Acara tidak ditemukan.' });
      return;
    }
    const b = req.body || {};
    store.events[idx] = {
      ...store.events[idx],
      title: cleanString(b.title ?? store.events[idx].title, 100),
      dateLabel: cleanString(b.dateLabel ?? store.events[idx].dateLabel, 100),
      isoDateTime: cleanString(b.isoDateTime ?? store.events[idx].isoDateTime, 64),
      startTime: cleanString(b.startTime ?? store.events[idx].startTime, 32),
      endTime: cleanString(b.endTime ?? store.events[idx].endTime, 32),
      timezone: cleanString(b.timezone ?? store.events[idx].timezone, 16),
      venueSubtitle: cleanString(b.venueSubtitle ?? store.events[idx].venueSubtitle, 140),
      venueName: cleanString(b.venueName ?? store.events[idx].venueName, 180),
      address: cleanString(b.address ?? store.events[idx].address, 400),
      mapsUrl: cleanString(b.mapsUrl ?? store.events[idx].mapsUrl, 500),
      description: cleanString(b.description ?? store.events[idx].description, 500),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : store.events[idx].sortOrder,
    };
    writeStore(store);
    res.json(store.events[idx]);
  });

  app.delete('/api/admin/events/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.events = store.events.filter((e) => e.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Gifts CRUD
  app.post('/api/admin/gifts', requireAdmin, (req, res) => {
    const store = readStore();
    const b = req.body || {};
    const providerName = cleanString(b.providerName, 100);
    const accountNumber = cleanString(b.accountNumber, 60);
    const accountHolder = cleanString(b.accountHolder, 140);
    if (!providerName || !accountNumber || !accountHolder) {
      res.status(400).json({ error: 'Nama bank/e-wallet, nomor rekening, dan atas nama wajib diisi.' });
      return;
    }
    const gift: DigitalGift = {
      id: safeId('gift'),
      type: b.type === 'ewallet' ? 'ewallet' : 'bank',
      providerName,
      accountNumber,
      accountHolder,
      description: cleanString(b.description, 300),
      sortOrder: store.gifts.length,
      createdAt: new Date().toISOString(),
    };
    store.gifts.push(gift);
    writeStore(store);
    res.status(201).json(gift);
  });

  app.put('/api/admin/gifts/:id', requireAdmin, (req, res) => {
    const store = readStore();
    const idx = store.gifts.findIndex((g) => g.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Rekening tidak ditemukan.' });
      return;
    }
    const b = req.body || {};
    store.gifts[idx] = {
      ...store.gifts[idx],
      type: b.type === 'ewallet' ? 'ewallet' : 'bank',
      providerName: cleanString(b.providerName ?? store.gifts[idx].providerName, 100),
      accountNumber: cleanString(b.accountNumber ?? store.gifts[idx].accountNumber, 60),
      accountHolder: cleanString(b.accountHolder ?? store.gifts[idx].accountHolder, 140),
      description: cleanString(b.description ?? store.gifts[idx].description, 300),
    };
    writeStore(store);
    res.json(store.gifts[idx]);
  });

  app.delete('/api/admin/gifts/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.gifts = store.gifts.filter((g) => g.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Gallery CRUD
  app.post('/api/admin/gallery', requireAdmin, (req, res) => {
    const store = readStore();
    const b = req.body || {};
    const url = cleanString(b.url, 500);
    if (!url) {
      res.status(400).json({ error: 'URL foto wajib diisi.' });
      return;
    }
    const photo: GalleryPhoto = {
      id: safeId('gal'),
      url,
      caption: cleanString(b.caption, 200),
      aspect: b.aspect === 'landscape' ? 'landscape' : 'portrait',
      monochrome: Boolean(b.monochrome),
      sortOrder: store.gallery.length,
      createdAt: new Date().toISOString(),
    };
    store.gallery.push(photo);
    writeStore(store);
    res.status(201).json(photo);
  });

  app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.gallery = store.gallery.filter((p) => p.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // RSVPs Moderation
  app.delete('/api/admin/rsvps/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.rsvps = store.rsvps.filter((r) => r.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Wishes Moderation
  app.patch('/api/admin/wishes/:id', requireAdmin, (req, res) => {
    const store = readStore();
    const idx = store.allWishes.findIndex((w) => w.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Ucapan tidak ditemukan.' });
      return;
    }
    const status = req.body?.status;
    if (status === 'approved' || status === 'pending' || status === 'rejected') {
      store.allWishes[idx].status = status;
    }
    writeStore(store);
    res.json(store.allWishes[idx]);
  });

  app.delete('/api/admin/wishes/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.allWishes = store.allWishes.filter((w) => w.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Guests CRUD + CSV Import
  app.post('/api/admin/guests', requireAdmin, (req, res) => {
    const store = readStore();
    const b = req.body || {};
    const name = cleanString(b.name, 120);
    if (!name) {
      res.status(400).json({ error: 'Nama tamu wajib diisi.' });
      return;
    }
    const id = safeId('guest');
    const guest: GuestRecord = {
      id,
      name,
      slug: slugifyGuestName(name),
      group: cleanString(b.group || 'Umum', 80),
      phone: cleanString(b.phone, 40),
      maxGuests: Math.min(20, Math.max(1, Number(b.maxGuests) || 2)),
      qrToken: generateDeterministicQrToken(name, id),
      checkedIn: false,
      createdAt: new Date().toISOString(),
    };
    store.guests.unshift(guest);
    writeStore(store);
    res.status(201).json(guest);
  });

  app.post('/api/admin/guests/import-csv', requireAdmin, (req, res) => {
    const csvText = typeof req.body?.csv === 'string' ? req.body.csv : '';
    const parsed = parseGuestsCsv(csvText);
    if (parsed.length === 0) {
      res.status(400).json({ error: 'Tidak ada data tamu yang valid di CSV.' });
      return;
    }
    const store = readStore();
    const now = new Date().toISOString();
    const added: GuestRecord[] = parsed.slice(0, 500).map((row) => {
      const id = safeId('guest');
      return {
        id,
        name: row.name,
        slug: slugifyGuestName(row.name),
        group: row.group,
        phone: row.phone,
        maxGuests: row.maxGuests,
        qrToken: generateDeterministicQrToken(row.name, id),
        checkedIn: false,
        createdAt: now,
      };
    });
    store.guests = [...added, ...store.guests];
    writeStore(store);
    res.status(201).json({ imported: added.length, guests: added });
  });

  app.put('/api/admin/guests/:id', requireAdmin, (req, res) => {
    const store = readStore();
    const idx = store.guests.findIndex((g) => g.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Tamu tidak ditemukan.' });
      return;
    }
    const b = req.body || {};
    const name = cleanString(b.name ?? store.guests[idx].name, 120);
    store.guests[idx] = {
      ...store.guests[idx],
      name,
      slug: slugifyGuestName(name),
      group: cleanString(b.group ?? store.guests[idx].group, 80),
      phone: cleanString(b.phone ?? store.guests[idx].phone, 40),
      maxGuests: Math.min(20, Math.max(1, Number(b.maxGuests ?? store.guests[idx].maxGuests) || 2)),
      checkedIn: typeof b.checkedIn === 'boolean' ? b.checkedIn : store.guests[idx].checkedIn,
    };
    writeStore(store);
    res.json(store.guests[idx]);
  });

  app.delete('/api/admin/guests/:id', requireAdmin, (req, res) => {
    const store = readStore();
    store.guests = store.guests.filter((g) => g.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // File Uploads (Image & Audio) with strict path confinement
  app.post('/api/admin/upload/image', requireAdmin, (req, res) => {
    imageUpload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Gagal mengunggah gambar.';
        res.status(400).json({ error: message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'File gambar tidak ditemukan.' });
        return;
      }
      res.status(201).json({
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size,
      });
    });
  });

  app.post('/api/admin/upload/audio', requireAdmin, (req, res) => {
    audioUpload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Gagal mengunggah audio.';
        res.status(400).json({ error: message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'File audio tidak ditemukan.' });
        return;
      }
      res.status(201).json({
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    });
  });

  app.delete('/api/admin/uploads/:filename', requireAdmin, (req, res) => {
    const rawName = path.basename(String(req.params.filename || ''));
    const resolved = path.resolve(UPLOADS_DIR, rawName);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: 'Invalid file path.' });
      return;
    }
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
    res.json({ ok: true });
  });

  // --- VITE / STATIC FRONTEND MOUNTING ---
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Simanten Black Edition server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});

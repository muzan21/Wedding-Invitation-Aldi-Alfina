import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import localStore from '../../data/wedding-store.json';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AdminBundle,
  DigitalGift,
  GalleryPhoto,
  GuestRecord,
  GuestWish,
  InvitationBundle,
  RsvpSubmission,
  WeddingConfig,
  WeddingEvent,
  WishStatus,
} from '../types/wedding';
import { slugifyGuestName } from '../utils/weddingLogic';

// Session token held strictly in memory (never localStorage or sessionStorage)
let adminBearerToken: string | null = null;
const VERCEL_ADMIN_STORAGE_KEY = 'simanten_vercel_admin_account';

interface StoredVercelAdmin {
  username: string;
  password: string;
}

function readVercelAdminAccount(): StoredVercelAdmin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(VERCEL_ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredVercelAdmin;
    if (parsed?.username && parsed?.password) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeVercelAdminAccount(account: StoredVercelAdmin): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VERCEL_ADMIN_STORAGE_KEY, JSON.stringify(account));
}

export function setAdminToken(token: string | null): void {
  adminBearerToken = token;
}

export function getAdminToken(): string | null {
  return adminBearerToken;
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (adminBearerToken) {
    headers.Authorization = `Bearer ${adminBearerToken}`;
  }
  return headers;
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function normalizeAdminBundle(raw: Partial<AdminBundle> | null | undefined): AdminBundle {
  const fallbackStore = localStore as unknown as Partial<AdminBundle>;
  const source = raw || fallbackStore;

  const baseWishes = Array.isArray(source.wishes)
    ? source.wishes
    : Array.isArray(fallbackStore.wishes)
      ? fallbackStore.wishes
      : [];

  const baseAllWishes = Array.isArray(source.allWishes)
    ? source.allWishes
    : Array.isArray(fallbackStore.allWishes)
      ? fallbackStore.allWishes
      : baseWishes;

  return {
    config: (source.config || fallbackStore.config) as WeddingConfig,
    events: Array.isArray(source.events)
      ? source.events
      : Array.isArray(fallbackStore.events)
        ? fallbackStore.events
        : [],
    gifts: Array.isArray(source.gifts)
      ? source.gifts
      : Array.isArray(fallbackStore.gifts)
        ? fallbackStore.gifts
        : [],
    gallery: Array.isArray(source.gallery)
      ? source.gallery
      : Array.isArray(fallbackStore.gallery)
        ? fallbackStore.gallery
        : [],
    wishes: baseWishes,
    allWishes: baseAllWishes,
    rsvps: Array.isArray(source.rsvps)
      ? source.rsvps
      : Array.isArray(fallbackStore.rsvps)
        ? fallbackStore.rsvps
        : [],
    guests: Array.isArray(source.guests)
      ? source.guests
      : Array.isArray(fallbackStore.guests)
        ? fallbackStore.guests
        : [],
  };
}

// --- Public APIs ---
export async function fetchPublicInvitation(): Promise<InvitationBundle> {
  try {
    const res = await fetch('/api/public/invitation');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Abaikan jika di Vercel (server Express tidak aktif)
  }

  const store = localStore as unknown as InvitationBundle;
  let wishes: GuestWish[] = Array.isArray(store.wishes) ? store.wishes : [];

  try {
    const q = query(
      collection(db, 'wishes'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      wishes = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          guestName: data.guestName || 'Tamu Undangan',
          attendance: data.attendance || 'Hadir',
          message: data.message || '',
          status: 'approved',
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        };
      });
    }
  } catch {
    // Gunakan wishes bawaan dari store jika Firestore belum siap
  }

  return {
    config: store.config,
    events: Array.isArray(store.events) ? store.events : [],
    gifts: Array.isArray(store.gifts) ? store.gifts : [],
    gallery: Array.isArray(store.gallery) ? store.gallery : [],
    wishes,
  };
}

export async function lookupPublicGuest(name: string): Promise<{
  found: boolean;
  name?: string;
  qrToken?: string;
  maxGuests?: number;
  group?: string;
}> {
  try {
    const res = await fetch(`/api/public/guest-lookup?name=${encodeURIComponent(name)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback ke daftar tamu di wedding-store.json saat di Vercel
  }

  const guests = ((localStore as unknown as AdminBundle).guests || []) as GuestRecord[];
  const slug = slugifyGuestName(name);
  const found = guests.find((g) => slugifyGuestName(g.name) === slug);
  if (!found) return { found: false };
  return {
    found: true,
    name: found.name,
    qrToken: found.qrToken,
    maxGuests: found.maxGuests,
    group: found.group,
  };
}

export async function submitPublicRsvp(payload: {
  guestName: string;
  attendance: 'Hadir' | 'Tidak Hadir';
  attendeeCount: number;
  message: string;
}): Promise<{ rsvp: RsvpSubmission; wish: GuestWish | null }> {
  const nowIso = new Date().toISOString();
  const fallbackId = `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const guestSlug = slugifyGuestName(payload.guestName);

  let result: { rsvp: RsvpSubmission; wish: GuestWish | null } = {
    rsvp: {
      id: fallbackId,
      guestName: payload.guestName,
      guestSlug,
      attendance: payload.attendance,
      attendeeCount: payload.attendeeCount,
      message: payload.message,
      createdAt: nowIso,
    },
    wish: payload.message.trim()
      ? {
          id: `wish_${fallbackId}`,
          guestName: payload.guestName,
          attendance: payload.attendance,
          message: payload.message.trim(),
          status: 'approved',
          createdAt: nowIso,
        }
      : null,
  };

  try {
    const res = await fetch('/api/public/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      result = await parseJsonOrThrow<{ rsvp: RsvpSubmission; wish: GuestWish | null }>(res);
    }
  } catch {
    // Di Vercel langsung simpan ke Firestore di bawah ini
  }

  try {
    const rsvpRef = doc(collection(db, 'rsvps'), result.rsvp.id);
    await setDoc(rsvpRef, {
      guestName: result.rsvp.guestName,
      guestSlug: result.rsvp.guestSlug || guestSlug,
      attendance: result.rsvp.attendance,
      attendeeCount: result.rsvp.attendeeCount,
      message: result.rsvp.message,
      createdAt: serverTimestamp(),
    });
    if (result.wish) {
      const wishRef = doc(collection(db, 'wishes'), result.wish.id);
      await setDoc(wishRef, {
        guestName: result.wish.guestName,
        attendance: result.wish.attendance,
        message: result.wish.message,
        status: 'approved',
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, 'rsvps');
    } catch {
      // Handled gracefully
    }
  }

  return result;
}

// --- Admin Auth APIs ---
export interface AdminAuthStatus {
  needsSetup: boolean;
  usesEnvOverride: boolean;
  authenticated: boolean;
  username?: string;
}

export async function fetchAdminAuthStatus(): Promise<AdminAuthStatus> {
  const headers: Record<string, string> = {};
  if (adminBearerToken) {
    headers.Authorization = `Bearer ${adminBearerToken}`;
  }
  try {
    const res = await fetch('/api/admin/auth/status', { headers });
    if (res.ok) {
      return await parseJsonOrThrow<AdminAuthStatus>(res);
    }
  } catch {
    // Fallback ke mode Vercel saat server Express tidak berjalan
  }

  const savedAccount = readVercelAdminAccount();
  return {
    needsSetup: !savedAccount,
    usesEnvOverride: false,
    authenticated: Boolean(adminBearerToken),
    username: savedAccount?.username || 'admin',
  };
}

export async function setupAdminAccount(
  username: string,
  password: string
): Promise<{ token: string; username: string }> {
  try {
    const res = await fetch('/api/admin/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await parseJsonOrThrow<{ token: string; username: string }>(res);
      setAdminToken(data.token);
      return data;
    }
  } catch {
    // Fallback ke mode Vercel di bawah
  }

  const cleanUsername = username.trim() || 'admin';
  writeVercelAdminAccount({ username: cleanUsername, password });
  const token = `vercel_admin_${Date.now()}`;
  setAdminToken(token);
  return { token, username: cleanUsername };
}

export async function loginAdminAccount(
  username: string,
  password: string
): Promise<{ token: string; username: string }> {
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await parseJsonOrThrow<{ token: string; username: string }>(res);
      setAdminToken(data.token);
      return data;
    }
  } catch {
    // Fallback ke mode Vercel di bawah
  }

  const cleanUsername = username.trim() || 'admin';
  const savedAccount = readVercelAdminAccount();
  if (!savedAccount) {
    writeVercelAdminAccount({ username: cleanUsername, password });
    const token = `vercel_admin_${Date.now()}`;
    setAdminToken(token);
    return { token, username: cleanUsername };
  }

  if (savedAccount.username === cleanUsername && savedAccount.password === password) {
    const token = `vercel_admin_${Date.now()}`;
    setAdminToken(token);
    return { token, username: cleanUsername };
  }

  throw new Error('Username atau password admin tidak sesuai.');
}

export async function logoutAdminAccount(): Promise<void> {
  if (adminBearerToken) {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {});
  }
  setAdminToken(null);
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/admin/auth/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      return await parseJsonOrThrow<{ ok: boolean }>(res);
    }
  } catch {
    // Fallback ke mode Vercel di bawah
  }

  const savedAccount = readVercelAdminAccount();
  if (!savedAccount || savedAccount.password !== currentPassword) {
    throw new Error('Password saat ini tidak sesuai.');
  }
  writeVercelAdminAccount({ ...savedAccount, password: newPassword });
  return { ok: true };
}

// --- Protected Admin Data APIs ---
export async function fetchAdminBundle(): Promise<AdminBundle> {
  try {
    const res = await fetch('/api/admin/bundle', { headers: authHeaders() });
    if (res.ok) {
      const raw = await parseJsonOrThrow<Partial<AdminBundle>>(res);
      return normalizeAdminBundle(raw);
    }
  } catch {
    // Fallback ke data store lokal saat di Vercel
  }

  return normalizeAdminBundle(localStore as unknown as Partial<AdminBundle>);
}

export async function updateWeddingConfig(config: WeddingConfig): Promise<WeddingConfig> {
  try {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const saved = await parseJsonOrThrow<WeddingConfig>(res);
      if (auth.currentUser?.emailVerified) {
        try {
          await setDoc(doc(db, 'wedding', 'main'), {
            ...saved,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Primary backend persisted
        }
      }
      return saved;
    }
  } catch {
    // Fallback ke mode Vercel bila backend tidak aktif
  }

  return config;
}

export async function createWeddingEvent(
  event: Omit<WeddingEvent, 'id' | 'createdAt'>
): Promise<WeddingEvent> {
  const res = await fetch('/api/admin/events', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(event),
  });
  return parseJsonOrThrow<WeddingEvent>(res);
}

export async function updateWeddingEvent(
  id: string,
  event: Partial<WeddingEvent>
): Promise<WeddingEvent> {
  const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(event),
  });
  return parseJsonOrThrow<WeddingEvent>(res);
}

export async function deleteWeddingEvent(id: string): Promise<void> {
  const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJsonOrThrow(res);
}

export async function createDigitalGift(
  gift: Omit<DigitalGift, 'id' | 'createdAt' | 'sortOrder'>
): Promise<DigitalGift> {
  const res = await fetch('/api/admin/gifts', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(gift),
  });
  return parseJsonOrThrow<DigitalGift>(res);
}

export async function updateDigitalGift(
  id: string,
  gift: Partial<DigitalGift>
): Promise<DigitalGift> {
  const res = await fetch(`/api/admin/gifts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(gift),
  });
  return parseJsonOrThrow<DigitalGift>(res);
}

export async function deleteDigitalGift(id: string): Promise<void> {
  const res = await fetch(`/api/admin/gifts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJsonOrThrow(res);
}

export async function createGalleryPhoto(
  photo: Omit<GalleryPhoto, 'id' | 'createdAt' | 'sortOrder'>
): Promise<GalleryPhoto> {
  const res = await fetch('/api/admin/gallery', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(photo),
  });
  return parseJsonOrThrow<GalleryPhoto>(res);
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  const res = await fetch(`/api/admin/gallery/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJsonOrThrow(res);
}

export async function deleteRsvpRecord(id: string): Promise<void> {
  const res = await fetch(`/api/admin/rsvps/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJsonOrThrow(res);
}

export async function moderateWish(id: string, status: WishStatus): Promise<GuestWish> {
  const res = await fetch(`/api/admin/wishes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return parseJsonOrThrow<GuestWish>(res);
}

export async function deleteWishRecord(id: string): Promise<void> {
  const res = await fetch(`/api/admin/wishes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJsonOrThrow(res);
}

export async function createGuestRecord(guest: {
  name: string;
  group: string;
  phone: string;
  maxGuests: number;
}): Promise<GuestRecord> {
  const res = await fetch('/api/admin/guests', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(guest),
  });
  return parseJsonOrThrow<GuestRecord>(res);
}

export async function importGuestsFromCsv(
  csv: string
): Promise<{ imported: number; guests: GuestRecord[] }> {
  const res = await fetch('/api/admin/guests/import-csv', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ csv }),
  });
  return parseJsonOrThrow<{ imported: number; guests: GuestRecord[] }>(res);
}

export async function updateGuestRecord(
  id: string,
  guest: Partial<GuestRecord>
): Promise<GuestRecord> {
  const res = await fetch(`/api/admin/guests/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(guest),
  });
  return parseJsonOrThrow<GuestRecord>(res);
}

export async function deleteGuestRecord(id: string): Promise<void> {
  const res = await fetch(`/api/admin/guests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJsonOrThrow(res);
}

// Client-side image optimization (resize large uploads > 1600px cleanly before upload)
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 450 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1600;
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const targetMime = file.type === 'image/png' ? 'image/png' : 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const ext = targetMime === 'image/png' ? '.png' : '.webp';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}${ext}`, { type: targetMime }));
        },
        targetMime,
        0.86
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export async function uploadAdminImage(file: File): Promise<{ url: string; filename: string }> {
  const optimized = await compressImageIfNeeded(file);
  const form = new FormData();
  form.append('file', optimized);
  const headers: Record<string, string> = {};
  if (adminBearerToken) {
    headers.Authorization = `Bearer ${adminBearerToken}`;
  }
  const res = await fetch('/api/admin/upload/image', {
    method: 'POST',
    headers,
    body: form,
  });
  return parseJsonOrThrow<{ url: string; filename: string }>(res);
}

export async function uploadAdminAudio(
  file: File
): Promise<{ url: string; filename: string; originalName: string }> {
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  if (adminBearerToken) {
    headers.Authorization = `Bearer ${adminBearerToken}`;
  }
  const res = await fetch('/api/admin/upload/audio', {
    method: 'POST',
    headers,
    body: form,
  });
  return parseJsonOrThrow<{ url: string; filename: string; originalName: string }>(res);
}
import React, { useState } from 'react';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import type { DigitalGift, WeddingConfig, WeddingEvent } from '../../types/wedding';
import {
  createDigitalGift,
  createWeddingEvent,
  deleteDigitalGift,
  deleteWeddingEvent,
  updateDigitalGift,
  updateWeddingEvent,
} from '../../services/weddingApi';

interface EventsAndGiftsTabProps {
  mode: 'events' | 'gifts';
  config: WeddingConfig;
  events: WeddingEvent[];
  gifts: DigitalGift[];
  onSaveConfig: (next: WeddingConfig) => Promise<void>;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const EMPTY_EVENT: Omit<WeddingEvent, 'id' | 'createdAt'> = {
  title: '',
  dateLabel: '',
  isoDateTime: '2026-12-20T19:00:00+07:00',
  startTime: '19:00',
  endTime: '21:00',
  timezone: 'WIB',
  venueSubtitle: '',
  venueName: '',
  address: '',
  mapsUrl: '',
  description: '',
  sortOrder: 0,
};

const EMPTY_GIFT: Omit<DigitalGift, 'id' | 'createdAt' | 'sortOrder'> = {
  type: 'bank',
  providerName: '',
  accountNumber: '',
  accountHolder: '',
  description: '',
};

export const EventsAndGiftsTab: React.FC<EventsAndGiftsTabProps> = ({
  mode,
  config,
  events,
  gifts,
  onSaveConfig,
  onRefresh,
  onNotify,
}) => {
  // Event editor state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);

  // Gift editor state
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [giftForm, setGiftForm] = useState(EMPTY_GIFT);
  const [giftDesc, setGiftDesc] = useState(config.giftDescription);
  const [giftRecipient, setGiftRecipient] = useState(config.giftShippingRecipient);
  const [giftAddress, setGiftAddress] = useState(config.giftShippingAddress);

  const inputCls =
    'mt-1 w-full rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none';

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEventId) {
        await updateWeddingEvent(editingEventId, eventForm);
        onNotify('Jadwal acara diperbarui.');
      } else {
        await createWeddingEvent({ ...eventForm, sortOrder: events.length });
        onNotify('Acara baru ditambahkan.');
      }
      setEditingEventId(null);
      setEventForm(EMPTY_EVENT);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menyimpan acara.', true);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteWeddingEvent(id);
      await onRefresh();
      onNotify('Acara dihapus.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus acara.', true);
    }
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGiftId) {
        await updateDigitalGift(editingGiftId, giftForm);
        onNotify('Rekening kado digital diperbarui.');
      } else {
        await createDigitalGift(giftForm);
        onNotify('Rekening kado digital ditambahkan.');
      }
      setEditingGiftId(null);
      setGiftForm(EMPTY_GIFT);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menyimpan rekening.', true);
    }
  };

  const handleDeleteGift = async (id: string) => {
    try {
      await deleteDigitalGift(id);
      await onRefresh();
      onNotify('Rekening kado digital dihapus.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus rekening.', true);
    }
  };

  const handleSaveGiftMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig({
      ...config,
      giftDescription: giftDesc,
      giftShippingRecipient: giftRecipient,
      giftShippingAddress: giftAddress,
    });
  };

  if (mode === 'events') {
    return (
      <div className="space-y-8">
        <div className="border-b border-[#242424] pb-6">
          <h2 className="text-2xl font-semibold text-white">Manajemen Acara Pernikahan</h2>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            Kelola jadwal Akad Nikah, Resepsi, alamat lengkap, dan tautan Google Maps.
          </p>
        </div>

        {/* Event Form */}
        <form onSubmit={handleSaveEvent} className="space-y-4 border border-[#303030] bg-[#111111] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#B8A88A]">
              {editingEventId ? 'Edit Acara' : 'Tambah Acara Baru'}
            </h3>
            {editingEventId && (
              <button
                type="button"
                onClick={() => {
                  setEditingEventId(null);
                  setEventForm(EMPTY_EVENT);
                }}
                className="inline-flex items-center gap-1 text-xs text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Batal Edit</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs text-[#D0D0D0]">Nama Acara*</label>
              <input
                type="text"
                required
                placeholder="Akad Nikah / Resepsi"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">Hari &amp; Tanggal Tampilan*</label>
              <input
                type="text"
                required
                placeholder="Minggu, 20 Desember 2026"
                value={eventForm.dateLabel}
                onChange={(e) => setEventForm({ ...eventForm, dateLabel: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">ISO Tanggal/Waktu (Kalender)</label>
              <input
                type="text"
                placeholder="2026-12-20T19:00:00+07:00"
                value={eventForm.isoDateTime}
                onChange={(e) => setEventForm({ ...eventForm, isoDateTime: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="text-xs text-[#D0D0D0]">Jam Mulai*</label>
              <input
                type="text"
                required
                value={eventForm.startTime}
                onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">Jam Selesai*</label>
              <input
                type="text"
                required
                value={eventForm.endTime}
                onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">Zona Waktu</label>
              <input
                type="text"
                value={eventForm.timezone}
                onChange={(e) => setEventForm({ ...eventForm, timezone: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">Sub-Lokasi (misal BALLROOM 3)</label>
              <input
                type="text"
                value={eventForm.venueSubtitle}
                onChange={(e) => setEventForm({ ...eventForm, venueSubtitle: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-[#D0D0D0]">Nama Gedung / Hotel*</label>
              <input
                type="text"
                required
                value={eventForm.venueName}
                onChange={(e) => setEventForm({ ...eventForm, venueName: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">URL Google Maps</label>
              <input
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                value={eventForm.mapsUrl}
                onChange={(e) => setEventForm({ ...eventForm, mapsUrl: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-[#D0D0D0]">Alamat Lengkap*</label>
              <input
                type="text"
                required
                value={eventForm.address}
                onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-[#D0D0D0]">Catatan / Deskripsi</label>
              <input
                type="text"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#B8A88A] cursor-pointer"
          >
            {editingEventId ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{editingEventId ? 'Simpan Perubahan Acara' : 'Tambah Acara'}</span>
          </button>
        </form>

        {/* Events List */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {events.map((ev) => (
            <div key={ev.id} className="border border-[#303030] bg-[#111111] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif-editorial text-xl font-semibold text-white">
                    {ev.title}
                  </h4>
                  <p className="mt-1 text-xs text-[#B8A88A]">
                    {ev.dateLabel} · {ev.startTime} - {ev.endTime} {ev.timezone}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Edit acara ${ev.title}`}
                    onClick={() => {
                      setEditingEventId(ev.id);
                      setEventForm({
                        title: ev.title,
                        dateLabel: ev.dateLabel,
                        isoDateTime: ev.isoDateTime,
                        startTime: ev.startTime,
                        endTime: ev.endTime,
                        timezone: ev.timezone,
                        venueSubtitle: ev.venueSubtitle,
                        venueName: ev.venueName,
                        address: ev.address,
                        mapsUrl: ev.mapsUrl,
                        description: ev.description,
                        sortOrder: ev.sortOrder,
                      });
                    }}
                    className="rounded border border-[#303030] bg-[#171717] p-2 text-[#D0D0D0] hover:border-[#B8A88A] hover:text-white cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus acara ${ev.title}`}
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="rounded border border-[#303030] bg-[#171717] p-2 text-[#A0A0A0] hover:border-red-800 hover:text-red-300 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-white">{ev.venueName}</p>
              <p className="mt-0.5 text-xs text-[#A0A0A0]">{ev.address}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Digital Gifts Mode
  return (
    <div className="space-y-8">
      <div className="border-b border-[#242424] pb-6">
        <h2 className="text-2xl font-semibold text-white">Manajemen Kado Digital</h2>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Atur daftar rekening bank, e-wallet, dan alamat pengiriman kado fisik.
        </p>
      </div>

      {/* Gift Description & Shipping Address */}
      <form onSubmit={handleSaveGiftMeta} className="space-y-4 border border-[#303030] bg-[#111111] p-6">
        <h3 className="text-sm font-semibold text-[#B8A88A]">Teks Pengantar &amp; Alamat Kado</h3>
        <div>
          <label className="text-xs text-[#D0D0D0]">Pesan Kado Digital</label>
          <textarea
            rows={2}
            value={giftDesc}
            onChange={(e) => setGiftDesc(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-[#D0D0D0]">Nama Penerima Kado</label>
            <input
              type="text"
              value={giftRecipient}
              onChange={(e) => setGiftRecipient(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-[#D0D0D0]">Alamat Pengiriman Kado</label>
            <input
              type="text"
              value={giftAddress}
              onChange={(e) => setGiftAddress(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-[#303030] bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:border-[#B8A88A] cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Simpan Info Kado</span>
        </button>
      </form>

      {/* Add / Edit Bank or E-Wallet */}
      <form onSubmit={handleSaveGift} className="space-y-4 border border-[#303030] bg-[#111111] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#B8A88A]">
            {editingGiftId ? 'Edit Rekening / E-Wallet' : 'Tambah Rekening Bank atau E-Wallet'}
          </h3>
          {editingGiftId && (
            <button
              type="button"
              onClick={() => {
                setEditingGiftId(null);
                setGiftForm(EMPTY_GIFT);
              }}
              className="text-xs text-[#A0A0A0] hover:text-white cursor-pointer"
            >
              Batal
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs text-[#D0D0D0]">Tipe</label>
            <select
              value={giftForm.type}
              onChange={(e) => setGiftForm({ ...giftForm, type: e.target.value as 'bank' | 'ewallet' })}
              className={inputCls}
            >
              <option value="bank">Bank Transfer</option>
              <option value="ewallet">E-Wallet</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#D0D0D0]">Nama Bank / E-Wallet*</label>
            <input
              type="text"
              required
              placeholder="BCA / Mandiri / GoPay"
              value={giftForm.providerName}
              onChange={(e) => setGiftForm({ ...giftForm, providerName: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-[#D0D0D0]">Nomor Rekening / HP*</label>
            <input
              type="text"
              required
              value={giftForm.accountNumber}
              onChange={(e) => setGiftForm({ ...giftForm, accountNumber: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-[#D0D0D0]">Atas Nama*</label>
            <input
              type="text"
              required
              value={giftForm.accountHolder}
              onChange={(e) => setGiftForm({ ...giftForm, accountHolder: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] cursor-pointer"
        >
          {editingGiftId ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span>{editingGiftId ? 'Perbarui Rekening' : 'Tambah Rekening'}</span>
        </button>
      </form>

      {/* Gift Accounts List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gifts.map((g) => (
          <div key={g.id} className="border border-[#303030] bg-[#111111] p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#A0A0A0]">
                  {g.type === 'bank' ? 'Rekening Bank' : 'Dompet Digital'}
                </p>
                <h4 className="mt-0.5 text-sm font-semibold text-[#B8A88A]">{g.providerName}</h4>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={`Edit rekening ${g.providerName}`}
                  onClick={() => {
                    setEditingGiftId(g.id);
                    setGiftForm({
                      type: g.type,
                      providerName: g.providerName,
                      accountNumber: g.accountNumber,
                      accountHolder: g.accountHolder,
                      description: g.description,
                    });
                  }}
                  className="rounded border border-[#303030] bg-[#171717] p-1.5 text-[#D0D0D0] hover:border-[#B8A88A] cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Hapus rekening ${g.providerName}`}
                  onClick={() => handleDeleteGift(g.id)}
                  className="rounded border border-[#303030] bg-[#171717] p-1.5 text-[#A0A0A0] hover:border-red-800 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-3 font-mono-num text-base font-semibold text-white">
              {g.accountNumber}
            </p>
            <p className="mt-1 text-xs text-[#D0D0D0]">a.n. {g.accountHolder}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

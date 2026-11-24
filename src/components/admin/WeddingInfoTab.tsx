import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import type { WeddingConfig } from '../../types/wedding';

interface WeddingInfoTabProps {
  config: WeddingConfig;
  onSaveConfig: (next: WeddingConfig) => Promise<void>;
}

export const WeddingInfoTab: React.FC<WeddingInfoTabProps> = ({ config, onSaveConfig }) => {
  const [form, setForm] = useState<WeddingConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const setField = <K extends keyof WeddingConfig>(key: K, value: WeddingConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveConfig(form);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none';
  const labelCls = 'block text-xs font-medium text-[#D0D0D0]';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Informasi Pernikahan &amp; Mempelai</h2>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            Semua perubahan langsung diperbarui pada halaman undangan publik.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-white px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#B8A88A] disabled:opacity-50 whitespace-nowrap cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      {/* Couple Profiles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 border border-[#303030] bg-[#111111] p-6">
          <h3 className="text-sm font-semibold text-[#B8A88A]">Mempelai Pria</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nama Panggilan</label>
              <input
                type="text"
                value={form.groomShortName}
                onChange={(e) => setField('groomShortName', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Inisial Monogram Kiri</label>
              <input
                type="text"
                maxLength={2}
                value={form.monogramLeft}
                onChange={(e) => setField('monogramLeft', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Nama Lengkap Mempelai Pria</label>
            <input
              type="text"
              value={form.groomFullName}
              onChange={(e) => setField('groomFullName', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Urutan Anak</label>
            <input
              type="text"
              value={form.groomChildOrder}
              onChange={(e) => setField('groomChildOrder', e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Nama Ayah</label>
              <input
                type="text"
                value={form.groomFather}
                onChange={(e) => setField('groomFather', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nama Ibu</label>
              <input
                type="text"
                value={form.groomMother}
                onChange={(e) => setField('groomMother', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Link Instagram Mempelai Pria</label>
            <input
              type="url"
              value={form.groomInstagram}
              onChange={(e) => setField('groomInstagram', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-4 border border-[#303030] bg-[#111111] p-6">
          <h3 className="text-sm font-semibold text-[#B8A88A]">Mempelai Wanita</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nama Panggilan</label>
              <input
                type="text"
                value={form.brideShortName}
                onChange={(e) => setField('brideShortName', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Inisial Monogram Kanan</label>
              <input
                type="text"
                maxLength={2}
                value={form.monogramRight}
                onChange={(e) => setField('monogramRight', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Nama Lengkap Mempelai Wanita</label>
            <input
              type="text"
              value={form.brideFullName}
              onChange={(e) => setField('brideFullName', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Urutan Anak</label>
            <input
              type="text"
              value={form.brideChildOrder}
              onChange={(e) => setField('brideChildOrder', e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Nama Ayah</label>
              <input
                type="text"
                value={form.brideFather}
                onChange={(e) => setField('brideFather', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nama Ibu</label>
              <input
                type="text"
                value={form.brideMother}
                onChange={(e) => setField('brideMother', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Link Instagram Mempelai Wanita</label>
            <input
              type="url"
              value={form.brideInstagram}
              onChange={(e) => setField('brideInstagram', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Main Wedding Date & Countdown Target */}
      <div className="space-y-4 border border-[#303030] bg-[#111111] p-6">
        <h3 className="text-sm font-semibold text-[#B8A88A]">Tanggal Utama &amp; Countdown</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>Target Countdown (ISO Date &amp; Time)</label>
            <input
              type="text"
              value={form.weddingDateIso}
              onChange={(e) => setField('weddingDateIso', e.target.value)}
              placeholder="2026-12-20T19:00:00+07:00"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tampilan Tanggal di Hero</label>
            <input
              type="text"
              value={form.heroDateDisplay}
              onChange={(e) => setField('heroDateDisplay', e.target.value)}
              placeholder="20 . 12 . 2026"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Judul Hitung Mundur</label>
            <input
              type="text"
              value={form.countdownTitle}
              onChange={(e) => setField('countdownTitle', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>Judul Undangan (Meta &amp; QR)</label>
            <input
              type="text"
              value={form.weddingTitle}
              onChange={(e) => setField('weddingTitle', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Deskripsi Singkat Undangan</label>
            <input
              type="text"
              value={form.weddingDescription}
              onChange={(e) => setField('weddingDescription', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Quranic Verse */}
      <div className="space-y-4 border border-[#303030] bg-[#111111] p-6">
        <h3 className="text-sm font-semibold text-[#B8A88A]">Ayat Suci Al-Qur&apos;an</h3>
        <div>
          <label className={labelCls}>Teks Arab</label>
          <textarea
            dir="rtl"
            rows={3}
            value={form.verseArabic}
            onChange={(e) => setField('verseArabic', e.target.value)}
            className={`${inputCls} font-arabic text-lg`}
          />
        </div>
        <div>
          <label className={labelCls}>Terjemahan Bahasa Indonesia</label>
          <textarea
            rows={3}
            value={form.verseTranslation}
            onChange={(e) => setField('verseTranslation', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Nama Surah &amp; Ayat</label>
          <input
            type="text"
            value={form.verseSurah}
            onChange={(e) => setField('verseSurah', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Greeting, Wedding Filter, Closing & Footer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 border border-[#303030] bg-[#111111] p-6">
          <h3 className="text-sm font-semibold text-[#B8A88A]">Salam Pembuka &amp; Penutup</h3>
          <div>
            <label className={labelCls}>Bismillah</label>
            <input
              type="text"
              value={form.openingGreetingBismillah}
              onChange={(e) => setField('openingGreetingBismillah', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Salam Pembuka</label>
            <input
              type="text"
              value={form.openingGreetingSalam}
              onChange={(e) => setField('openingGreetingSalam', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Kalimat Pengantar Mempelai</label>
            <textarea
              rows={2}
              value={form.openingGreetingBody}
              onChange={(e) => setField('openingGreetingBody', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Pesan Terima Kasih (Penutup)</label>
            <textarea
              rows={3}
              value={form.closingMessage}
              onChange={(e) => setField('closingMessage', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Salam Penutup</label>
            <input
              type="text"
              value={form.closingSalam}
              onChange={(e) => setField('closingSalam', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-4 border border-[#303030] bg-[#111111] p-6">
          <h3 className="text-sm font-semibold text-[#B8A88A]">Wedding Filter &amp; Footer</h3>
          <div>
            <label className={labelCls}>Judul Wedding Filter</label>
            <input
              type="text"
              value={form.filterTitle}
              onChange={(e) => setField('filterTitle', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Deskripsi Filter</label>
            <textarea
              rows={2}
              value={form.filterDescription}
              onChange={(e) => setField('filterDescription', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>URL Instagram Wedding Filter</label>
            <input
              type="url"
              value={form.filterInstagramUrl}
              onChange={(e) => setField('filterInstagramUrl', e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Brand Footer</label>
              <input
                type="text"
                value={form.footerBrand}
                onChange={(e) => setField('footerBrand', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kontak Footer</label>
              <input
                type="text"
                value={form.footerContact}
                onChange={(e) => setField('footerContact', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

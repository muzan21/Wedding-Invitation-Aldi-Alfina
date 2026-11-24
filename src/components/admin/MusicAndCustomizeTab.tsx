import React, { useEffect, useState } from 'react';
import { Music, Save, Upload } from 'lucide-react';
import type { SectionVisibility, WeddingConfig } from '../../types/wedding';
import { uploadAdminAudio } from '../../services/weddingApi';

interface MusicAndCustomizeTabProps {
  mode: 'music' | 'customize';
  config: WeddingConfig;
  onSaveConfig: (next: WeddingConfig) => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const SECTION_TOGGLES: { key: keyof SectionVisibility; label: string; desc: string }[] = [
  { key: 'cover', label: 'Halaman Cover (Buka Undangan)', desc: 'Layar pembuka dengan monogram dan nama tamu.' },
  { key: 'hero', label: 'Hero Utama', desc: 'Foto utama mempelai, nama, tanggal, dan Swipe Up.' },
  { key: 'verse', label: 'Ayat Suci Al-Qur’an', desc: 'Bagian kutipan QS. Ar-Rum: 21 dan terjemahan.' },
  { key: 'couple', label: 'Profil Mempelai', desc: 'Foto oval, nama lengkap, orang tua, dan Instagram.' },
  { key: 'events', label: 'Detail Acara (Akad & Resepsi)', desc: 'Jadwal acara, lokasi, alamat, dan tombol Google Maps.' },
  { key: 'countdown', label: 'Hitung Mundur & Simpan Tanggal', desc: 'Timer hitung mundur real-time dan tambah ke kalender.' },
  { key: 'gift', label: 'Kado Digital', desc: 'Rekening bank, e-wallet, tombol salin, dan alamat pengiriman.' },
  { key: 'filter', label: 'Wedding Filter Instagram', desc: 'Tautan filter Instagram pernikahan.' },
  { key: 'gallery', label: 'Galeri Foto Pre-Wedding', desc: 'Grid foto asimetris dengan lightbox.' },
  { key: 'wishes', label: 'Dinding Ucapan & Doa', desc: 'Daftar ucapan tamu yang disetujui.' },
  { key: 'rsvp', label: 'Formulir RSVP & Ucapan', desc: 'Formulir konfirmasi kehadiran dan kirim ucapan.' },
  { key: 'closing', label: 'Bagian Penutup & Keluarga', desc: 'Ucapan terima kasih dan nama kedua keluarga besar.' },
  { key: 'qrCode', label: 'QR-Code Buku Tamu', desc: 'Kode QR unik per tamu untuk verifikasi resepsionis.' },
];

export const MusicAndCustomizeTab: React.FC<MusicAndCustomizeTabProps> = ({
  mode,
  config,
  onSaveConfig,
  onNotify,
}) => {
  const [form, setForm] = useState<WeddingConfig>(config);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleAudioUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAudio(true);
    try {
      const uploaded = await uploadAdminAudio(file);
      const next = {
        ...form,
        musicUrl: uploaded.url,
        musicTitle: uploaded.originalName.replace(/\.[^.]+$/, ''),
        musicEnabled: true,
      };
      setForm(next);
      await onSaveConfig(next);
      onNotify('Musik latar berhasil diunggah.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengunggah audio.', true);
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveConfig(form);
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'music') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">Manajemen Musik Latar</h2>
            <p className="mt-1 text-sm text-[#A0A0A0]">
              Unggah file MP3/WAV/OGG/M4A atau gunakan melodi ambient bawaan. Musik mulai diputar
              setelah interaksi tamu (mematuhi kebijakan autoplay browser).
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Musik'}</span>
          </button>
        </div>

        <div className="space-y-6 border border-[#303030] bg-[#111111] p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between border border-[#262626] bg-[#171717] px-4 py-3.5 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Aktifkan Musik Latar</p>
                <p className="text-xs text-[#A0A0A0]">Tampilkan tombol piringan vinyl di undangan.</p>
              </div>
              <input
                type="checkbox"
                checked={form.musicEnabled}
                onChange={(e) => setForm({ ...form, musicEnabled: e.target.checked })}
                className="h-4 w-4 accent-[#B8A88A]"
              />
            </label>

            <label className="flex items-center justify-between border border-[#262626] bg-[#171717] px-4 py-3.5 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Putar Otomatis Saat Buka Undangan</p>
                <p className="text-xs text-[#A0A0A0]">Musik mulai ketika tombol BUKA UNDANGAN diklik.</p>
              </div>
              <input
                type="checkbox"
                checked={form.musicAutoplayOnOpen}
                onChange={(e) => setForm({ ...form, musicAutoplayOnOpen: e.target.checked })}
                className="h-4 w-4 accent-[#B8A88A]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#D0D0D0]">Judul Lagu / Audio</label>
              <input
                type="text"
                value={form.musicTitle}
                onChange={(e) => setForm({ ...form, musicTitle: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-sm text-white focus:border-[#B8A88A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#D0D0D0]">
                Unggah File Audio (MP3, WAV, OGG, M4A)
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-[#303030] bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:border-[#B8A88A] hover:text-[#B8A88A]">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingAudio ? 'Mengunggah...' : 'Pilih File Audio'}</span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
                    disabled={uploadingAudio}
                    className="sr-only"
                    onChange={(e) => {
                      void handleAudioUpload(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>
                {form.musicUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, musicUrl: '', musicTitle: 'Gamelan & Piano Serenade (Ambient)' })}
                    className="text-xs text-[#A0A0A0] hover:text-white cursor-pointer"
                  >
                    Gunakan Ambient Bawaan
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#242424] pt-4">
            <div className="flex items-center gap-2 text-xs text-[#D0D0D0]">
              <Music className="h-4 w-4 text-[#B8A88A]" />
              <span>
                Sumber aktif:{' '}
                <strong className="text-white">
                  {form.musicUrl ? form.musicUrl : 'Built-in Ambient Web Audio Melody'}
                </strong>
              </span>
            </div>
            {form.musicUrl && (
              <audio controls src={form.musicUrl} className="mt-3 w-full max-w-md" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Section Visibility Customization Mode
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Kustomisasi &amp; Visibilitas Bagian</h2>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            Aktifkan atau nonaktifkan bagian undangan secara instan sesuai kebutuhan acara.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-md bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] disabled:opacity-50 whitespace-nowrap cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Visibilitas'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SECTION_TOGGLES.map((item) => {
          const checked = form.visibility[item.key];
          return (
            <label
              key={item.key}
              className="flex items-center justify-between gap-4 border border-[#303030] bg-[#111111] px-5 py-4 transition-colors hover:border-[#454545] cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-0.5 text-xs text-[#A0A0A0]">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                aria-label={`Tampilkan bagian ${item.label}`}
                checked={checked}
                onChange={(e) =>
                  setForm({
                    ...form,
                    visibility: { ...form.visibility, [item.key]: e.target.checked },
                  })
                }
                className="h-4 w-4 shrink-0 accent-[#B8A88A]"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
};

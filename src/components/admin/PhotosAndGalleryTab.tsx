import React, { useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import type { GalleryPhoto, WeddingConfig } from '../../types/wedding';
import {
  createGalleryPhoto,
  deleteGalleryPhoto,
  uploadAdminImage,
} from '../../services/weddingApi';

interface PhotosAndGalleryTabProps {
  config: WeddingConfig;
  gallery: GalleryPhoto[];
  onSaveConfig: (next: WeddingConfig) => Promise<void>;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const PHOTO_SLOTS: { key: keyof WeddingConfig; label: string; hint: string }[] = [
  { key: 'desktopSplitPhoto', label: 'Potret Split-Screen Desktop', hint: 'Lanskap 4:3 · Panel kiri layar lebar' },
  { key: 'heroPhoto', label: 'Foto Hero Utama', hint: 'Vertikal 9:16 · Ruang gelap di atas untuk teks' },
  { key: 'groomPhoto', label: 'Foto Mempelai Pria', hint: 'Vertikal 3:4 · Bingkai oval profil' },
  { key: 'bridePhoto', label: 'Foto Mempelai Wanita', hint: 'Vertikal 3:4 · Bingkai oval profil' },
  { key: 'eventBackdropPhoto', label: 'Latar Acara & Countdown', hint: 'Vertikal · Di belakang kartu lengkung' },
  { key: 'wishesBackdropPhoto', label: 'Latar Dinding Ucapan', hint: 'Vertikal · Di belakang daftar ucapan' },
  { key: 'closingBackdropPhoto', label: 'Latar Penutup', hint: 'Vertikal · Di belakang kartu terima kasih' },
  { key: 'footerCouplePhoto', label: 'Foto Penutup Footer', hint: 'Vertikal 3:4 · Bagian bawah undangan' },
];

export const PhotosAndGalleryTab: React.FC<PhotosAndGalleryTabProps> = ({
  config,
  gallery,
  onSaveConfig,
  onRefresh,
  onNotify,
}) => {
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [galleryCaption, setGalleryCaption] = useState('');
  const [galleryAspect, setGalleryAspect] = useState<'portrait' | 'landscape'>('portrait');
  const [galleryMono, setGalleryMono] = useState(false);
  const [addingGallery, setAddingGallery] = useState(false);

  const handleSlotUpload = async (key: keyof WeddingConfig, file: File | null) => {
    if (!file) return;
    setUploadingSlot(String(key));
    try {
      const uploaded = await uploadAdminImage(file);
      await onSaveConfig({ ...config, [key]: uploaded.url });
      onNotify('Foto berhasil diunggah dan diperbarui.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengunggah foto.', true);
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleAddGalleryUpload = async (file: File | null) => {
    if (!file) return;
    setAddingGallery(true);
    try {
      const uploaded = await uploadAdminImage(file);
      await createGalleryPhoto({
        url: uploaded.url,
        caption: galleryCaption.trim() || file.name.replace(/\.[^.]+$/, ''),
        aspect: galleryAspect,
        monochrome: galleryMono,
      });
      setGalleryCaption('');
      await onRefresh();
      onNotify('Foto galeri berhasil ditambahkan.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menambah foto galeri.', true);
    } finally {
      setAddingGallery(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    try {
      await deleteGalleryPhoto(id);
      await onRefresh();
      onNotify('Foto galeri dihapus.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus foto.', true);
    }
  };

  return (
    <div className="space-y-10">
      <div className="border-b border-[#242424] pb-6">
        <h2 className="text-2xl font-semibold text-white">Manajemen Foto &amp; Galeri</h2>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Unggah foto JPG, JPEG, PNG, atau WEBP. Gambar beresolusi besar otomatis dioptimalkan
          sebelum disimpan.
        </p>
      </div>

      {/* Core Photo Slots */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PHOTO_SLOTS.map((slot) => {
          const url = String(config[slot.key] || '');
          const isBusy = uploadingSlot === String(slot.key);
          return (
            <div
              key={String(slot.key)}
              className="flex flex-col border border-[#303030] bg-[#111111]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#242424] bg-[#080808]">
                <img
                  src={url}
                  alt={slot.label}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="text-sm font-medium text-white">{slot.label}</h3>
                  <p className="mt-0.5 text-xs text-[#A0A0A0]">{slot.hint}</p>
                </div>
                <label className="mt-4 inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-xs font-medium text-white transition-colors hover:border-[#B8A88A] hover:text-[#B8A88A]">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isBusy ? 'Mengunggah...' : 'Ganti Foto'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    disabled={isBusy}
                    className="sr-only"
                    onChange={(e) => {
                      void handleSlotUpload(slot.key, e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pre-Wedding Gallery Section */}
      <div className="space-y-5 border border-[#303030] bg-[#111111] p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-5 lg:flex-row lg:items-end">
          <div>
            <h3 className="text-base font-semibold text-white">Galeri Pre-Wedding</h3>
            <p className="mt-1 text-xs text-[#A0A0A0]">
              Ditampilkan dalam grid asimetris 2 kolom dengan fitur lightbox.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={galleryCaption}
              onChange={(e) => setGalleryCaption(e.target.value)}
              placeholder="Caption foto (opsional)"
              className="rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-xs text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
            <select
              aria-label="Rasio foto galeri"
              value={galleryAspect}
              onChange={(e) => setGalleryAspect(e.target.value as 'portrait' | 'landscape')}
              className="rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-xs text-white focus:border-[#B8A88A] focus:outline-none"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
            <label className="inline-flex items-center gap-2 text-xs text-[#D0D0D0]">
              <input
                type="checkbox"
                checked={galleryMono}
                onChange={(e) => setGalleryMono(e.target.checked)}
                className="accent-[#B8A88A]"
              />
              <span>Hitam Putih</span>
            </label>
            <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#B8A88A] whitespace-nowrap">
              <ImagePlus className="h-3.5 w-3.5" />
              <span>{addingGallery ? 'Mengunggah...' : 'Unggah ke Galeri'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={addingGallery}
                className="sr-only"
                onChange={(e) => {
                  void handleAddGalleryUpload(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden border border-[#262626] bg-[#080808]"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Foto Galeri'}
                referrerPolicy="no-referrer"
                className={`h-44 w-full object-cover ${photo.monochrome ? 'grayscale' : ''}`}
              />
              <div className="flex items-center justify-between gap-2 border-t border-[#242424] bg-[#141414] px-3 py-2">
                <span className="truncate text-xs text-[#D0D0D0]">
                  {photo.caption || 'Tanpa judul'}
                </span>
                <button
                  type="button"
                  aria-label={`Hapus foto ${photo.caption || photo.id}`}
                  onClick={() => handleDeleteGallery(photo.id)}
                  className="rounded p-1 text-[#A0A0A0] transition-colors hover:bg-red-950 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

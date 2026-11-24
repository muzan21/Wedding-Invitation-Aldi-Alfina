import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import type { GuestRecord } from '../../types/wedding';
import {
  createGuestRecord,
  deleteGuestRecord,
  importGuestsFromCsv,
  updateGuestRecord,
} from '../../services/weddingApi';
import {
  buildGuestQrPayload,
  buildPersonalizedInviteUrl,
  exportGuestsToCsv,
} from '../../utils/weddingLogic';
import { QrCodeCanvas } from '../invitation/QrCodeCanvas';

interface GuestsTabProps {
  guests: GuestRecord[];
  weddingTitle: string;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const GuestsTab: React.FC<GuestsTabProps> = ({
  guests,
  weddingTitle,
  onRefresh,
  onNotify,
}) => {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('VIP');
  const [phone, setPhone] = useState('');
  const [maxGuests, setMaxGuests] = useState(2);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQrGuest, setActiveQrGuest] = useState<GuestRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://simanten.app';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q) ||
        g.qrToken.toLowerCase().includes(q)
    );
  }, [guests, search]);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createGuestRecord({
        name: name.trim(),
        group: group.trim() || 'Umum',
        phone: phone.trim(),
        maxGuests,
      });
      setName('');
      setPhone('');
      await onRefresh();
      onNotify('Tamu undangan dan QR Code berhasil dibuat.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menambah tamu.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvFileUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importGuestsFromCsv(text);
      await onRefresh();
      onNotify(`${res.imported} tamu berhasil diimpor dari CSV.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengimpor CSV.', true);
    }
  };

  const handleExportCsv = () => {
    const csv = exportGuestsToCsv(filtered, origin);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar-tamu-undangan-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Daftar tamu dan tautan undangan berhasil diekspor.');
  };

  const handleCopyInviteLink = async (guest: GuestRecord) => {
    const link = buildPersonalizedInviteUrl(origin, guest.name);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(guest.id);
    window.setTimeout(() => setCopiedId((prev) => (prev === guest.id ? null : prev)), 2000);
    onNotify(`Tautan personal untuk ${guest.name} disalin.`);
  };

  const handleToggleCheckIn = async (guest: GuestRecord) => {
    try {
      await updateGuestRecord(guest.id, { checkedIn: !guest.checkedIn });
      await onRefresh();
      onNotify(`Status check-in ${guest.name} diperbarui.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengubah status.', true);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    try {
      await deleteGuestRecord(id);
      await onRefresh();
      onNotify('Tamu dihapus dari daftar.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus tamu.', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Manajemen Tamu &amp; QR Code</h2>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            Buat tautan personal (?to=Nama%20Tamu) dan QR Code unik untuk setiap tamu undangan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-[#303030] bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:border-[#B8A88A] whitespace-nowrap">
            <Upload className="h-3.5 w-3.5" />
            <span>Impor CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                void handleCsvFileUpload(e.target.files?.[0] || null);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Add Guest Form */}
      <form onSubmit={handleAddGuest} className="border border-[#303030] bg-[#111111] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label htmlFor="guest-name-input" className="block text-xs text-[#D0D0D0]">
              Nama Tamu*
            </label>
            <input
              id="guest-name-input"
              type="text"
              required
              placeholder="Contoh: Saeful Muzani"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="guest-group-input" className="block text-xs text-[#D0D0D0]">
              Grup / Kategori
            </label>
            <input
              id="guest-group-input"
              type="text"
              placeholder="VIP / Keluarga / Sahabat"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="guest-phone-input" className="block text-xs text-[#D0D0D0]">
              No. WhatsApp
            </label>
            <input
              id="guest-phone-input"
              type="text"
              placeholder="+628..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="guest-quota-input" className="block text-xs text-[#D0D0D0]">
              Kuota
            </label>
            <input
              id="guest-quota-input"
              type="number"
              min={1}
              max={20}
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-[#303030] bg-[#171717] px-2.5 py-2 font-mono-num text-sm text-white focus:border-[#B8A88A] focus:outline-none"
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Tambah Tamu</span>
            </button>
          </div>
        </div>
      </form>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#A0A0A0]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama tamu, grup, atau kode QR..."
          className="w-full rounded-md border border-[#303030] bg-[#171717] py-2 pr-3 pl-9 text-xs text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
        />
      </div>

      {/* Guests Table */}
      <div className="overflow-x-auto border border-[#303030] bg-[#111111]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#242424] text-[#A0A0A0]">
            <tr>
              <th className="px-4 py-3 font-medium">Nama Tamu</th>
              <th className="px-4 py-3 font-medium">Grup</th>
              <th className="px-4 py-3 font-medium">QR Token</th>
              <th className="px-4 py-3 text-right font-medium">Kuota</th>
              <th className="px-4 py-3 font-medium">Check-In</th>
              <th className="px-4 py-3 text-right font-medium">Tautan &amp; Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E1E1E]">
            {filtered.map((g) => (
              <tr key={g.id} className="hover:bg-[#171717]">
                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{g.name}</td>
                <td className="px-4 py-3 text-[#D0D0D0] whitespace-nowrap">{g.group}</td>
                <td className="px-4 py-3 font-mono-num text-[#B8A88A] whitespace-nowrap">
                  {g.qrToken}
                </td>
                <td className="px-4 py-3 text-right font-mono-num text-[#D0D0D0]">
                  {g.maxGuests}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleCheckIn(g)}
                    className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      g.checkedIn
                        ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
                        : 'border-[#303030] bg-[#171717] text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    {g.checkedIn ? 'Checked In' : 'Belum Hadir'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(g)}
                      aria-label={`Salin tautan undangan ${g.name}`}
                      className="inline-flex items-center gap-1 rounded border border-[#303030] bg-[#171717] px-2.5 py-1.5 text-[11px] text-white hover:border-[#B8A88A] cursor-pointer"
                    >
                      {copiedId === g.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>Link</span>
                    </button>
                    <a
                      href={buildPersonalizedInviteUrl(origin, g.name)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Buka undangan ${g.name}`}
                      className="inline-flex items-center rounded border border-[#303030] bg-[#171717] p-1.5 text-[#D0D0D0] hover:border-[#B8A88A] hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveQrGuest(g)}
                      aria-label={`Tampilkan QR Code ${g.name}`}
                      className="inline-flex items-center rounded border border-[#303030] bg-[#171717] p-1.5 text-[#B8A88A] hover:border-[#B8A88A] cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGuest(g.id)}
                      aria-label={`Hapus tamu ${g.name}`}
                      className="inline-flex items-center rounded border border-[#303030] bg-[#171717] p-1.5 text-[#A0A0A0] hover:border-red-800 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#A0A0A0]">
                  Belum ada tamu dalam daftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Individual Guest QR Code Modal */}
      {activeQrGuest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`QR Code untuk ${activeQrGuest.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm border border-[#303030] bg-[#111111] p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <h3 className="text-sm font-semibold text-white">QR Code Tamu</h3>
              <button
                type="button"
                aria-label="Tutup modal QR"
                onClick={() => setActiveQrGuest(null)}
                className="rounded p-1 text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 font-serif-editorial text-2xl text-white">
              {activeQrGuest.name}
            </p>
            <p className="mt-1 font-mono-num text-xs text-[#B8A88A]">
              {activeQrGuest.qrToken} · Kuota {activeQrGuest.maxGuests} Orang
            </p>
            <div className="mt-5 flex justify-center">
              <QrCodeCanvas
                value={buildGuestQrPayload(
                  activeQrGuest.name,
                  activeQrGuest.qrToken,
                  weddingTitle
                )}
                size={210}
                label={`QR Code ${activeQrGuest.name}`}
              />
            </div>
            <p className="mt-4 break-all rounded bg-[#171717] px-3 py-2 font-mono-num text-[11px] text-[#A0A0A0]">
              {buildPersonalizedInviteUrl(origin, activeQrGuest.name)}
            </p>
            <button
              type="button"
              onClick={() => handleCopyInviteLink(activeQrGuest)}
              className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Tautan Personal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

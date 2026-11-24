import React, { useMemo, useState } from 'react';
import { Check, Download, Search, Trash2, X } from 'lucide-react';
import type { GuestWish, RsvpSubmission, WishStatus } from '../../types/wedding';
import {
  deleteRsvpRecord,
  deleteWishRecord,
  moderateWish,
} from '../../services/weddingApi';
import { exportRsvpsToCsv } from '../../utils/weddingLogic';

interface RsvpAndWishesTabProps {
  mode: 'rsvp' | 'wishes';
  rsvps: RsvpSubmission[];
  wishes: GuestWish[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const PAGE_SIZE = 10;

export const RsvpAndWishesTab: React.FC<RsvpAndWishesTabProps> = ({
  mode,
  rsvps,
  wishes,
  onRefresh,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'Hadir' | 'Tidak Hadir'>('all');
  const [wishFilter, setWishFilter] = useState<'all' | WishStatus>('all');
  const [page, setPage] = useState(1);

  const filteredRsvps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rsvps.filter((r) => {
      if (rsvpFilter !== 'all' && r.attendance !== rsvpFilter) return false;
      if (!q) return true;
      return (
        r.guestName.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q)
      );
    });
  }, [rsvps, rsvpFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRsvps.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRsvps = filteredRsvps.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filteredWishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wishes.filter((w) => {
      if (wishFilter !== 'all' && w.status !== wishFilter) return false;
      if (!q) return true;
      return (
        w.guestName.toLowerCase().includes(q) ||
        w.message.toLowerCase().includes(q)
      );
    });
  }, [wishes, wishFilter, search]);

  const handleExportRsvpCsv = () => {
    const csv = exportRsvpsToCsv(filteredRsvps);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsvp-undangan-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Data RSVP berhasil diekspor ke CSV.');
  };

  const handleDeleteRsvp = async (id: string) => {
    try {
      await deleteRsvpRecord(id);
      await onRefresh();
      onNotify('Data RSVP dihapus.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus RSVP.', true);
    }
  };

  const handleModerateWish = async (id: string, status: WishStatus) => {
    try {
      await moderateWish(id, status);
      await onRefresh();
      onNotify(`Status ucapan diperbarui menjadi ${status}.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal memperbarui ucapan.', true);
    }
  };

  const handleDeleteWish = async (id: string) => {
    try {
      await deleteWishRecord(id);
      await onRefresh();
      onNotify('Ucapan dihapus permanen.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghapus ucapan.', true);
    }
  };

  if (mode === 'rsvp') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">Manajemen RSVP</h2>
            <p className="mt-1 text-sm text-[#A0A0A0]">
              {filteredRsvps.length} data RSVP ditemukan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportRsvpCsv}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#A0A0A0]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama tamu atau pesan..."
              className="w-full rounded-md border border-[#303030] bg-[#171717] py-2 pr-3 pl-9 text-xs text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-[#303030] bg-[#111111] p-1">
            {(['all', 'Hadir', 'Tidak Hadir'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setRsvpFilter(tab);
                  setPage(1);
                }}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  rsvpFilter === tab
                    ? 'bg-white text-black'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                {tab === 'all' ? 'Semua' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* RSVP Table */}
        <div className="overflow-x-auto border border-[#303030] bg-[#111111]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#242424] text-[#A0A0A0]">
              <tr>
                <th className="px-4 py-3 font-medium">Nama Tamu</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Pesan</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {paginatedRsvps.map((r) => (
                <tr key={r.id} className="hover:bg-[#171717]">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                    {r.guestName}
                  </td>
                  <td
                    className={`px-4 py-3 whitespace-nowrap ${
                      r.attendance === 'Hadir' ? 'text-emerald-400' : 'text-[#A0A0A0]'
                    }`}
                  >
                    {r.attendance}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num text-white">
                    {r.attendeeCount}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-[#D0D0D0]">
                    {r.message || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono-num text-[#A0A0A0] whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Hapus RSVP ${r.guestName}`}
                      onClick={() => handleDeleteRsvp(r.id)}
                      className="rounded p-1.5 text-[#A0A0A0] hover:bg-red-950 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedRsvps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#A0A0A0]">
                    Tidak ada data RSVP yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
            <span className="font-mono-num">
              Halaman {safePage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-[#303030] bg-[#171717] px-3 py-1.5 text-white disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-[#303030] bg-[#171717] px-3 py-1.5 text-white disabled:opacity-40 cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Wishes Moderation Mode
  return (
    <div className="space-y-6">
      <div className="border-b border-[#242424] pb-6">
        <h2 className="text-2xl font-semibold text-white">Moderasi Ucapan &amp; Doa</h2>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Setujui, tolak, atau hapus ucapan tamu. Hanya ucapan berstatus Approved yang tampil di
          halaman undangan publik.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#A0A0A0]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ucapan atau nama pengirim..."
            className="w-full rounded-md border border-[#303030] bg-[#171717] py-2 pr-3 pl-9 text-xs text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[#303030] bg-[#111111] p-1">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setWishFilter(tab)}
              className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap cursor-pointer ${
                wishFilter === tab ? 'bg-white text-black' : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              {tab === 'all' ? 'Semua' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredWishes.map((w) => (
          <div
            key={w.id}
            className="flex flex-col justify-between gap-4 border border-[#303030] bg-[#111111] p-5 sm:flex-row sm:items-start"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-white">{w.guestName}</span>
                <span className="text-[#505050]">·</span>
                <span className="text-[#A0A0A0]">{w.attendance}</span>
                <span className="text-[#505050]">·</span>
                <span
                  className={
                    w.status === 'approved'
                      ? 'text-emerald-400'
                      : w.status === 'rejected'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }
                >
                  {w.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#D0D0D0]">{w.message}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {w.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => handleModerateWish(w.id, 'approved')}
                  className="inline-flex items-center gap-1 rounded border border-emerald-800 bg-emerald-950/60 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
              )}
              {w.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => handleModerateWish(w.id, 'rejected')}
                  className="inline-flex items-center gap-1 rounded border border-[#303030] bg-[#171717] px-2.5 py-1.5 text-xs text-[#D0D0D0] hover:border-amber-700 hover:text-amber-300 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              )}
              <button
                type="button"
                aria-label={`Hapus ucapan dari ${w.guestName}`}
                onClick={() => handleDeleteWish(w.id)}
                className="rounded border border-[#303030] bg-[#171717] p-1.5 text-[#A0A0A0] hover:border-red-800 hover:text-red-300 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filteredWishes.length === 0 && (
          <div className="border border-[#303030] bg-[#111111] py-12 text-center text-xs text-[#A0A0A0]">
            Tidak ada ucapan ditemukan.
          </div>
        )}
      </div>
    </div>
  );
};

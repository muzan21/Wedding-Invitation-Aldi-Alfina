import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { AdminBundle } from '../../types/wedding';
import { computeAdminStats } from '../../utils/weddingLogic';

interface OverviewTabProps {
  bundle: AdminBundle;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ bundle, onNavigateTab }) => {
  const stats = computeAdminStats(bundle.rsvps, bundle.allWishes, bundle.guests);

  const cards = [
    {
      label: 'Total Undangan',
      value: stats.totalInvitations,
      detail: `Kuota ${stats.totalGuestQuota} tamu terdaftar`,
    },
    {
      label: 'Total RSVP Masuk',
      value: stats.totalRsvps,
      detail: `${stats.confirmedRsvps} hadir · ${stats.declinedRsvps} tidak hadir`,
    },
    {
      label: 'Konfirmasi Hadir',
      value: stats.confirmedAttendees,
      detail: `Dari ${stats.confirmedRsvps} konfirmasi kehadiran`,
    },
    {
      label: 'Tidak Hadir',
      value: stats.declinedRsvps,
      detail: 'Tamu berhalangan hadir',
    },
    {
      label: 'Total Ucapan & Doa',
      value: stats.totalWishes,
      detail: `${stats.approvedWishes} tampil · ${stats.pendingWishes} menunggu`,
    },
    {
      label: 'QR Code Terdaftar',
      value: stats.totalQrRegistrations,
      detail: `${stats.checkedInCount} tamu sudah check-in`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#242424] pb-6 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Ringkasan Undangan
          </h2>
          <p className="mt-1 text-sm text-[#A0A0A0]">
            {bundle.config.groomFullName} &amp; {bundle.config.brideFullName} ·{' '}
            {bundle.config.heroDateDisplay}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('guests')}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:border-[#B8A88A] whitespace-nowrap cursor-pointer"
          >
            <span>Kelola Tamu &amp; QR</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#B8A88A]" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('info')}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#B8A88A] whitespace-nowrap cursor-pointer"
          >
            <span>Edit Konten Undangan</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards Grid (Tabular Numerals, Flat Single Elevation) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="border border-[#303030] bg-[#111111] p-5 transition-colors hover:border-[#454545]"
          >
            <p className="text-xs font-medium text-[#A0A0A0]">{card.label}</p>
            <p className="mt-3 font-mono-num text-3xl font-semibold text-white">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-[#A0A0A0]">{card.detail}</p>
          </div>
        ))}
      </div>

      {/* Recent RSVPs + Wishes Split */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="border border-[#303030] bg-[#111111]">
          <div className="flex items-center justify-between border-b border-[#242424] px-5 py-4">
            <h3 className="text-sm font-semibold text-white">RSVP Terbaru</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('rsvp')}
              className="text-xs text-[#B8A88A] hover:text-white cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#242424] text-[#A0A0A0]">
                <tr>
                  <th className="px-5 py-3 font-medium">Nama Tamu</th>
                  <th className="px-5 py-3 font-medium">Kehadiran</th>
                  <th className="px-5 py-3 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {bundle.rsvps.slice(0, 6).map((r) => (
                  <tr key={r.id} className="hover:bg-[#171717]">
                    <td className="px-5 py-3 font-medium text-white">{r.guestName}</td>
                    <td
                      className={`px-5 py-3 ${
                        r.attendance === 'Hadir' ? 'text-emerald-400' : 'text-[#A0A0A0]'
                      }`}
                    >
                      {r.attendance}
                    </td>
                    <td className="px-5 py-3 text-right font-mono-num text-[#D0D0D0]">
                      {r.attendeeCount}
                    </td>
                  </tr>
                ))}
                {bundle.rsvps.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-[#A0A0A0]">
                      Belum ada konfirmasi RSVP.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-[#303030] bg-[#111111]">
          <div className="flex items-center justify-between border-b border-[#242424] px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Ucapan &amp; Doa Terbaru</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('wishes')}
              className="text-xs text-[#B8A88A] hover:text-white cursor-pointer"
            >
              Moderasi
            </button>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {bundle.allWishes.slice(0, 5).map((w) => (
              <div key={w.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-white">{w.guestName}</span>
                  <span className="text-[#A0A0A0]">
                    {w.attendance} · {w.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[#D0D0D0]">{w.message}</p>
              </div>
            ))}
            {bundle.allWishes.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-[#A0A0A0]">
                Belum ada ucapan tamu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

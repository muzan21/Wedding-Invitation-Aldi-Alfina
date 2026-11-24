import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Gift,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageSquareHeart,
  Music,
  Shield,
  Sliders,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { AdminBundle, WeddingConfig } from '../../types/wedding';
import {
  fetchAdminAuthStatus,
  fetchAdminBundle,
  logoutAdminAccount,
  updateWeddingConfig,
  type AdminAuthStatus,
} from '../../services/weddingApi';
import { AdminAuthGate } from './AdminAuthGate';
import { EventsAndGiftsTab } from './EventsAndGiftsTab';
import { GuestLinkTab } from './GuestLinkTab';
import { GuestsTab } from './GuestsTab';
import { MusicAndCustomizeTab } from './MusicAndCustomizeTab';
import { OverviewTab } from './OverviewTab';
import { PhotosAndGalleryTab } from './PhotosAndGalleryTab';
import { RsvpAndWishesTab } from './RsvpAndWishesTab';
import { SecurityTab } from './SecurityTab';
import { WeddingInfoTab } from './WeddingInfoTab';

interface AdminDashboardPageProps {
  onNavigatePublic: () => void;
}

type AdminTab =
  | 'overview'
  | 'info'
  | 'photos'
  | 'events'
  | 'gifts'
  | 'music'
  | 'rsvp'
  | 'wishes'
  | 'guests'
  | 'guest-link'
  | 'customize'
  | 'security';

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'info', label: 'Info Pernikahan', icon: Heart },
  { id: 'photos', label: 'Foto & Galeri', icon: ImageIcon },
  { id: 'events', label: 'Jadwal Acara', icon: Calendar },
  { id: 'gifts', label: 'Kado Digital', icon: Gift },
  { id: 'music', label: 'Musik Latar', icon: Music },
  { id: 'rsvp', label: 'Data RSVP', icon: UserCheck },
  { id: 'wishes', label: 'Ucapan & Doa', icon: MessageSquareHeart },
  { id: 'guests', label: 'Tamu & QR Code', icon: Users },
  { id: 'guest-link', label: 'Link Tamu', icon: Link2 },
  { id: 'customize', label: 'Visibilitas Bagian', icon: Sliders },
  { id: 'security', label: 'Akun & Keamanan', icon: Shield },
];

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onNavigatePublic,
}) => {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [bundle, setBundle] = useState<AdminBundle | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; isError: boolean } | null>(null);

  const notify = useCallback((msg: string, isError = false) => {
    setToast({ msg, isError });
    window.setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3500);
  }, []);

  const loadBundle = useCallback(async () => {
    try {
      const data = await fetchAdminBundle();
      setBundle(data);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memuat data admin.', true);
    }
  }, [notify]);

  useEffect(() => {
    fetchAdminAuthStatus()
      .then((status) => {
        setAuthStatus(status);
        if (status.authenticated) {
          void loadBundle();
        }
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : 'Gagal memeriksa status sesi.', true);
      });
  }, [loadBundle, notify]);

  const handleAuthenticated = async (username: string) => {
    setAuthStatus((prev) => ({
      needsSetup: false,
      usesEnvOverride: prev?.usesEnvOverride ?? false,
      authenticated: true,
      username,
    }));
    await loadBundle();
  };

  const handleLogout = async () => {
    await logoutAdminAccount();
    setBundle(null);
    const status = await fetchAdminAuthStatus();
    setAuthStatus(status);
  };

  const handleSaveConfig = async (nextConfig: WeddingConfig) => {
    try {
      const saved = await updateWeddingConfig(nextConfig);
      setBundle((prev) => (prev ? { ...prev, config: saved } : prev));
      notify('Perubahan berhasil disimpan ke database dan langsung tampil di undangan.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.', true);
    }
  };

  if (!authStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] font-ui text-xs text-[#A0A0A0]">
        Memeriksa sesi administrator...
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <AdminAuthGate
        authStatus={authStatus}
        onAuthenticated={handleAuthenticated}
        onBackToInvitation={onNavigatePublic}
      />
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="flex min-h-screen bg-[#080808] font-ui text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#242424] bg-[#0D0D0D] lg:flex">
        <div className="border-b border-[#242424] px-6 py-5">
          <p className="font-serif-editorial text-2xl tracking-wide text-white">Simanten</p>
          <p className="mt-0.5 text-[11px] tracking-wider text-[#B8A88A] uppercase">
            Black Edition Admin
          </p>
        </div>

        <nav aria-label="Navigasi Admin" className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#171717] text-white border border-[#303030]'
                    : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#B8A88A]' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#242424] p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[#303030] bg-[#171717] px-3 py-2 text-xs font-medium text-[#D0D0D0] transition-colors hover:border-red-900 hover:text-red-300 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80"
          />
          <aside className="relative z-10 flex w-64 flex-col border-r border-[#242424] bg-[#0D0D0D]">
            <div className="flex items-center justify-between border-b border-[#242424] px-5 py-4">
              <span className="font-serif-editorial text-xl text-white">Simanten Admin</span>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setSidebarOpen(false)}
                className="rounded p-1 text-[#A0A0A0] hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap cursor-pointer ${
                      active ? 'bg-[#171717] text-white' : 'text-[#A0A0A0] hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-[#B8A88A]' : ''}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb Left — Primary Action Right */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#242424] bg-[#080808]/95 px-5 py-3.5 backdrop-blur-sm lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              onClick={() => setSidebarOpen(true)}
              className="rounded border border-[#303030] bg-[#171717] p-2 text-white lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#A0A0A0] truncate">
              <span>Dashboard</span>
              <span>/</span>
              <span className="font-medium text-white truncate">
                {currentNav?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onNavigatePublic}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-[#303030] bg-[#171717] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#B8A88A] whitespace-nowrap cursor-pointer"
            >
              <span>Lihat Undangan</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#B8A88A]" />
            </button>
          </div>
        </header>

        {/* Feedback Banner */}
        {toast && (
          <div
            role="status"
            className={`border-b px-6 py-2.5 text-xs ${
              toast.isError
                ? 'border-red-900 bg-red-950/70 text-red-200'
                : 'border-[#303030] bg-[#171717] text-[#B8A88A]'
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Active Tab Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 lg:px-8">
          {!bundle ? (
            <div className="py-20 text-center text-xs text-[#A0A0A0]">
              Memuat data dashboard...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  bundle={bundle}
                  onNavigateTab={(tab) => setActiveTab(tab as AdminTab)}
                />
              )}
              {activeTab === 'info' && (
                <WeddingInfoTab config={bundle.config} onSaveConfig={handleSaveConfig} />
              )}
              {activeTab === 'photos' && (
                <PhotosAndGalleryTab
                  config={bundle.config}
                  gallery={bundle.gallery}
                  onSaveConfig={handleSaveConfig}
                  onRefresh={loadBundle}
                  onNotify={notify}
                />
              )}
              {activeTab === 'events' && (
                <EventsAndGiftsTab
                  mode="events"
                  config={bundle.config}
                  events={bundle.events}
                  gifts={bundle.gifts}
                  onSaveConfig={handleSaveConfig}
                  onRefresh={loadBundle}
                  onNotify={notify}
                />
              )}
              {activeTab === 'gifts' && (
                <EventsAndGiftsTab
                  mode="gifts"
                  config={bundle.config}
                  events={bundle.events}
                  gifts={bundle.gifts}
                  onSaveConfig={handleSaveConfig}
                  onRefresh={loadBundle}
                  onNotify={notify}
                />
              )}
              {activeTab === 'music' && (
                <MusicAndCustomizeTab
                  mode="music"
                  config={bundle.config}
                  onSaveConfig={handleSaveConfig}
                  onNotify={notify}
                />
              )}
              {activeTab === 'rsvp' && (
                <RsvpAndWishesTab
                  mode="rsvp"
                  rsvps={bundle.rsvps}
                  wishes={bundle.allWishes}
                  onRefresh={loadBundle}
                  onNotify={notify}
                />
              )}
              {activeTab === 'wishes' && (
                <RsvpAndWishesTab
                  mode="wishes"
                  rsvps={bundle.rsvps}
                  wishes={bundle.allWishes}
                  onRefresh={loadBundle}
                  onNotify={notify}
                />
              )}
              {activeTab === 'guests' && (
                <GuestsTab
                  guests={bundle.guests}
                  weddingTitle={bundle.config.weddingTitle}
                  onRefresh={loadBundle}
                  onNotify={notify}
                />
              )}
              {activeTab === 'guest-link' && <GuestLinkTab />}
              {activeTab === 'customize' && (
                <MusicAndCustomizeTab
                  mode="customize"
                  config={bundle.config}
                  onSaveConfig={handleSaveConfig}
                  onNotify={notify}
                />
              )}
              {activeTab === 'security' && (
                <SecurityTab
                  username={authStatus.username || 'admin'}
                  usesEnvOverride={authStatus.usesEnvOverride}
                  onLogout={handleLogout}
                  onNotify={notify}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
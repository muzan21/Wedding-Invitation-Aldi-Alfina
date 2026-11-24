import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Cloud, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../../lib/firebase';
import { changeAdminPassword } from '../../services/weddingApi';

interface SecurityTabProps {
  username: string;
  usesEnvOverride: boolean;
  onLogout: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  username,
  usesEnvOverride,
  onLogout,
  onNotify,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [fbUser, setFbUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setFbUser(user));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      onNotify('Password baru minimal 8 karakter.', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify('Konfirmasi password baru tidak cocok.', true);
      return;
    }
    setSaving(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('Password admin berhasil diperbarui dengan enkripsi scrypt.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal mengubah password.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleSyncSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onNotify('Sinkronisasi Firebase Cloud berhasil terhubung.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal menghubungkan akun Google.', true);
    }
  };

  const handleGoogleSyncSignOut = async () => {
    try {
      await signOut(auth);
      onNotify('Koneksi Firebase Google diputus.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Gagal memutus koneksi Google.', true);
    }
  };

  const inputCls =
    'mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none';

  return (
    <div className="space-y-8">
      <div className="border-b border-[#242424] pb-6">
        <h2 className="text-2xl font-semibold text-white">Keamanan &amp; Akun Admin</h2>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Masuk sebagai <strong className="text-white">{username}</strong> · Sesi dilindungi token
          Bearer in-memory dan password hash scrypt.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Password Change Card */}
        <form onSubmit={handleChangePassword} className="space-y-4 border border-[#303030] bg-[#111111] p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#B8A88A]" />
            <h3 className="text-sm font-semibold text-white">Ganti Password Administrator</h3>
          </div>

          {usesEnvOverride ? (
            <p className="text-xs leading-relaxed text-[#A0A0A0]">
              Password dikelola melalui environment variable <code className="text-white">ADMIN_PASSWORD</code>.
              Ubah melalui panel Secrets untuk memperbarui password.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="sec-current-pw" className="block text-xs text-[#D0D0D0]">
                  Password Saat Ini
                </label>
                <input
                  id="sec-current-pw"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="sec-new-pw" className="block text-xs text-[#D0D0D0]">
                  Password Baru (Minimal 8 karakter)
                </label>
                <input
                  id="sec-new-pw"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="sec-confirm-pw" className="block text-xs text-[#D0D0D0]">
                  Konfirmasi Password Baru
                </label>
                <input
                  id="sec-confirm-pw"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-[#B8A88A] disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{saving ? 'Memperbarui...' : 'Perbarui Password'}</span>
              </button>
            </>
          )}
        </form>

        {/* Cloud Firestore Sync + Session Sign Out */}
        <div className="flex flex-col justify-between space-y-6 border border-[#303030] bg-[#111111] p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-[#B8A88A]" />
              <h3 className="text-sm font-semibold text-white">Sinkronisasi Firebase Cloud</h3>
            </div>
            <p className="text-xs leading-relaxed text-[#A0A0A0]">
              Hubungkan akun Google pemilik undangan untuk menyinkronkan perubahan konfigurasi secara
              langsung ke Cloud Firestore dengan aturan keamanan terverifikasi.
            </p>
            {fbUser ? (
              <div className="space-y-3 border border-[#262626] bg-[#171717] p-4">
                <p className="text-xs text-[#D0D0D0]">
                  Terhubung sebagai <strong className="text-white">{fbUser.email}</strong>
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSyncSignOut}
                  className="rounded border border-[#303030] bg-[#0D0D0D] px-3.5 py-2 text-xs text-[#D0D0D0] hover:border-[#B8A88A] hover:text-white cursor-pointer"
                >
                  Putuskan Google Cloud Sync
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSyncSignIn}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#303030] bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:border-[#B8A88A] cursor-pointer"
              >
                <Cloud className="h-3.5 w-3.5 text-[#B8A88A]" />
                <span>Hubungkan Akun Google (Firestore)</span>
              </button>
            )}
          </div>

          <div className="border-t border-[#242424] pt-5">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-red-900/70 bg-red-950/40 px-4 py-2 text-xs font-medium text-red-200 hover:bg-red-900/60 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar dari Admin Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

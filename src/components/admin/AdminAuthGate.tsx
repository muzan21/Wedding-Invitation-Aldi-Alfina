import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import {
  loginAdminAccount,
  setupAdminAccount,
  type AdminAuthStatus,
} from '../../services/weddingApi';

interface AdminAuthGateProps {
  authStatus: AdminAuthStatus;
  onAuthenticated: (username: string) => void;
  onBackToInvitation: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  authStatus,
  onAuthenticated,
  onBackToInvitation,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSetup = authStatus.needsSetup;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Password wajib diisi.');
      return;
    }

    if (isSetup) {
      if (password.length < 8) {
        setError('Password minimal 8 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password tidak cocok.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = isSetup
        ? await setupAdminAccount(username.trim() || 'admin', password)
        : await loginAdminAccount(username.trim() || 'admin', password);
      onAuthenticated(res.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentikasi gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-4 py-12 font-ui text-white">
      <div className="w-full max-w-md border border-[#303030] bg-[#111111] p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#242424] pb-5">
          <div>
            <p className="font-serif-editorial text-2xl tracking-wide text-white">
              Simanten Admin
            </p>
            <p className="mt-0.5 text-xs text-[#A0A0A0]">
              Black Edition Control Console
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#303030] bg-[#171717] text-[#B8A88A]">
            {isSetup ? <KeyRound className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
        </div>

        <div className="mt-6">
          <h1 className="text-lg font-semibold text-white">
            {isSetup ? 'Inisialisasi Akun Administrator' : 'Masuk Dashboard Admin'}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#A0A0A0]">
            {isSetup
              ? 'Buat kredensial administrator pertama untuk mengamankan panel undangan. Password dienkripsi dengan scrypt di server.'
              : 'Masukkan username dan password administrator untuk mengelola seluruh konten undangan pernikahan.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-username" className="block text-xs font-medium text-[#D0D0D0]">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-[#D0D0D0]">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSetup ? 'Minimal 8 karakter' : 'Masukkan password admin'}
              className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
            />
          </div>

          {isSetup && (
            <div>
              <label
                htmlFor="admin-confirm-password"
                className="block text-xs font-medium text-[#D0D0D0]"
              >
                Konfirmasi Password
              </label>
              <input
                id="admin-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="mt-1.5 w-full rounded-md border border-[#303030] bg-[#171717] px-3.5 py-2.5 text-sm text-white placeholder-[#707070] focus:border-[#B8A88A] focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-900 bg-red-950/60 px-3.5 py-2.5 text-xs text-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-xs font-semibold tracking-wider text-black uppercase transition-colors hover:bg-[#B8A88A] disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>
              {submitting
                ? 'Memproses...'
                : isSetup
                ? 'Simpan & Masuk Dashboard'
                : 'Masuk Dashboard'}
            </span>
          </button>
        </form>

        <div className="mt-6 border-t border-[#242424] pt-4 text-center">
          <button
            type="button"
            onClick={onBackToInvitation}
            className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] transition-colors hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Undangan Publik</span>
          </button>
        </div>
      </div>
    </div>
  );
};

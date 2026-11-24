import React, { useState } from 'react';
import { Copy, Check, Link2, Send, UserPlus } from 'lucide-react';

export const GuestLinkTab: React.FC = () => {
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState(false);

  // Mengambil domain website secara otomatis (baik saat localhost maupun sudah deploy)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Membuat link otomatis setiap kali nama diketik
  const trimmedName = guestName.trim();
  const generatedLink = trimmedName
    ? `${baseUrl}/?to=${encodeURIComponent(trimmedName)}`
    : '';

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback jika clipboard API diblokir
      const textarea = document.createElement('textarea');
      textarea.value = generatedLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!generatedLink) return;
    const message = `Kepada Yth. ${trimmedName},\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam acara pernikahan kami.\n\nInfo lengkap & undangan digital:\n${generatedLink}\n\nTerima kasih.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif text-[#e6b880]">Generator Link Tamu</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Ketik nama tamu di bawah ini, link undangan khusus akan langsung dibuat secara otomatis.
        </p>
      </div>

      <div className="bg-[#161616] border border-neutral-800 rounded-xl p-6 space-y-5">
        {/* Input Nama Tamu */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Nama Tamu Undangan
          </label>
          <div className="relative">
            <UserPlus className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setCopied(false);
              }}
              placeholder="Contoh: Budi Santoso & Keluarga"
              className="w-full bg-[#1f1f1f] border border-neutral-700 focus:border-[#e6b880] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 outline-none transition"
            />
          </div>
        </div>

        {/* Output Link Otomatis */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Link Undangan Otomatis
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-[#111111] border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-300 overflow-x-auto">
              <Link2 className="w-4 h-4 text-[#e6b880] mr-2.5 shrink-0" />
              <span className="truncate select-all">
                {generatedLink || 'Ketik nama tamu terlebih dahulu...'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!generatedLink}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#e6b880] text-black hover:bg-[#d8a76c] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Salin Link
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={!generatedLink}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Kirim WA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
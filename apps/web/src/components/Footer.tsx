import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { sound } from '../services/soundEngine';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    sound.play('swoosh');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="py-16 bg-[var(--fs-green-dark)] text-center text-white relative border-t-2 border-black flex flex-col items-center justify-center space-y-5 px-6">
      <Link
        to="/"
        onClick={() => sound.play('swoosh')}
        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center border-2 border-black shadow-[4px_4px_0_#000] text-2xl font-bold hover:scale-105 transition-transform cursor-pointer"
        aria-label="Kembali ke beranda"
      >
        🌿
      </Link>

      <div className="space-y-2 max-w-xl mx-auto">
        <p className="font-passata text-xl sm:text-2xl uppercase tracking-tight text-white leading-snug">
          FreshSight — Pemeriksaan Visual Kesegaran Buah
        </p>
        <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
          Mendukung apel, pisang, dan jeruk utuh. Penilaian didasarkan pada tampilan visual kulit buah dan bukan pengganti uji keamanan pangan. Foto diproses untuk inferensi tanpa disimpan permanen di server; riwayat hanya tersimpan di perangkat Anda.
        </p>
      </div>

      <p className="font-mono-tech text-xs text-white/75 pt-2">
        © 2026 FreshSight
      </p>

      <button
        type="button"
        onClick={scrollToTop}
        className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-white/20 hover:bg-[var(--fs-accent)] hover:text-black transition-colors cursor-pointer"
        aria-label="Kembali ke bagian atas halaman"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </footer>
  );
};

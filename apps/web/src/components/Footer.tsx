import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, Leaf } from 'lucide-react';
import { sound } from '../services/soundEngine';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    sound.play('swoosh');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full py-16 sm:py-20 bg-[#0A2E19] text-center text-white relative border-t-3 border-black flex flex-col items-center justify-center space-y-6">

      <Link
        to="/"
        onClick={() => sound.play('swoosh')}
        className="w-16 h-16 rounded-full bg-[#FFC737] text-black flex items-center justify-center border-3 border-black shadow-[4px_4px_0_#000000] hover:scale-105 transition-transform cursor-pointer animate-fruit-bob"
        aria-label="Kembali ke beranda"
      >
        <svg viewBox="0 0 36 36" className="w-8 h-8" aria-hidden="true">
          <circle cx="18" cy="20" r="10" fill="#1E6B3E" stroke="#000" strokeWidth="2.5" />
          <path d="M18 9 C21 4, 28 5, 27 10 C23 12, 19 11, 18 9Z" fill="#8DF947" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </Link>

      <div className="space-y-3 max-w-2xl mx-auto px-6">
        <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
          Cek kesegaran buah secara objektif, bukan kira-kira.
        </p>
        <p className="text-sm sm:text-base font-normal text-white/80 leading-relaxed max-w-xl mx-auto">
          Pemeriksaan visual apel, pisang, dan jeruk lengkap dengan peta area fokus serta kondisi permukaan buah.
        </p>
        <div className="pt-1 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#8DF947] text-black border-2 border-black shadow-[3px_3px_0_#000000] font-passata text-sm uppercase tracking-wider">
            <Leaf size={14} strokeWidth={2.5} />
            <span>FRESHSIGHT</span>
          </span>
        </div>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono-tech uppercase tracking-wider text-white/75 pt-2 px-6" aria-label="Navigasi Footer">
        <Link to="/" onClick={() => sound.play('swoosh')} className="hover:text-[#8DF947] transition-colors">Beranda</Link>
        <Link to="/cara-kerja" onClick={() => sound.play('swoosh')} className="hover:text-[#8DF947] transition-colors">Cara Kerja</Link>
        <Link to="/model" onClick={() => sound.play('swoosh')} className="hover:text-[#8DF947] transition-colors">Model &amp; Data</Link>
        <Link to="/riwayat" onClick={() => sound.play('swoosh')} className="hover:text-[#8DF947] transition-colors">Riwayat</Link>
      </nav>

      <div className="flex items-center gap-4 pt-2">
        <p className="font-mono-tech text-xs text-white/60">
          © 2026 FreshSight
        </p>

        <button
          onClick={scrollToTop}
          className="p-2.5 rounded-xl bg-white/15 hover:bg-[#8DF947] hover:text-black border border-white/25 hover:border-black transition-colors cursor-pointer"
          aria-label="Kembali ke atas halaman"
        >
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>

    </footer>
  );
};

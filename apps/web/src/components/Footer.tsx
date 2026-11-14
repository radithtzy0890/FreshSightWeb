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
    <footer className="py-24 bg-[#0A2E19] text-center text-white relative border-t-2 border-black flex flex-col items-center justify-center space-y-6">

      <Link
        to="/"
        onClick={() => sound.play('swoosh')}
        className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center border-3 border-black shadow-[4px_4px_0_#000000] text-3xl font-bold hover:scale-105 transition-transform cursor-pointer"
        aria-label="Back to home"
      >
        🌿
      </Link>

      <div className="space-y-1.5 max-w-xl mx-auto px-6">
        <p className="font-passata text-xl sm:text-2xl uppercase tracking-tight text-white leading-snug">
          KAMI MENOLAK TEBAK-TEBAKAN. ANALISIS MUTU BUAH BERKATA JUJUR.
        </p>
        <p className="font-passata text-lg sm:text-xl uppercase tracking-tight text-white/90">
          TEKNOLOGI BIO-OPTIK DETEKSI KESEGARAN BUAH DIGITAL
        </p>
        <p className="font-passata text-lg sm:text-xl uppercase tracking-tight text-[#8DF947]">
          OLEH FRESHSIGHT 🍏
        </p>
      </div>

      <p className="font-mono-tech text-xs text-white/60 pt-4">
        © 2026
      </p>

      <button
        onClick={scrollToTop}
        className="mt-4 p-2.5 rounded-xl bg-white/20 hover:bg-[#8DF947] hover:text-black transition-colors cursor-pointer"
        aria-label="Scroll to top"
      >
        <ArrowUp size={16} strokeWidth={2.5} />
      </button>

    </footer>
  );
};

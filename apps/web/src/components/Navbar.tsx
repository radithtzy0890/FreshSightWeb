import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../services/soundEngine';

interface NavbarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [soundActive, setSoundActive] = useState(() => sound.isEnabled());

  const handleSoundToggle = () => {
    const next = sound.toggle();
    setSoundActive(next);
  };

  const handleNav = (id: string) => {
    sound.play('swoosh');
    onNavigate(id);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFC737] border-b-2 border-black transition-colors">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-18 flex items-center justify-between">

        {/* Left Navigation Links */}
        <div className="flex items-center gap-6 sm:gap-8 font-passata text-lg uppercase tracking-tight">
          <button
            onClick={() => handleNav('section-cara-kerja')}
            onMouseEnter={() => sound.play('hover')}
            className="text-black hover:opacity-70 transition-opacity cursor-pointer"
          >
            Cara Kerja
          </button>
        </div>

        {/* Center Iconic Logo: FRESHSIGHT with Japanese Subtitle (Matching Planet Oño) */}
        <button
          onClick={() => handleNav('section-hero')}
          onMouseEnter={() => sound.play('hover')}
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="flex items-center gap-1 font-passata text-2xl sm:text-3xl text-black tracking-tighter uppercase font-bold leading-none">
            <span>FRESH</span>
            <span className="relative inline-flex items-center justify-center">
              SIGHT
              <span className="absolute -top-1.5 right-1.5 text-xs text-white drop-shadow-[0_1px_1px_#000]">✦</span>
            </span>
          </div>
          <span className="font-mono-tech text-[10px] text-black font-bold tracking-widest -mt-0.5">
            新鮮ちゃん
          </span>
        </button>

        {/* Right Navigation & Sound Toggle */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => handleNav('section-riwayat')}
            onMouseEnter={() => sound.play('hover')}
            className="hidden sm:inline font-passata text-lg text-black hover:opacity-70 transition-opacity uppercase cursor-pointer"
          >
            Riwayat
          </button>

          {/* Planet Oño Exact Sound On Oval Pill Button */}
          <button
            onClick={handleSoundToggle}
            onMouseEnter={() => sound.play('hover')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-black bg-white/40 hover:bg-white text-black font-passata text-sm uppercase transition-all shadow-[2px_2px_0_#000000] cursor-pointer"
            aria-label="Toggle Sound"
          >
            <span>{soundActive ? 'Sound on' : 'Sound off'}</span>
            {soundActive ? <Volume2 size={16} strokeWidth={2.5} /> : <VolumeX size={16} strokeWidth={2.5} />}
          </button>
        </div>

      </div>
    </header>
  );
};

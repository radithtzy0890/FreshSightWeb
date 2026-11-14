import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../services/soundEngine';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `font-passata text-lg uppercase tracking-tight transition-opacity hover:opacity-70 cursor-pointer ${
    isActive ? 'text-black' : 'text-black/60'
  }`;

export const Navbar: React.FC = () => {
  const [soundActive, setSoundActive] = useState(() => sound.isEnabled());

  const handleSoundToggle = () => {
    const next = sound.toggle();
    setSoundActive(next);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFC737] border-b-2 border-black transition-colors">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-18 flex items-center justify-between">

        <div className="flex items-center gap-6 sm:gap-8">
          <NavLink
            to="/"
            end
            className={(props) => `${navClass(props)} hidden sm:inline`}
            onMouseEnter={() => sound.play('hover')}
            onClick={() => sound.play('swoosh')}
          >
            Beranda
          </NavLink>
          <NavLink
            to="/cara-kerja"
            className={navClass}
            onMouseEnter={() => sound.play('hover')}
            onClick={() => sound.play('swoosh')}
          >
            Cara Kerja
          </NavLink>
          <NavLink
            to="/model"
            className={(props) => `${navClass(props)} hidden md:inline`}
            onMouseEnter={() => sound.play('hover')}
            onClick={() => sound.play('swoosh')}
          >
            Model
          </NavLink>
        </div>

        <Link
          to="/"
          onMouseEnter={() => sound.play('hover')}
          onClick={() => sound.play('swoosh')}
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
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <NavLink
            to="/riwayat"
            className={(props) => `${navClass(props)} hidden sm:inline`}
            onMouseEnter={() => sound.play('hover')}
            onClick={() => sound.play('swoosh')}
          >
            Riwayat
          </NavLink>

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

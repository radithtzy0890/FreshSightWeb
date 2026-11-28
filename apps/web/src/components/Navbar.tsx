import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Volume2, VolumeX, Menu, X } from 'lucide-react';
import { sound } from '../services/soundEngine';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `font-passata text-base uppercase tracking-tight transition-opacity duration-150 hover:opacity-80 cursor-pointer select-none py-2 ${
    isActive ? 'text-black font-black underline decoration-2 underline-offset-4' : 'text-black/75 font-bold'
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `font-passata text-lg uppercase tracking-tight py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-between min-h-11 ${
    isActive ? 'bg-black text-[var(--fs-bg-hero)] font-black' : 'text-black font-bold hover:bg-black/10'
  }`;

export const Navbar: React.FC = () => {
  const [soundActive, setSoundActive] = useState(() => sound.isEnabled());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSoundToggle = () => {
    const next = sound.toggle();
    setSoundActive(next);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--fs-bg-hero)] border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-10 h-18 flex items-center justify-between gap-2">

        <nav className="hidden md:flex items-center gap-6 lg:gap-8" aria-label="Navigasi Utama">
          <NavLink to="/" end className={navClass} onClick={() => sound.play('swoosh')}>
            Beranda
          </NavLink>
          <NavLink to="/cara-kerja" className={navClass} onClick={() => sound.play('swoosh')}>
            Cara Kerja
          </NavLink>
          <NavLink to="/model" className={navClass} onClick={() => sound.play('swoosh')}>
            Model
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={() => {
            sound.play('click');
            setMobileMenuOpen((prev) => !prev);
          }}
          className="md:hidden min-w-11 min-h-11 flex items-center justify-center rounded-xl border-2 border-black bg-white/80 text-black cursor-pointer shadow-[2px_2px_0_#000] active:scale-95 transition-transform"
          aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
        </button>

        <Link
          to="/"
          onClick={() => sound.play('swoosh')}
          className="flex flex-col items-center cursor-pointer shrink-0"
        >
          <span className="font-passata text-2xl sm:text-3xl text-black tracking-tight uppercase font-bold leading-none">
            FRESHSIGHT
          </span>
          <span className="text-xs text-black/80 font-semibold leading-tight">
            Cek Kesegaran Buah
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <NavLink
            to="/riwayat"
            className={(props) => `${navClass(props)} hidden md:inline`}
            onClick={() => sound.play('swoosh')}
          >
            Riwayat
          </NavLink>

          <button
            type="button"
            onClick={handleSoundToggle}
            className="flex items-center justify-center gap-2 min-w-11 min-h-11 px-3 sm:px-3.5 rounded-full border-2 border-black bg-white/80 hover:bg-white text-black font-passata text-xs uppercase transition-colors shadow-[2px_2px_0_#000] cursor-pointer active:scale-95 font-bold"
            aria-label={soundActive ? 'Matikan efek suara' : 'Aktifkan efek suara'}
            aria-pressed={soundActive}
          >
            <span className="hidden sm:inline">{soundActive ? 'Suara aktif' : 'Suara mati'}</span>
            {soundActive ? <Volume2 size={16} strokeWidth={2.5} /> : <VolumeX size={16} strokeWidth={2.5} />}
          </button>
        </div>

      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Navigasi seluler"
          className="md:hidden bg-[var(--fs-bg-hero)] border-t-2 border-black px-6 py-4 space-y-2 shadow-[0_8px_16px_rgba(0,0,0,0.15)] animate-specimen-pop"
        >
          <NavLink to="/" end className={mobileNavClass} onClick={() => setMobileMenuOpen(false)}>
            <span>Beranda</span>
          </NavLink>
          <NavLink to="/cara-kerja" className={mobileNavClass} onClick={() => setMobileMenuOpen(false)}>
            <span>Cara Kerja</span>
          </NavLink>
          <NavLink to="/model" className={mobileNavClass} onClick={() => setMobileMenuOpen(false)}>
            <span>Model & Data</span>
          </NavLink>
          <NavLink to="/riwayat" className={mobileNavClass} onClick={() => setMobileMenuOpen(false)}>
            <span>Riwayat</span>
          </NavLink>
        </nav>
      )}
    </header>
  );
};

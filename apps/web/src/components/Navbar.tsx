import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Home, ScanSearch, BarChart3, History } from 'lucide-react';
import { sound } from '../services/soundEngine';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `font-passata text-lg uppercase tracking-wide transition-all duration-200 hover:opacity-75 cursor-pointer select-none ${
    isActive ? 'text-black underline decoration-2 underline-offset-4' : 'text-black/70'
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `font-passata text-xl uppercase tracking-wide py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
    isActive ? 'bg-black text-[#FFC737] shadow-[2px_2px_0_#000]' : 'text-black hover:bg-black/10'
  }`;

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFC737]/95 backdrop-blur-md border-b-2 border-black transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 h-18 flex items-center justify-between gap-2">

        {/* Left Wrapper (balances centered logo) */}
        <div className="flex-1 flex items-center">
          {/* Desktop Left Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8" aria-label="Navigasi Utama">
            <NavLink
              to="/"
              end
              className={navClass}
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
              className={navClass}
              onMouseEnter={() => sound.play('hover')}
              onClick={() => sound.play('swoosh')}
            >
              Model
            </NavLink>
          </nav>

          {/* Mobile Menu Button (Hamburger) */}
          <button
            onClick={() => {
              sound.play('click');
              setMobileMenuOpen((prev) => !prev);
            }}
            className="md:hidden p-2 rounded-xl border-2 border-black bg-white/50 text-black cursor-pointer shadow-[2px_2px_0_#000] active:scale-95 transition-transform"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Brand Center Logo with Sparkling Accent */}
        <Link
          to="/"
          onMouseEnter={() => sound.play('hover')}
          onClick={() => sound.play('swoosh')}
          className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105 shrink-0"
        >
          <div className="flex items-center gap-1.5 font-passata text-2xl sm:text-3xl text-black tracking-wide uppercase leading-none">
            <span>FRESH</span>
            <span className="relative inline-flex items-center justify-center">
              SIGHT
              <span className="absolute -top-1.5 -right-2 text-xs text-white drop-shadow-[0_1px_1px_#000] animate-ono-twinkle">✦</span>
            </span>
          </div>
          <span className="font-mono-tech text-[9px] sm:text-[10px] text-black font-bold tracking-widest -mt-0.5">
            新鮮ちゃん
          </span>
        </Link>

        {/* Right Nav: Riwayat (balances centered logo) */}
        <div className="flex-1 flex items-center justify-end">
          <NavLink
            to="/riwayat"
            className={(props) => `${navClass(props)} hidden md:inline`}
            onMouseEnter={() => sound.play('hover')}
            onClick={() => sound.play('swoosh')}
          >
            Riwayat
          </NavLink>
        </div>

      </div>

      {/* Mobile Slide-down Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFC737] border-t-2 border-black px-6 py-4 space-y-2 shadow-[0_8px_16px_rgba(0,0,0,0.15)] animate-specimen-pop">
          <NavLink
            to="/"
            end
            className={mobileNavClass}
            onClick={() => {
              sound.play('click');
              setMobileMenuOpen(false);
            }}
          >
            <span className="inline-flex items-center gap-2"><Home size={18} strokeWidth={2.5} /> Beranda</span>
            <span>✦</span>
          </NavLink>
          <NavLink
            to="/cara-kerja"
            className={mobileNavClass}
            onClick={() => {
              sound.play('click');
              setMobileMenuOpen(false);
            }}
          >
            <span className="inline-flex items-center gap-2"><ScanSearch size={18} strokeWidth={2.5} /> Cara Kerja</span>
            <span>✦</span>
          </NavLink>
          <NavLink
            to="/model"
            className={mobileNavClass}
            onClick={() => {
              sound.play('click');
              setMobileMenuOpen(false);
            }}
          >
            <span className="inline-flex items-center gap-2"><BarChart3 size={18} strokeWidth={2.5} /> Model & Data</span>
            <span>✦</span>
          </NavLink>
          <NavLink
            to="/riwayat"
            className={mobileNavClass}
            onClick={() => {
              sound.play('click');
              setMobileMenuOpen(false);
            }}
          >
            <span className="inline-flex items-center gap-2"><History size={18} strokeWidth={2.5} /> Riwayat</span>
            <span>✦</span>
          </NavLink>
        </div>
      )}
    </header>
  );
};

import React from 'react';
import { Leaf, Sun, Moon, ArrowRight } from 'lucide-react';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  theme,
  onToggleTheme,
}) => {
  const navItems = [
    { id: 'section-beranda', label: 'Beranda' },
    { id: 'section-analisis', label: 'Analisis' },
    { id: 'section-hasil', label: 'Hasil' },
    { id: 'section-riwayat', label: 'Riwayat' },
    { id: 'section-model', label: 'Model & Data' },
  ];

  return (
    <>
      {/* Decorative Scroll Progress Bar (aria-hidden per Modern Web Guidance) */}
      <div id="scroll-progress" aria-hidden="true" />

      <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3 transition-all duration-300">
        <div className="max-w-6xl mx-auto surface-glass rounded-full px-5 py-2.5 flex items-center justify-between shadow-lg">
          {/* Brand Logo */}
          <button
            onClick={() => onNavigate('section-beranda')}
            className="flex items-center gap-2 text-base font-bold tracking-tight text-[var(--text-main)] group cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-[var(--leaf-primary)] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <Leaf className="w-4 h-4" />
            </span>
            <span className="font-editorial text-lg tracking-tight">
              Fresh<span className="text-[var(--leaf-primary)] font-bold">Sight</span>
            </span>
          </button>

          {/* Navigation Items */}
          <nav
            className="relative hidden md:flex items-center gap-1 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold"
            aria-label="Menu Utama"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--text-main)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-sm"
              aria-label="Ganti Tema Gelap / Terang"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FBBF24]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </button>

            <button
              onClick={() => onNavigate('section-analisis')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <span>Unggah Foto</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};


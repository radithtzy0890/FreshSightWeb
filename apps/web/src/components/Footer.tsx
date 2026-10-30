import React from 'react';
import { Leaf } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="py-12 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-muted)]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--leaf-primary)] text-white flex items-center justify-center">
            <Leaf className="w-3 h-3" />
          </span>
          <span className="font-editorial text-sm font-bold text-[var(--text-main)]">FreshSight</span>
          <span>— Sistem Klasifikasi Kesegaran Buah Berbasis Citra & Grad-CAM</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Lisensi Riset Terbuka</span>
          <span>•</span>
          <button
            onClick={() => onNavigate('section-beranda')}
            className="hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Kembali ke Atas
          </button>
        </div>
      </div>
    </footer>
  );
};


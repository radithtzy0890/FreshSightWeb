import React, { useState } from 'react';
import { Search, Trash2, FileText } from 'lucide-react';
import { FruitSvg } from './FruitSvg';
import { AnalysisResult, FruitType } from '../types';
import {
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
} from '../services/cvEngine';

interface HistoryJournalProps {
  history: AnalysisResult[];
  onSelectDetail: (item: AnalysisResult) => void;
  onDeleteItem: (id: number) => void;
  onClearAll: () => void;
  onNavigate: (sectionId: string) => void;
}

export const HistoryJournal: React.FC<HistoryJournalProps> = ({
  history,
  onSelectDetail,
  onDeleteItem,
  onClearAll,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fruitFilter, setFruitFilter] = useState<FruitType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'f' | 'r' | ''>('');

  const filtered = history.filter((item) => {
    const title = getDiagnosisTitle(item).toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || title.includes(query);
    const matchesFruit = !fruitFilter || item.fruit === fruitFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'r' ? item.rot === 1 : item.rot === 0);
    return matchesSearch && matchesFruit && matchesStatus;
  });

  return (
    <section id="section-riwayat" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">
              Riwayat Perangkat
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
              Analisis Tersimpan
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {history.length} tersimpan di perangkat ini
            </span>
            {history.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] text-[#C9421A] hover:bg-[#FDE8E1] dark:hover:bg-[#361919] transition-all cursor-pointer"
              >
                Bersihkan Riwayat
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-8">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama buah..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)]"
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={fruitFilter}
              onChange={(e) => setFruitFilter(e.target.value as FruitType | '')}
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)] cursor-pointer"
            >
              <option value="">Semua Buah</option>
              <option value="apple">Apel</option>
              <option value="banana">Pisang</option>
              <option value="orange">Jeruk</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'f' | 'r' | '')}
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)] cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="f">Segar</option>
              <option value="r">Busuk</option>
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        {filtered.length === 0 ? (
          <div className="surface-card p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-dim)] mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <div className="font-editorial text-2xl font-bold text-[var(--text-main)] mb-1">
              {history.length === 0 ? 'Belum ada riwayat analisis' : 'Tidak ada riwayat yang cocok'}
            </div>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
              {history.length === 0
                ? 'Setiap foto buah yang Anda klasifikasikan akan otomatis tersimpan di peramban ini.'
                : 'Coba gunakan kata kunci pencarian lain atau setel ulang filter.'}
            </p>
            <button
              onClick={() => onNavigate('section-analisis')}
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer"
            >
              Analisis Foto Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => {
              const isRot = item.rot === 1;
              const badgeColor = isRot
                ? 'bg-[#FDE8E1] text-[#C9421A] dark:bg-[#361919] dark:text-[#F87171]'
                : 'bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]';
              return (
                <div
                  key={item.id}
                  className="surface-card-interactive p-4 sm:p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#ECE7DC] dark:bg-[#1A281F] flex-none relative">
                        {item.thumb ? (
                          <img src={item.thumb} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <FruitSvg
                            fruit={item.fruit}
                            isRotten={item.rot}
                            spotCount={item.n}
                            viewMode="asli"
                            isBare
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[var(--text-main)] truncate">
                          {getDiagnosisTitle(item)}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          {item.date} · {formatPercent(item.conf)}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${badgeColor}`}>
                          {isRot ? 'Busuk' : 'Segar'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-4">
                      {getExplanationText(item)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => onSelectDetail(item)}
                      className="text-xs font-semibold text-[var(--leaf-primary)] hover:underline cursor-pointer"
                    >
                      Lihat Detail
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[#C9421A] transition-all cursor-pointer"
                      title="Hapus catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};


import React, { useState, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { AnalysisResult, Verdict } from '../types';
import {
  FRUIT_NAMES,
  formatPercent,
  getDiagnosisTitle,
  getVerdictMeta,
  resolveVerdict,
} from '../services/cvEngine';
import { sound } from '../services/soundEngine';
import { ResultDetailModal } from './ResultDetailModal';

interface HistoryJournalProps {
  history: AnalysisResult[];
  onSelectDetail: (item: AnalysisResult) => void;
  onDeleteItem: (id: number) => void;
  onUpdateItem?: (item: AnalysisResult) => void;
  onClearAll: () => void;
  onNavigate: (id: string) => void;
}

export const HistoryJournal: React.FC<HistoryJournalProps> = ({
  history,
  onSelectDetail,
  onDeleteItem,
  onUpdateItem,
  onClearAll,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFruit, setFilterFruit] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [detailItem, setDetailItem] = useState<AnalysisResult | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const itemVerdict = resolveVerdict(item);
      const title = getDiagnosisTitle(item).toLowerCase();
      const matchesSearch = !searchQuery || title.includes(searchQuery.toLowerCase());
      const matchesFruit = filterFruit === 'all' || item.fruit === filterFruit;
      const matchesStatus = filterStatus === 'all' || itemVerdict === filterStatus;
      return matchesSearch && matchesFruit && matchesStatus;
    });
  }, [history, searchQuery, filterFruit, filterStatus]);

  const handleOpenDetail = (item: AnalysisResult) => {
    sound.play('click');
    onSelectDetail(item);
    setDetailItem(item);
  };

  return (
    <section
      id="section-riwayat"
      className="pt-28 pb-20 min-h-screen bg-[var(--fs-green-dark)] text-white relative border-t-2 border-black"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-mono-tech uppercase tracking-widest text-[var(--fs-accent)]">
              Tersimpan Lokal di Perangkat
            </p>
            <h1 className="font-passata text-3xl sm:text-4xl uppercase tracking-tight text-white">
              Riwayat Pemeriksaan
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-[var(--fs-accent)] text-black font-passata text-xs font-bold border-2 border-black">
              {history.length} Tersimpan
            </span>

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  sound.play('click');
                  onClearAll();
                }}
                className="min-h-11 px-4 py-2 rounded-xl bg-white/15 hover:bg-[#B91C1C] text-white text-xs font-passata uppercase font-bold transition-colors cursor-pointer border border-white/30"
              >
                Hapus Semua
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[var(--fs-surface)] text-black p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0_#000]">
          <div className="sm:col-span-5 relative flex items-center">
            <label htmlFor="history-search" className="sr-only">
              Cari riwayat berdasarkan nama buah atau status
            </label>
            <Search size={16} className="absolute left-3.5 text-black/70 pointer-events-none" />
            <input
              id="history-search"
              type="text"
              placeholder="Cari apel, pisang, jeruk, segar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-11 pl-10 pr-3 py-2 rounded-xl border-2 border-black bg-white text-sm text-black placeholder:text-black/60"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="history-fruit-filter" className="sr-only">
              Saring berdasarkan jenis buah
            </label>
            <select
              id="history-fruit-filter"
              value={filterFruit}
              onChange={(e) => setFilterFruit(e.target.value)}
              className="w-full min-h-11 px-3 py-2 rounded-xl border-2 border-black bg-white text-sm font-semibold text-black cursor-pointer"
            >
              <option value="all">Semua jenis buah</option>
              <option value="apple">Apel</option>
              <option value="banana">Pisang</option>
              <option value="orange">Jeruk</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="history-status-filter" className="sr-only">
              Saring berdasarkan status kesegaran
            </label>
            <select
              id="history-status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full min-h-11 px-3 py-2 rounded-xl border-2 border-black bg-white text-sm font-semibold text-black cursor-pointer"
            >
              <option value="all">Semua status</option>
              <option value="segar">Segar</option>
              <option value="busuk">Tidak Segar</option>
              <option value="ragu">Ragu</option>
              <option value="tidak_terdeteksi">Tidak Terdeteksi</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white/10 border-2 border-dashed border-white/35 text-center space-y-4">
            <p className="font-passata text-lg text-white">
              {history.length === 0
                ? 'Belum ada riwayat pemeriksaan tersimpan.'
                : 'Tidak ada riwayat yang cocok dengan filter pencarian.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="btn-action-wide-ono text-sm"
            >
              Periksa Buah Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHistory.map((item) => {
              const verdict: Verdict = resolveVerdict(item);
              const meta = getVerdictMeta(verdict);
              const photo = item.thumb || item.img || '/fruit/apple_fresh.jpg';
              const fruitName = FRUIT_NAMES[item.fruit] || item.fruit;
              const parsedDate = item.date ? new Date(item.date) : null;
              const dateStr =
                parsedDate && !Number.isNaN(parsedDate.getTime())
                  ? parsedDate.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : item.date || 'Baru saja';

              return (
                <article
                  key={item.id}
                  className="rounded-3xl bg-[var(--fs-surface)] text-black border-2 border-black shadow-[5px_5px_0_#000] p-4 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-white border-2 border-black flex items-center justify-center">
                      <img
                        src={photo}
                        alt={`Foto ${fruitName}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h2 className="font-passata text-base sm:text-lg text-black uppercase font-bold truncate">
                        {getDiagnosisTitle(item)}
                      </h2>
                      <p className="font-mono-tech text-xs text-black/75">
                        {dateStr}
                        {verdict !== 'tidak_terdeteksi' ? ` · ${formatPercent(item.conf)}` : ''}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-passata font-bold border border-black ${meta.softBadgeClass}`}
                      >
                        {meta.badgeText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-3 border-t border-black/15">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item)}
                      className="flex-1 min-h-11 py-2 px-3 rounded-xl bg-white hover:bg-[var(--fs-accent)] border-2 border-black font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000] cursor-pointer"
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.play('click');
                        onDeleteItem(item.id);
                      }}
                      className="min-h-11 py-2 px-3.5 rounded-xl bg-white hover:bg-[#B91C1C] hover:text-white border-2 border-black font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1"
                      aria-label={`Hapus riwayat ${getDiagnosisTitle(item)}`}
                    >
                      <Trash2 size={14} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {detailItem && (
        <ResultDetailModal
          result={detailItem}
          onClose={() => setDetailItem(null)}
          onUpdateItem={onUpdateItem}
          onAnalyzeAgain={() => {
            setDetailItem(null);
            onNavigate('/');
          }}
        />
      )}
    </section>
  );
};

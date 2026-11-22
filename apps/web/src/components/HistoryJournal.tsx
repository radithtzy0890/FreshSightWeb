import React, { useState, useMemo } from 'react';
import { Maximize2, Trash2, X, Search, FileText, Copy, RotateCcw, Check, Sparkles } from 'lucide-react';
import { AnalysisResult, Verdict } from '../types';
import {
  FRUIT_NAMES,
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
  MODEL_LABELS,
  resolveVerdict,
} from '../services/cvEngine';
import { sound } from '../services/soundEngine';

interface HistoryJournalProps {
  history: AnalysisResult[];
  onSelectDetail: (item: AnalysisResult) => void;
  onDeleteItem: (id: number) => void;
  onUpdateItem?: (item: AnalysisResult) => void;
  onClearAll: () => void;
  onNavigate: (id: string) => void;
}

const verdictLabel = (verdict: Verdict): string =>
  verdict === 'segar'
    ? 'Segar'
    : verdict === 'busuk'
    ? 'Busuk'
    : verdict === 'tidak_terdeteksi'
    ? 'Tidak Terdeteksi'
    : 'Ragu';

const verdictBadgeLabel = (verdict: Verdict): string =>
  verdict === 'segar'
    ? '✓ Segar'
    : verdict === 'busuk'
    ? '× Busuk'
    : verdict === 'tidak_terdeteksi'
    ? '⊘ Non-Buah'
    : '? Ragu';

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
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'asli' | 'cam' | 'mask'>('asli');
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionLabel, setCorrectionLabel] = useState('fresh_apple');

  // Filtered History list
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const fruitName = FRUIT_NAMES[item.fruit] || item.fruit;
      const itemVerdict = resolveVerdict(item);
      const statusText = verdictLabel(itemVerdict).toLowerCase();
      const title = `${fruitName} ${statusText}`.toLowerCase();
      const matchesSearch = !searchQuery || title.includes(searchQuery.toLowerCase());
      const matchesFruit = filterFruit === 'all' || item.fruit === filterFruit;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'segar' && itemVerdict === 'segar') ||
        (filterStatus === 'busuk' && itemVerdict === 'busuk') ||
        (filterStatus === 'ragu' && itemVerdict === 'ragu') ||
        (filterStatus === 'tidak_terdeteksi' && itemVerdict === 'tidak_terdeteksi');
      return matchesSearch && matchesFruit && matchesStatus;
    });
  }, [history, searchQuery, filterFruit, filterStatus]);

  // Duplicate items for seamless continuous marquee loop if items exist
  const marqueeItems = useMemo(() => {
    if (history.length === 0) return [];
    if (history.length >= 6) return [...history, ...history];
    return [...history, ...history, ...history, ...history];
  }, [history]);

  const handleOpenDetail = (item: AnalysisResult) => {
    sound.play('click');
    onSelectDetail(item);
    setDetailItem(item);
    setViewMode('asli');
    setFeedbackSent(
      item.userCorrection
        ? `Koreksi tersimpan: ${item.userCorrection.replace('_', ' ')}`
        : item.userVerified
        ? 'Terverifikasi benar oleh pengguna.'
        : null
    );
    setShowCorrection(false);
  };

  const handleCopySummary = (item: AnalysisResult) => {
    sound.play('click');
    const title = getDiagnosisTitle(item);
    const text = `${title} (${formatPercent(item.conf)}). ${getExplanationText(item)}`;
    navigator.clipboard?.writeText(text);
  };

  const handleDownloadSummary = (item: AnalysisResult) => {
    sound.play('click');
    const itemVerdict = resolveVerdict(item);
    const parsedDate = new Date(item.date);
    const safeDate = Number.isNaN(parsedDate.getTime())
      ? item.date
      : parsedDate.toLocaleString('id-ID');
    const lines = [
      'FreshSight - Ringkasan Analisis',
      `Tanggal: ${safeDate}`,
      `Diagnosis: ${getDiagnosisTitle(item)}`,
      `Status: ${verdictLabel(itemVerdict)}`,
      `Keyakinan: ${formatPercent(item.conf)}`,
      `Rasio area cacat: ${item.rasio || 0}%`,
      `Jumlah bercak: ${item.n || 0}`,
      `Lokasi bercak: ${item.loc || '–'}`,
      `Jarak warna: ${item.jw ?? 0}`,
      `Tekstur: ${item.tk ?? 0}`,
      `Model: ${item.model}`,
      ...(item.userCorrection ? [`Koreksi pengguna: ${item.userCorrection}`] : []),
      '',
      'Penjelasan:',
      getExplanationText(item),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `freshsight-${item.fruit}-${item.id}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const detailVerdict: Verdict = detailItem ? resolveVerdict(detailItem) : 'ragu';

  return (
    <section id="section-riwayat" className="py-24 bg-[#0A2E19] text-white relative overflow-hidden border-t-2 border-black">

      <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10 space-y-12">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[#8DF947]">
              <Sparkles size={14} />
              <span>Rekam Jejak Bio-Optik</span>
            </div>
            <h3 className="font-passata text-3xl sm:text-4xl uppercase tracking-tight text-white">
              HISTORI FOTO TERKIRIM
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#8DF947] text-black font-passata text-xs font-bold border-2 border-black shadow-[2px_2px_0_#000000]">
              {history.length} TERSIMPAN
            </span>

            {history.length > 0 && (
              <button
                onClick={() => {
                  sound.play('click');
                  onClearAll();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-[#EB3322] hover:text-white text-xs font-passata uppercase transition-colors cursor-pointer border border-white/20"
              >
                Hapus Semua
              </button>
            )}
          </div>
        </div>

        {/* 1. ANIMATED RUNNING REEL / MARQUEE TICKER (Sesuai Permintaan Foto Berjalan) */}
        {marqueeItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-tech text-white/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8DF947] animate-ping" />
                <span>REEL SPESIMEN BERJALAN (HOVER UNTUK JEDA / KLIK DETAIL)</span>
              </span>
            </div>

            <div className="marquee-container py-2">
              <div className="marquee-track">
                {marqueeItems.map((item, idx) => {
                  const verdict: Verdict = resolveVerdict(item);
                  const photo = item.thumb || item.img || '/fruit/apple_fresh.jpg';
                  const fruitName = FRUIT_NAMES[item.fruit] || item.fruit;

                  return (
                    <div
                      key={`marquee-${item.id}-${idx}`}
                      className="w-44 sm:w-52 shrink-0 rounded-2xl bg-[#F7F2E5] text-black border-3 border-black shadow-[4px_4px_0_#000000] overflow-hidden p-2.5 flex flex-col justify-between transition-transform hover:-translate-y-1.5 hover:shadow-[6px_6px_0_#000000] cursor-pointer group"
                      onClick={() => handleOpenDetail(item)}
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#ECE7DC] border-2 border-black mb-2 flex items-center justify-center">
                        <img
                          src={photo}
                          alt={fruitName}
                          className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Stamped Badge */}
                        <span
                          className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-passata uppercase font-bold border border-black shadow-xs ${
                            verdict === 'segar'
                              ? 'bg-[#8DF947] text-black'
                              : verdict === 'busuk'
                              ? 'bg-[#EB3322] text-white'
                              : 'bg-[#FFC737] text-black'
                          }`}
                        >
                          {verdictBadgeLabel(verdict)}
                        </span>

                        {/* Quick View Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.play('click');
                            setLightboxPhoto(photo);
                          }}
                          className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity border border-black shadow-xs"
                          title="Perbesar foto"
                        >
                          <Maximize2 size={12} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Info & Tactile Actions */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-passata">
                          <span className="font-bold text-black uppercase truncate">{getDiagnosisTitle(item)}</span>
                          <span className="font-mono-tech text-[10px] text-black/70 font-bold">{formatPercent(item.conf)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(item);
                            }}
                            className="flex-1 py-1 rounded-lg bg-white hover:bg-[#8DF947] border border-black font-passata text-[11px] uppercase font-bold text-center transition-colors shadow-[1px_1px_0_#000000]"
                          >
                            Detail
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.play('click');
                              onDeleteItem(item.id);
                            }}
                            className="p-1 rounded-lg bg-white/70 hover:bg-[#EB3322] hover:text-white border border-black transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. SEARCH & FILTER CONTROLS (Sesuai Referensi Gambar 4: media_1793577359096_98467ab7.png) */}
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#F7F2E5] text-black p-3.5 sm:p-4 rounded-2xl border-3 border-black shadow-[4px_4px_0_#000000]">
            {/* Search Input */}
            <div className="sm:col-span-5 relative flex items-center">
              <Search size={16} className="absolute left-3.5 text-black/60 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari buah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-black bg-white font-passata text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#8DF947]"
              />
            </div>

            {/* Filter Fruit */}
            <div className="sm:col-span-4">
              <select
                value={filterFruit}
                onChange={(e) => setFilterFruit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white font-passata text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#8DF947] cursor-pointer"
              >
                <option value="all">Semua buah</option>
                <option value="apple">Apel (Fuji)</option>
                <option value="banana">Pisang (Cavendish)</option>
                <option value="orange">Jeruk (Valencia)</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="sm:col-span-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-black bg-white font-passata text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#8DF947] cursor-pointer"
              >
                <option value="all">Semua status</option>
                <option value="segar">Segar</option>
                <option value="busuk">Busuk</option>
                <option value="ragu">Ragu</option>
                <option value="tidak_terdeteksi">Tidak Terdeteksi</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredHistory.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 text-center space-y-3">
              <p className="font-passata text-lg text-white/80">
                {history.length === 0
                  ? 'Belum ada rekam jejak tersimpan. Mulai foto buah di babak atas!'
                  : 'Tidak ada spesimen yang cocok dengan filter pencarian.'}
              </p>
              <button
                onClick={() => onNavigate('/')}
                className="btn-action-wide-ono text-sm"
              >
                Ambil Foto Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredHistory.map((item) => {
                const verdict: Verdict = resolveVerdict(item);
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
                  <div
                    key={item.id}
                    className="rounded-3xl bg-[#F7F2E5] text-black border-3 border-black shadow-[5px_5px_0_#000000] p-4 flex flex-col justify-between transition-transform hover:-translate-y-1"
                  >
                    <div className="flex items-start gap-4">
                      {/* Photo Thumbnail */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-white border-2 border-black flex items-center justify-center shadow-xs">
                        <img
                          src={photo}
                          alt={fruitName}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>

                      {/* Card Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-passata text-lg text-black uppercase font-bold truncate">
                          {getDiagnosisTitle(item)}
                        </h4>
                        <p className="font-mono-tech text-xs text-black/70">
                          {dateStr} · {formatPercent(item.conf)}
                        </p>
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-passata font-bold border border-black shadow-xs ${
                              verdict === 'segar'
                                ? 'bg-[#8DF947] text-black'
                                : verdict === 'busuk'
                                ? 'bg-[#FDE8E1] text-[#C9421A]'
                                : 'bg-[#FFE8B3] text-[#B45309]'
                            }`}
                          >
                            {verdictBadgeLabel(verdict)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Two Buttons: Detail & Hapus (Sesuai Referensi Gambar 4) */}
                    <div className="flex items-center gap-2 pt-4 mt-2 border-t border-black/15">
                      <button
                        onClick={() => handleOpenDetail(item)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-white hover:bg-[#8DF947] border-2 border-black font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000000] cursor-pointer"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => {
                          sound.play('click');
                          onDeleteItem(item.id);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-white hover:bg-[#EB3322] hover:text-white border-2 border-black font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000000] cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 3. FULL DETAIL INSPECTION MODAL (Sesuai Persis Gambar 3: media_1793577331613_6783092a.jpg) */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 overflow-y-auto overscroll-contain"
          data-lenis-prevent
          onClick={() => setDetailItem(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[10px_10px_0_#000000] p-6 sm:p-8 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                sound.play('click');
                setDetailItem(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-[#EB3322] hover:text-white border-2 border-black shadow-[2px_2px_0_#000000] cursor-pointer transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Big Photo & Layer Mode Switcher */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-3 border-black shadow-[6px_6px_0_#000000] bg-white flex items-center justify-center">
                  <img
                    src={
                      viewMode === 'cam' && detailItem.cam
                        ? detailItem.cam
                        : viewMode === 'mask' && detailItem.msk
                        ? detailItem.msk
                        : detailItem.img || detailItem.thumb || '/fruit/apple_fresh.jpg'
                    }
                    alt="Spesimen Analisis"
                    className="w-full h-full object-contain p-2"
                  />

                  {/* Stamped Corner Badge */}
                  <span
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-passata uppercase font-bold border-2 border-black shadow-xs ${
                      detailVerdict === 'segar'
                        ? 'bg-[#8DF947] text-black'
                        : detailVerdict === 'busuk'
                        ? 'bg-[#EB3322] text-white'
                        : 'bg-[#FFC737] text-black'
                    }`}
                  >
                    {verdictBadgeLabel(detailVerdict)}
                  </span>
                </div>

                {/* Layer Toggle Switcher if Grad-CAM / Mask is available */}
                {(detailItem.cam || detailItem.msk) && (
                  <div className="flex items-center gap-1.5 mt-4 p-1 rounded-xl bg-white border-2 border-black">
                    <button
                      onClick={() => setViewMode('asli')}
                      className={`px-3 py-1 rounded-lg text-xs font-passata uppercase font-bold transition-colors ${
                        viewMode === 'asli' ? 'bg-black text-white' : 'hover:bg-black/10'
                      }`}
                    >
                      Asli
                    </button>
                    {detailItem.cam && (
                      <button
                        onClick={() => setViewMode('cam')}
                        className={`px-3 py-1 rounded-lg text-xs font-passata uppercase font-bold transition-colors ${
                          viewMode === 'cam' ? 'bg-black text-white' : 'hover:bg-black/10'
                        }`}
                      >
                        Grad-CAM
                      </button>
                    )}
                    {detailItem.msk && (
                      <button
                        onClick={() => setViewMode('mask')}
                        className={`px-3 py-1 rounded-lg text-xs font-passata uppercase font-bold transition-colors ${
                          viewMode === 'mask' ? 'bg-black text-white' : 'hover:bg-black/10'
                        }`}
                      >
                        Area Cacat
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Deep Diagnostics Breakdown */}
              <div className="lg:col-span-7 space-y-6">

                {/* Title & Badge */}
                <div>
                  <span
                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-passata uppercase font-bold border border-black mb-2 ${
                      detailVerdict === 'segar'
                        ? 'bg-[#E6F3EA] text-[#1C6E3D]'
                        : detailVerdict === 'busuk'
                        ? 'bg-[#FDE8E1] text-[#C9421A]'
                        : 'bg-[#FFE8B3] text-[#B45309]'
                    }`}
                  >
                    {verdictBadgeLabel(detailVerdict)}
                  </span>
                  <h3 className="font-passata text-3xl sm:text-4xl text-black font-bold uppercase tracking-tight">
                    {getDiagnosisTitle(detailItem)}
                  </h3>
                </div>

                {/* Gauge Circle Ring & Model Stats */}
                <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0_#000000]">
                  {/* Circular SVG Ring */}
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#E5E7EB"
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke={
                          detailVerdict === 'segar'
                            ? '#1C6E3D'
                            : detailVerdict === 'busuk'
                            ? '#C9421A'
                            : '#B45309'
                        }
                        strokeWidth="10"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 * (1 - detailItem.conf)}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute font-passata text-sm font-bold text-black">
                      {formatPercent(detailItem.conf)}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-black uppercase tracking-wide">Tingkat keyakinan</div>
                    <div className="text-black/80">
                      Model <span className="font-bold">{detailItem.model || 'analisis-warna (demo)'}</span> · {detailItem.ms || 195} ms
                    </div>
                    <div className="text-black/60 font-mono-tech text-[10px]">
                      Mode demo: sensor bio-optik non-invasif.
                    </div>
                  </div>
                </div>

                {/* Editorial Explanation Paragraph */}
                <p className="text-sm text-black/90 leading-relaxed font-medium bg-white/70 p-3.5 rounded-2xl border border-black/20">
                  {getExplanationText(detailItem)}
                </p>

                {/* Probabilitas 6 Kelas */}
                <div className="space-y-2">
                  <h4 className="font-passata text-sm uppercase font-bold text-black tracking-wider">
                    Probabilitas 6 kelas
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {MODEL_LABELS.map((lbl: string, idx: number) => {
                      const prob = detailItem.p?.[idx] ?? 0;
                      const isTarget =
                        (lbl.includes('apple') && detailItem.fruit === 'apple') ||
                        (lbl.includes('banana') && detailItem.fruit === 'banana') ||
                        (lbl.includes('orange') && detailItem.fruit === 'orange');
                      const isRotMatch =
                        (lbl.startsWith('rotten') && detailItem.rot === 1) ||
                        (lbl.startsWith('fresh') && detailItem.rot === 0);
                      const isHighlighted = detailVerdict !== 'ragu' && isTarget && isRotMatch;

                      return (
                        <div key={lbl} className="flex items-center gap-3">
                          <span className="w-28 font-mono-tech text-[11px] text-black/80 truncate">
                            {lbl.replace('_', ' ')}
                          </span>
                          <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isHighlighted
                                  ? detailItem.rot
                                    ? 'bg-[#C9421A]'
                                    : 'bg-[#1C6E3D]'
                                  : 'bg-black/40'
                              }`}
                              style={{ width: `${Math.max(prob * 100, 2)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-mono-tech text-[11px] text-black/80 font-bold">
                            {formatPercent(prob)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ciri Terukur (Definition List) */}
                <div className="space-y-2 pt-2 border-t border-black/15">
                  <h4 className="font-passata text-sm uppercase font-bold text-black tracking-wider">
                    Ciri terukur
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                      <span className="text-black/70 font-medium">Rasio area cacat</span>
                      <span className="font-bold font-mono-tech">{detailItem.rasio}%</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                      <span className="text-black/70 font-medium">Jumlah bercak</span>
                      <span className="font-bold font-mono-tech">{detailItem.n}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                      <span className="text-black/70 font-medium">Lokasi bercak</span>
                      <span className="font-bold font-mono-tech">{detailItem.loc}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                      <span className="text-black/70 font-medium">Jarak warna</span>
                      <span className="font-bold font-mono-tech">{detailItem.jw}</span>
                    </div>
                    <div className="col-span-2 flex justify-between p-2 rounded-xl bg-white border border-black/15">
                      <span className="text-black/70 font-medium">Tekstur</span>
                      <span className="font-bold font-mono-tech">{detailItem.tk}</span>
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-black space-y-2">
                  <div className="text-xs font-passata text-black/80 font-bold uppercase">
                    Apakah hasil ini benar?
                  </div>
                  {feedbackSent ? (
                    <div className="text-xs font-bold text-[#1C6E3D] flex items-center gap-1.5">
                      <Check size={14} />
                      <span>{feedbackSent}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            sound.play('click');
                            const updated: AnalysisResult = {
                              ...detailItem,
                              userVerified: true,
                              userCorrection: undefined,
                            };
                            setDetailItem(updated);
                            onUpdateItem?.(updated);
                            setFeedbackSent('Terima kasih! Umpan balik tersimpan di arsip.');
                          }}
                          className="py-1 px-3 rounded-lg border-2 border-black bg-white hover:bg-[#8DF947] font-passata text-xs uppercase font-bold transition-colors cursor-pointer"
                        >
                          Ya, benar
                        </button>
                        <button
                          onClick={() => {
                            sound.play('click');
                            setShowCorrection(true);
                          }}
                          className="py-1 px-3 rounded-lg border-2 border-black bg-white hover:bg-[#FDE8E1] font-passata text-xs uppercase font-bold transition-colors cursor-pointer"
                        >
                          Tidak, salah
                        </button>
                      </div>

                      {showCorrection && (
                        <div className="flex items-center gap-2 pt-1">
                          <select
                            value={correctionLabel}
                            onChange={(e) => setCorrectionLabel(e.target.value)}
                            className="flex-1 py-1 px-2.5 rounded-lg border-2 border-black bg-white text-xs font-passata"
                          >
                            {MODEL_LABELS.map((lbl: string) => (
                              <option key={lbl} value={lbl}>
                                {lbl.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              sound.play('click');
                              const updated: AnalysisResult = {
                                ...detailItem,
                                userVerified: false,
                                userCorrection: correctionLabel,
                              };
                              setDetailItem(updated);
                              onUpdateItem?.(updated);
                              setFeedbackSent(`Koreksi tersimpan: ${correctionLabel.replace('_', ' ')}`);
                              setShowCorrection(false);
                            }}
                            className="py-1 px-3 rounded-lg bg-black text-white font-passata text-xs uppercase font-bold cursor-pointer"
                          >
                            Kirim koreksi
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons: Analisis lagi, Unduh Ringkasan, Salin ringkasan */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      sound.play('click');
                      setDetailItem(null);
                      onNavigate('/');
                    }}
                    className="flex-1 py-2 px-4 rounded-xl bg-black text-white hover:bg-black/85 font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000000] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Analisis lagi</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSummary(detailItem)}
                    className="py-2 px-4 rounded-xl bg-white hover:bg-black/10 border-2 border-black font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000000] flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Unduh Ringkasan</span>
                  </button>

                  <button
                    onClick={() => handleCopySummary(detailItem)}
                    className="py-2 px-4 rounded-xl bg-white hover:bg-black/10 border-2 border-black font-passata text-xs uppercase font-bold transition-colors shadow-[2px_2px_0_#000000] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Salin ringkasan</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => {
            sound.play('click');
            setLightboxPhoto(null);
          }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[85vh] p-3 rounded-3xl border-3 border-black bg-[#F7F2E5] shadow-[8px_8px_0_#000000]">
            <img src={lightboxPhoto} alt="Full photo" className="max-h-[75vh] rounded-2xl object-contain border-2 border-black" />
            <button
              onClick={() => {
                sound.play('click');
                setLightboxPhoto(null);
              }}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-[#8DF947] text-black border-2 border-black cursor-pointer shadow-md"
            >
              <X size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

    </section>
  );
};

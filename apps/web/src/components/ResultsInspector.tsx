import React, { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Copy, Printer, RefreshCw, Scan } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FruitSvg } from './FruitSvg';
import { AnalysisResult, InspectionViewMode } from '../types';
import {
  FRUIT_KEYS,
  MODEL_LABELS,
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
} from '../services/cvEngine';

interface ResultsInspectorProps {
  result: AnalysisResult | null;
  onNavigate: (sectionId: string) => void;
  showToast: (msg: string, type?: 'default' | 'success' | 'error') => void;
}

export const ResultsInspector: React.FC<ResultsInspectorProps> = ({
  result,
  onNavigate,
  showToast,
}) => {
  const [viewMode, setViewMode] = useState<InspectionViewMode>('asli');
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    if (!result) return;
    setViewMode('asli');
    setOpacity(100);

    // Trigger confetti if fruit is classified fresh with high confidence
    if (!result.rot && result.conf >= 0.88) {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#1C6E3D', '#52D487', '#EFA018', '#FFF'],
      });
    }
  }, [result]);

  if (!result) {
    return (
      <section
        id="section-hasil"
        className="py-20 lg:py-28 bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col mb-10">
            <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">
              Diagnostik Lengkap
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
              Hasil Klasifikasi & Grad-CAM
            </h2>
          </div>

          <div className="surface-card p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-dim)] mb-4">
              <Scan className="w-8 h-8" />
            </div>
            <div className="font-editorial text-2xl font-bold text-[var(--text-main)] mb-1">
              Belum Ada Hasil Analisis
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mb-6">
              Silakan unggah foto buah Anda di bagian Analisis atau pilih salah satu sampel pengujian untuk melihat visualisasi Grad-CAM.
            </p>
            <button
              onClick={() => onNavigate('section-analisis')}
              className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer"
            >
              Ke Form Unggah Foto
            </button>
          </div>
        </div>
      </section>
    );
  }

  const isLowConfidence = result.conf < 0.7;
  const isRot = result.rot === 1;
  const badgeClass = isLowConfidence
    ? 'bg-[#FEF3DB] text-[#EFA018] dark:bg-[#302611] dark:text-[#FBBF24]'
    : isRot
    ? 'bg-[#FDE8E1] text-[#C9421A] dark:bg-[#361919] dark:text-[#F87171]'
    : 'bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]';

  const badgeIcon = isLowConfidence ? AlertTriangle : isRot ? X : Check;
  const BadgeIconComponent = badgeIcon;
  const badgeLabel = isLowConfidence ? 'Kurang Yakin (<70%)' : isRot ? 'Busuk' : 'Segar';
  const targetClassIndex = FRUIT_KEYS.indexOf(result.fruit) * 2 + result.rot;

  const handleCopySummary = () => {
    const text = `${getDiagnosisTitle(result)} (Keyakinan: ${formatPercent(result.conf)}). ${getExplanationText(result)}`;
    navigator.clipboard?.writeText(text).then(
      () => showToast('Ringkasan berhasil disalin ke clipboard!', 'success'),
      () => showToast('Gagal menyalin ringkasan.')
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section
      id="section-hasil"
      className="py-20 lg:py-28 bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col mb-10">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">
            Diagnostik Lengkap
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Hasil Klasifikasi & Grad-CAM
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Visual Inspector Stage */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="surface-card w-full p-4 relative overflow-hidden">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#ECE7DC] dark:bg-[#1A281F] flex items-center justify-center">
                {result.img ? (
                  <>
                    <img
                      src={result.img}
                      alt="Foto Asli"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    {result.cam && (
                      <img
                        src={result.cam}
                        alt="Grad-CAM"
                        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 pointer-events-none ${
                          viewMode === 'cam' ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ opacity: viewMode === 'cam' ? opacity / 100 : 0 }}
                      />
                    )}
                    {result.msk && (
                      <img
                        src={result.msk}
                        alt="Area Cacat"
                        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 pointer-events-none ${
                          viewMode === 'mask' ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ opacity: viewMode === 'mask' ? opacity / 100 : 0 }}
                      />
                    )}
                  </>
                ) : (
                  <FruitSvg
                    fruit={result.fruit}
                    isRotten={result.rot}
                    spotCount={result.n}
                    viewMode={viewMode}
                  />
                )}
                <div className="reticle-bracket" />
              </div>

              {/* View Switcher Tabs */}
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
                  <span>Lapisan Visualisasi</span>
                  <span className="font-bold text-[var(--text-main)] capitalize">
                    {viewMode === 'asli' ? 'Foto Asli' : viewMode === 'cam' ? 'Grad-CAM' : 'Area Cacat'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-[var(--bg-secondary)] p-1 rounded-xl">
                  {(['asli', 'cam', 'mask'] as InspectionViewMode[]).map((mode) => {
                    const isSelected = viewMode === mode;
                    const label = mode === 'asli' ? 'Foto Asli' : mode === 'cam' ? 'Grad-CAM' : 'Area Cacat';
                    return (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Heatmap Opacity Slider */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">Intensitas:</span>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
                    className="flex-1 accent-[var(--leaf-primary)] cursor-pointer"
                  />
                  <span className="text-xs font-mono text-[var(--text-dim)]">{opacity}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Diagnostic & Analytical Report */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="surface-card p-6 sm:p-8">
              {/* Header Badge & Title */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                  <BadgeIconComponent className="w-3.5 h-3.5" />
                  <span>{badgeLabel}</span>
                </div>
                <div className="text-xs text-[var(--text-dim)] font-mono">
                  Model: <span className="font-bold text-[var(--text-main)]">{result.model}</span>{' '}
                  {result.ms ? `(${result.ms} ms)` : ''}
                </div>
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-main)] mb-3">
                {getDiagnosisTitle(result)}
              </h2>

              {/* Radial Confidence Meter */}
              <div className="flex items-center gap-6 my-6 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div className="relative w-24 h-24 flex-none">
                  <svg viewBox="0 0 120 120" className="w-full h-full radial-meter">
                    <circle cx="60" cy="60" r="52" className="radial-meter-bg" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      className="radial-meter-fg"
                      style={{
                        strokeDashoffset: 326.7 * (1 - result.conf),
                        stroke: isLowConfidence
                          ? 'var(--citrus-accent)'
                          : isRot
                          ? 'var(--rot-primary)'
                          : 'var(--leaf-primary)',
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-editorial text-xl font-bold text-[var(--text-main)]">
                    <span>{formatPercent(result.conf)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-bold mb-0.5">
                    Tingkat Keyakinan
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-main)] mb-1">
                    {formatPercent(result.conf)} akurasi estimasi
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {getExplanationText(result)}
                  </p>
                </div>
              </div>

              {/* 6-Class Probability Bars */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-bold mb-3">
                  Probabilitas 6 Kelas Model
                </div>
                <div className="flex flex-col gap-2.5">
                  {result.p.map((prob, idx) => {
                    const label = MODEL_LABELS[idx].replace('_', ' ');
                    const isWinner = idx === targetClassIndex;
                    const barColor = isWinner
                      ? isLowConfidence
                        ? 'bg-[var(--citrus-accent)]'
                        : isRot
                        ? 'bg-[var(--rot-primary)]'
                        : 'bg-[var(--leaf-primary)]'
                      : 'bg-[var(--border-subtle)]';
                    return (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <span
                          className={`w-28 text-[var(--text-muted)] capitalize truncate ${
                            isWinner ? 'font-bold text-[var(--text-main)]' : ''
                          }`}
                        >
                          {label}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-1000`}
                            style={{ width: `${Math.max(prob * 100, 1)}%` }}
                          />
                        </div>
                        <span
                          className={`w-12 text-right font-mono text-[var(--text-dim)] ${
                            isWinner ? 'font-bold text-[var(--text-main)]' : ''
                          }`}
                        >
                          {formatPercent(prob)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Measured Bio-Optical Properties Grid */}
              <div className="mb-6 pt-5 border-t border-[var(--border-subtle)]">
                <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-bold mb-3">
                  Metrik Bio-Optik Terukur
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="text-[11px] text-[var(--text-muted)]">Rasio Defek</div>
                    <div className="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5">
                      {result.rasio}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="text-[11px] text-[var(--text-muted)]">Jumlah Bercak</div>
                    <div className="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5">
                      {result.n} titik
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="text-[11px] text-[var(--text-muted)]">Lokasi Anomali</div>
                    <div className="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5 capitalize">
                      {result.loc}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="text-[11px] text-[var(--text-muted)]">Varian Tekstur</div>
                    <div className="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5">
                      {result.tk}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[var(--border-subtle)] no-print">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Ringkasan</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                </div>
                <button
                  onClick={() => onNavigate('section-analisis')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Analisis Foto Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


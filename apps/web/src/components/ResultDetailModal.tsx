import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, RotateCcw, X } from 'lucide-react';
import { AnalysisResult } from '../types';
import {
  FRUIT_NAMES,
  MODEL_LABELS,
  formatLabelId,
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
  getVerdictMeta,
  resolveVerdict,
} from '../services/cvEngine';
import { sound } from '../services/soundEngine';

interface ResultDetailModalProps {
  result: AnalysisResult;
  onClose: () => void;
  onUpdateItem?: (updated: AnalysisResult) => void;
  onAnalyzeAgain?: () => void;
}

type ViewMode = 'asli' | 'cam' | 'mask';

export const ResultDetailModal: React.FC<ResultDetailModalProps> = ({
  result,
  onClose,
  onUpdateItem,
  onAnalyzeAgain,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('asli');
  const [copied, setCopied] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionLabel, setCorrectionLabel] = useState<string>('fresh_apple');
  const [localResult, setLocalResult] = useState<AnalysisResult>(result);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setLocalResult(result);
    setViewMode('asli');
    setShowCorrection(false);
  }, [result]);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const multipleFruits = (localResult.fruitCount ?? 1) > 1;
  const verdict = resolveVerdict(localResult);
  const meta = getVerdictMeta(verdict);
  const fruitName = FRUIT_NAMES[localResult.fruit];
  const explanation = getExplanationText(localResult);

  const image =
    viewMode === 'cam' && localResult.cam
      ? localResult.cam
      : viewMode === 'mask' && localResult.msk
      ? localResult.msk
      : localResult.img || localResult.thumb || '';

  const formatSafeDate = (dateStr: string): string => {
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleString('id-ID');
  };

  const handleCopySummary = () => {
    sound.play('click');
    const summary = `${getDiagnosisTitle(localResult)} (${formatPercent(localResult.conf)}). ${explanation}`;
    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSummary = () => {
    sound.play('click');
    const lines = [
      'FreshSight - Ringkasan Pemeriksaan',
      `Tanggal: ${formatSafeDate(localResult.date)}`,
      `Buah: ${verdict === 'tidak_terdeteksi' ? 'Tidak Terdeteksi' : fruitName}`,
      `Status: ${meta.label}`,
      ...(verdict !== 'tidak_terdeteksi'
        ? [
            `Keyakinan: ${formatPercent(localResult.conf)}`,
            `Estimasi rasio bercak: ${localResult.rasio || 0}%`,
            `Jumlah bercak: ${localResult.n || 0}`,
            `Lokasi bercak: ${localResult.loc || '–'}`,
          ]
        : []),
      `Sumber: ${localResult.src === 'contoh' ? 'Contoh sampel' : localResult.model}`,
      ...(localResult.userCorrection ? [`Koreksi pengguna: ${formatLabelId(localResult.userCorrection)}`] : []),
      '',
      'Penjelasan:',
      explanation,
      '',
      'Catatan: Penilaian berdasarkan tampilan visual kulit dan bukan uji keamanan pangan.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `freshsight-${localResult.fruit}-${localResult.id}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const feedbackText = localResult.userCorrection
    ? `Koreksi tersimpan: ${formatLabelId(localResult.userCorrection)}`
    : localResult.userVerified
    ? 'Terverifikasi benar oleh pengguna.'
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--fs-surface)] text-black rounded-3xl border-3 border-black shadow-[8px_8px_0_#000] p-5 sm:p-8 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={() => {
            sound.play('click');
            onClose();
          }}
          className="absolute top-4 right-4 min-w-11 min-h-11 rounded-full bg-white hover:bg-[#FEE2E2] border-2 border-black shadow-[2px_2px_0_#000] cursor-pointer flex items-center justify-center"
          aria-label="Tutup jendela detail"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-10 sm:pt-0">
          <div className="lg:col-span-5">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-black shadow-[4px_4px_0_#000] bg-white flex items-center justify-center">
              <img
                src={image}
                alt={`Foto ${fruitName} (${viewMode})`}
                className="w-full h-full object-contain p-2"
              />
              <span
                className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-passata uppercase font-bold border-2 border-black ${meta.badgeClass}`}
              >
                {meta.badgeText}
              </span>
            </div>

            {verdict !== 'tidak_terdeteksi' && (localResult.cam || localResult.msk) && (
              <div className="flex items-center gap-1.5 mt-3 p-1 rounded-xl bg-white border-2 border-black" role="tablist" aria-label="Mode tampilan foto">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'asli'}
                  onClick={() => setViewMode('asli')}
                  className={`flex-1 min-h-10 px-3 py-1.5 rounded-lg text-xs font-passata uppercase font-bold cursor-pointer ${
                    viewMode === 'asli' ? 'bg-black text-white' : 'hover:bg-black/10'
                  }`}
                >
                  Asli
                </button>
                {localResult.cam && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'cam'}
                    onClick={() => setViewMode('cam')}
                    className={`flex-1 min-h-10 px-3 py-1.5 rounded-lg text-xs font-passata uppercase font-bold cursor-pointer ${
                      viewMode === 'cam' ? 'bg-black text-white' : 'hover:bg-black/10'
                    }`}
                  >
                    Peta Fokus
                  </button>
                )}
                {localResult.msk && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'mask'}
                    onClick={() => setViewMode('mask')}
                    className={`flex-1 min-h-10 px-3 py-1.5 rounded-lg text-xs font-passata uppercase font-bold cursor-pointer ${
                      viewMode === 'mask' ? 'bg-black text-white' : 'hover:bg-black/10'
                    }`}
                  >
                    Area Bercak
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-passata uppercase font-bold border border-black mb-2 ${meta.softBadgeClass}`}
              >
                {meta.badgeText}
              </span>
              <h2
                id="detail-modal-title"
                className="font-passata text-2xl sm:text-3xl text-black font-bold uppercase tracking-tight"
              >
                {getDiagnosisTitle(localResult)}
              </h2>
              <p className="font-mono-tech text-xs text-black/75 mt-1">
                {verdict !== 'tidak_terdeteksi' ? `Keyakinan ${formatPercent(localResult.conf)} · ` : ''}
                {formatSafeDate(localResult.date)}
                {localResult.src === 'contoh' ? ' · Contoh sampel' : ''}
              </p>
            </div>

            {multipleFruits && (
              <div className="rounded-2xl border-2 border-[#92400E] bg-[#FEF3C7] p-3 text-xs font-semibold text-[#78350F] leading-relaxed">
                Terdeteksi {localResult.fruitCount} kandidat buah. Foto satu buah per bingkai untuk hasil terbaik.
              </div>
            )}

            <p className="text-sm text-black/90 leading-relaxed font-medium bg-white p-3.5 rounded-2xl border border-black/20">
              {explanation}
            </p>

            {verdict !== 'tidak_terdeteksi' && (
              <>
                <div className="space-y-2">
                  <h3 className="font-passata text-sm uppercase font-bold text-black tracking-wide">
                    Distribusi kemungkinan 6 kelas
                  </h3>
                  <div className="space-y-2 text-xs">
                    {MODEL_LABELS.map((label, index) => {
                      const value = localResult.p?.[index] ?? 0;
                      const isTop = value > 0 && value === Math.max(...(localResult.p || [0]));
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className="w-28 font-sans text-xs font-semibold text-black truncate">
                            {formatLabelId(label)}
                          </span>
                          <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isTop ? 'bg-[var(--fs-green-primary)]' : 'bg-black/35'
                              }`}
                              style={{ width: `${Math.max(value * 100, value > 0 ? 2 : 0)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-mono-tech text-xs font-bold text-black">
                            {formatPercent(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-black/15">
                  <div className="flex justify-between p-2.5 rounded-xl bg-white border border-black/15">
                    <span className="text-black/75">Area bercak</span>
                    <strong className="font-mono-tech">{localResult.rasio || 0}%</strong>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-white border border-black/15">
                    <span className="text-black/75">Jumlah bercak</span>
                    <strong className="font-mono-tech">{localResult.n || 0}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-between p-2.5 rounded-xl bg-white border border-black/15">
                    <span className="text-black/75">Lokasi</span>
                    <strong className="font-mono-tech">{localResult.loc || '–'}</strong>
                  </div>
                </div>

                <details className="rounded-xl bg-white/80 border border-black/20 p-3 text-xs">
                  <summary className="font-bold cursor-pointer text-black/80">
                    Info teknis lanjutan (untuk pengembang)
                  </summary>
                  <div className="mt-2 space-y-1 font-mono-tech text-xs text-black/75">
                    <div>Model: {localResult.model}</div>
                    <div>Waktu inferensi: {localResult.ms ?? 0} ms</div>
                    <div>Jarak warna Lab (estimasi optik): {localResult.jw ?? 0}</div>
                    <div>Varians tekstur Laplacian (estimasi optik): {localResult.tk ?? 0}</div>
                  </div>
                </details>
              </>
            )}

            {onUpdateItem && (
              <div className="p-3.5 rounded-2xl bg-white border-2 border-black space-y-2">
                <div className="text-xs font-passata text-black font-bold uppercase">
                  Apakah hasil ini sesuai pengamatan Anda?
                </div>
                {feedbackText ? (
                  <div className="text-xs font-bold text-[#14532D] flex items-center gap-1.5">
                    <Check size={15} />
                    <span>{feedbackText}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated: AnalysisResult = {
                            ...localResult,
                            userVerified: true,
                            userCorrection: undefined,
                          };
                          setLocalResult(updated);
                          onUpdateItem(updated);
                        }}
                        className="min-h-10 py-1.5 px-3.5 rounded-lg border-2 border-black bg-white hover:bg-[var(--fs-accent)] font-passata text-xs uppercase font-bold cursor-pointer"
                      >
                        Ya, sesuai
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCorrection(true)}
                        className="min-h-10 py-1.5 px-3.5 rounded-lg border-2 border-black bg-white hover:bg-[#FEE2E2] font-passata text-xs uppercase font-bold cursor-pointer"
                      >
                        Tidak, koreksi
                      </button>
                    </div>

                    {showCorrection && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <label htmlFor="correction-label-select" className="sr-only">
                          Pilih label buah yang benar
                        </label>
                        <select
                          id="correction-label-select"
                          value={correctionLabel}
                          onChange={(e) => setCorrectionLabel(e.target.value)}
                          className="flex-1 min-h-10 py-1.5 px-2.5 rounded-lg border-2 border-black bg-white text-xs font-semibold"
                        >
                          {MODEL_LABELS.map((lbl) => (
                            <option key={lbl} value={lbl}>
                              {formatLabelId(lbl)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const updated: AnalysisResult = {
                              ...localResult,
                              userVerified: false,
                              userCorrection: correctionLabel,
                            };
                            setLocalResult(updated);
                            onUpdateItem(updated);
                            setShowCorrection(false);
                          }}
                          className="min-h-10 py-1.5 px-3.5 rounded-lg bg-black text-white font-passata text-xs uppercase font-bold cursor-pointer"
                        >
                          Simpan koreksi
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {onAnalyzeAgain && (
                <button
                  type="button"
                  onClick={onAnalyzeAgain}
                  className="min-h-11 px-4 py-2 rounded-xl border-2 border-black bg-black text-white hover:bg-black/85 font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={15} />
                  <span>Periksa Buah Lain</span>
                </button>
              )}
              <button
                type="button"
                onClick={downloadSummary}
                className="min-h-11 px-4 py-2 rounded-xl border-2 border-black bg-[var(--fs-accent)] text-black hover:bg-[var(--fs-accent-hover)] font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1.5"
              >
                <Download size={15} />
                <span>Unduh Ringkasan</span>
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="min-h-11 px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-black/5 font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? 'Tersalin' : 'Salin Ringkasan'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

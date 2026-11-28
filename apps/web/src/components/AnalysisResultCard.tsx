import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from '../types';
import {
  MODEL_LABELS,
  formatLabelId,
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
  getVerdictMeta,
  resolveVerdict,
} from '../services/cvEngine';
import { sound } from '../services/soundEngine';
import { ResultDetailModal } from './ResultDetailModal';

interface AnalysisResultCardProps {
  result: AnalysisResult;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onReset: () => void;
  onUpdateItem?: (updated: AnalysisResult) => void;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  result,
  showHeatmap,
  onToggleHeatmap,
  onReset,
  onUpdateItem,
}) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const multipleFruits = (result.fruitCount ?? 1) > 1;
  const verdict = resolveVerdict(result);
  const meta = getVerdictMeta(verdict);
  const qualityWarnings = result.quality?.warnings || [];

  const ranked = MODEL_LABELS.map((label, index) => ({
    label,
    value: result.p?.[index] ?? 0,
  }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <>
      <div
        role="region"
        aria-live="polite"
        aria-label="Hasil analisis kesegaran buah"
        className="w-full bg-[var(--fs-surface)] text-black border-3 border-black shadow-[6px_6px_0_#000] rounded-3xl p-5 sm:p-6 space-y-4 animate-specimen-pop"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono-tech text-xs uppercase tracking-wider font-bold text-black/75">
            {result.src === 'contoh' ? 'Pratinjau Contoh (Sampel)' : 'Hasil Pemeriksaan'}
          </span>
          <span
            className={`px-3 py-1 rounded-full border-2 border-black font-passata text-xs uppercase font-bold ${meta.badgeClass}`}
          >
            {meta.badgeText}
          </span>
        </div>

        <div>
          <h2 className="font-passata text-2xl sm:text-3xl uppercase leading-tight">
            {getDiagnosisTitle(result)}
          </h2>
          {verdict !== 'tidak_terdeteksi' && (
            <p className="font-mono-tech text-xs text-black/75 mt-1.5">
              Tingkat keyakinan: <strong>{formatPercent(result.conf)}</strong>
              {result.ms ? ` · ${result.ms} ms` : ''}
            </p>
          )}
        </div>

        {qualityWarnings.length > 0 && (
          <div className="rounded-2xl border-2 border-[#92400E] bg-[#FEF3C7] p-3 text-xs font-semibold text-[#78350F] leading-relaxed flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong>Peringatan kualitas foto:</strong> {qualityWarnings.join(' ')}
            </div>
          </div>
        )}

        {multipleFruits && (
          <div className="rounded-2xl border-2 border-[#92400E] bg-[#FEF3C7] p-3 text-xs font-semibold text-[#78350F] leading-relaxed">
            Terdeteksi {result.fruitCount} kandidat buah. Aplikasi dioptimalkan untuk satu buah per foto sehingga status ditandai ragu.
          </div>
        )}

        {verdict === 'tidak_terdeteksi' && (
          <div className="rounded-2xl border-2 border-black bg-[#E2E8F0] p-3 text-xs font-semibold text-[#0F172A] leading-relaxed">
            Apel, pisang, atau jeruk utuh tidak terdeteksi. Gunakan foto satu buah yang jelas dengan latar polos.
          </div>
        )}

        {verdict !== 'tidak_terdeteksi' && (
          <div className="rounded-2xl border-2 border-black bg-white p-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-black/75">
              Kemungkinan kelas tertinggi
            </div>
            <div className="space-y-2">
              {ranked.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs font-mono-tech">
                  <span className="w-28 truncate font-sans font-semibold text-black">
                    {formatLabelId(item.label)}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--fs-green-primary)]"
                      style={{ width: `${Math.max(item.value * 100, item.value > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-bold text-black">
                    {formatPercent(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {verdict !== 'tidak_terdeteksi' && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-black/25 bg-white p-2.5 flex justify-between gap-2">
              <span className="text-black/75">Estimasi bercak</span>
              <strong>{result.rasio || 0}%</strong>
            </div>
            <div className="rounded-xl border border-black/25 bg-white p-2.5 flex justify-between gap-2">
              <span className="text-black/75">Jumlah bercak</span>
              <strong>{result.n || 0}</strong>
            </div>
          </div>
        )}

        <p className="text-xs sm:text-sm font-medium leading-relaxed text-black/90 bg-white border border-black/20 rounded-2xl p-3.5">
          {getExplanationText(result)}
        </p>

        <p className="text-xs text-black/75 leading-snug">
          Catatan: Penilaian ini berdasarkan tampilan visual kulit buah dan bukan jaminan keamanan pangan atau kelayakan konsumsi.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              sound.play('click');
              onReset();
            }}
            className="min-h-11 px-4 py-2 rounded-xl border-2 border-black bg-[var(--fs-accent)] text-black hover:bg-[var(--fs-accent-hover)] font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Periksa Buah Lain</span>
          </button>

          {result.cam && verdict !== 'tidak_terdeteksi' && (
            <button
              type="button"
              onClick={onToggleHeatmap}
              className="min-h-11 px-3.5 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#FFF3D6] font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] cursor-pointer"
            >
              {showHeatmap ? 'Foto Asli' : 'Peta Fokus'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              sound.play('click');
              setDetailOpen(true);
            }}
            className="min-h-11 px-3.5 py-2 rounded-xl border-2 border-black bg-black text-white hover:bg-black/85 font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] cursor-pointer"
          >
            Detail
          </button>

          <Link
            to="/riwayat"
            className="min-h-11 px-3.5 py-2 rounded-xl border-2 border-black bg-white text-black hover:bg-black/5 font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000] inline-flex items-center"
          >
            Riwayat
          </Link>
        </div>
      </div>

      {detailOpen && (
        <ResultDetailModal
          result={result}
          onClose={() => setDetailOpen(false)}
          onUpdateItem={onUpdateItem}
          onAnalyzeAgain={() => {
            setDetailOpen(false);
            onReset();
          }}
        />
      )}
    </>
  );
};

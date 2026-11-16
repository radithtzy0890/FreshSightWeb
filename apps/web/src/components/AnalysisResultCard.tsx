import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult, Verdict, getVerdict } from '../types';
import { FRUIT_NAMES, MODEL_LABELS, formatPercent, getExplanationText } from '../services/cvEngine';
import { sound } from '../services/soundEngine';
import { ResultDetailModal } from './ResultDetailModal';

interface AnalysisResultCardProps {
  result: AnalysisResult;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
}

const verdictLabel = (verdict: Verdict): string =>
  verdict === 'segar' ? 'Segar' : verdict === 'busuk' ? 'Busuk' : 'Status Ragu';

const verdictClass = (verdict: Verdict): string =>
  verdict === 'segar'
    ? 'bg-[#8DF947] text-black'
    : verdict === 'busuk'
    ? 'bg-[#EB3322] text-white'
    : 'bg-[#FFC737] text-black';

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  result,
  showHeatmap,
  onToggleHeatmap,
}) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const multipleFruits = (result.fruitCount ?? 1) > 1;
  const verdict = multipleFruits ? 'ragu' : result.verdict ?? getVerdict(result.conf, result.rot);
  const ranked = MODEL_LABELS.map((label, index) => ({
    label,
    value: result.p?.[index] ?? 0,
  }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <>
      <div className="w-full bg-[#F7F2E5] text-black border-3 border-black shadow-[8px_8px_0_#000000] rounded-3xl p-5 sm:p-6 space-y-4 animate-specimen-pop">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono-tech text-[10px] uppercase tracking-widest text-black/60">
          Hasil Analisis
        </span>
        <span
          className={`px-3 py-1 rounded-full border-2 border-black font-passata text-xs uppercase font-bold ${verdictClass(verdict)}`}
        >
          {verdictLabel(verdict)}
        </span>
      </div>

      <div>
        <h2 className="font-passata text-3xl sm:text-4xl uppercase leading-none">
          {FRUIT_NAMES[result.fruit]} {verdictLabel(verdict)}
        </h2>
        <p className="font-mono-tech text-xs text-black/60 mt-2">
          Keyakinan {formatPercent(result.conf)} · {result.ms ?? 0} ms · {result.model}
        </p>
      </div>

      <div className="rounded-2xl border-2 border-black bg-white p-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-black/60 mb-2">
          Probabilitas tertinggi
        </div>
        <div className="space-y-1.5">
          {ranked.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-[11px] font-mono-tech">
              <span className="w-28 truncate">{item.label.replace('_', ' ')}</span>
              <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1E6B3E]"
                  style={{ width: `${Math.max(item.value * 100, 2)}%` }}
                />
              </div>
              <span className="w-12 text-right font-bold">{formatPercent(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-black/20 bg-white p-2 flex justify-between gap-2">
          <span>Rasio defek</span>
          <b>{result.rasio || 0}%</b>
        </div>
        <div className="rounded-xl border border-black/20 bg-white p-2 flex justify-between gap-2">
          <span>Jumlah bercak</span>
          <b>{result.n || 0}</b>
        </div>
      </div>

      {multipleFruits && (
        <div className="rounded-2xl border-2 border-black bg-[#FFF3D6] p-3 text-[11px] font-semibold text-black/80 leading-relaxed">
          ⚠ Terdeteksi {result.fruitCount} kandidat buah. Model dioptimalkan untuk satu buah
          per foto; hasil ditandai RAGU.
        </div>
      )}

      <p className="text-xs font-medium leading-relaxed text-black/80 bg-white/70 border border-black/15 rounded-2xl p-3">
        {getExplanationText(result)}
      </p>

      <div className="flex flex-wrap gap-2">
        {result.cam && (
          <button
            onClick={onToggleHeatmap}
            className="px-3 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#FFF3D6] font-passata text-[11px] uppercase font-bold shadow-[2px_2px_0_#000000] cursor-pointer"
          >
            {showHeatmap ? 'Citra Asli' : 'Grad-CAM'}
          </button>
        )}
        <button
          onClick={() => {
            sound.play('click');
            setDetailOpen(true);
          }}
          className="px-3 py-2 rounded-xl border-2 border-black bg-black text-white hover:bg-black/85 font-passata text-[11px] uppercase font-bold shadow-[2px_2px_0_#000000] cursor-pointer"
        >
          Detail
        </button>
        <Link
          to="/riwayat"
          className="px-3 py-2 rounded-xl border-2 border-black bg-[#8DF947] text-black hover:bg-[#A3FF6B] font-passata text-[11px] uppercase font-bold shadow-[2px_2px_0_#000000]"
        >
          Riwayat
        </Link>
      </div>
      </div>

      {detailOpen && (
        <ResultDetailModal result={result} onClose={() => setDetailOpen(false)} />
      )}
    </>
  );
};

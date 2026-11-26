import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { AnalysisResult, Verdict } from '../types';
import {
  FRUIT_NAMES,
  MODEL_LABELS,
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
  resolveVerdict,
} from '../services/cvEngine';
import { sound } from '../services/soundEngine';

interface ResultDetailModalProps {
  result: AnalysisResult;
  onClose: () => void;
}

type ViewMode = 'asli' | 'cam' | 'mask';

const verdictLabel = (verdict: Verdict): string =>
  verdict === 'segar'
    ? 'Segar'
    : verdict === 'busuk'
    ? 'Busuk'
    : verdict === 'tidak_terdeteksi'
    ? 'Tidak Terdeteksi'
    : 'Status Ragu';

const verdictClass = (verdict: Verdict): string =>
  verdict === 'segar'
    ? 'bg-[#8DF947] text-black'
    : verdict === 'busuk'
    ? 'bg-[#EB3322] text-white'
    : verdict === 'tidak_terdeteksi'
    ? 'bg-slate-700 text-white'
    : 'bg-[#FFC737] text-black';

export const ResultDetailModal: React.FC<ResultDetailModalProps> = ({ result, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('asli');
  const multipleFruits = (result.fruitCount ?? 1) > 1;
  const verdict = resolveVerdict(result);
  const fruitName = FRUIT_NAMES[result.fruit];
  const explanation = getExplanationText(result);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const image =
    viewMode === 'cam' && result.cam
      ? result.cam
      : viewMode === 'mask' && result.msk
      ? result.msk
      : result.img || result.thumb || '';

  const formatSafeDate = (dateStr: string): string => {
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleString('id-ID');
  };

  const downloadSummary = () => {
    sound.play('click');
    const lines = [
      'FreshSight - Ringkasan Analisis',
      `Tanggal: ${formatSafeDate(result.date)}`,
      `Buah: ${verdict === 'tidak_terdeteksi' ? 'Tidak Terdeteksi' : fruitName}`,
      `Status: ${verdictLabel(verdict)}`,
      `Keyakinan: ${formatPercent(result.conf)}`,
      `Rasio area cacat: ${result.rasio || 0}%`,
      `Jumlah bercak: ${result.n || 0}`,
      `Lokasi bercak: ${result.loc || '–'}`,
      `Jarak warna: ${result.jw ?? 0}`,
      `Tekstur: ${result.tk ?? 0}`,
      `Model: ${result.model}`,
      ...(result.userCorrection ? [`Koreksi pengguna: ${result.userCorrection}`] : []),
      '',
      'Penjelasan:',
      explanation,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `freshsight-${result.fruit}-${result.id}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-4 overflow-y-auto overscroll-contain"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label="Detail hasil analisis"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[10px_10px_0_#000000] p-5 sm:p-8 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        data-lenis-prevent
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => {
            sound.play('click');
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-[#EB3322] hover:text-white border-2 border-black shadow-[2px_2px_0_#000000] cursor-pointer transition-colors"
          aria-label="Tutup detail"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-8 sm:pt-0">
          <div className="lg:col-span-5">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-3 border-black shadow-[5px_5px_0_#000000] bg-white flex items-center justify-center">
              <img
                src={image}
                alt={`Spesimen ${fruitName}`}
                className="w-full h-full object-cover object-center"
              />
              <span
                className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-passata uppercase font-bold border-2 border-black shadow-xs ${verdictClass(verdict)}`}
              >
                {verdictLabel(verdict)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-3 p-1 rounded-xl bg-white border-2 border-black">
              <button
                onClick={() => setViewMode('asli')}
                className={`px-3 py-1 rounded-lg text-xs font-passata uppercase font-bold transition-colors cursor-pointer ${
                  viewMode === 'asli' ? 'bg-black text-white' : 'hover:bg-black/10'
                }`}
              >
                Asli
              </button>
              {result.cam && (
                <button
                  onClick={() => setViewMode('cam')}
                  className={`px-3 py-1 rounded-lg text-xs font-passata uppercase font-bold transition-colors cursor-pointer ${
                    viewMode === 'cam' ? 'bg-black text-white' : 'hover:bg-black/10'
                  }`}
                >
                  Grad-CAM
                </button>
              )}
              {result.msk && (
                <button
                  onClick={() => setViewMode('mask')}
                  className={`px-3 py-1 rounded-lg text-xs font-passata uppercase font-bold transition-colors cursor-pointer ${
                    viewMode === 'mask' ? 'bg-black text-white' : 'hover:bg-black/10'
                  }`}
                >
                  Area Cacat
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div>
              <span
                className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-passata uppercase font-bold border border-black mb-2 ${verdictClass(verdict)}`}
              >
                {verdictLabel(verdict)}
              </span>
              <h2 className="font-passata text-3xl sm:text-4xl text-black font-bold uppercase tracking-tight">
                {getDiagnosisTitle(result)}
              </h2>
              <p className="font-mono-tech text-xs text-black/60 mt-1">
                Keyakinan {formatPercent(result.conf)} · {result.ms ?? 0} ms · {result.model}
              </p>
            </div>

            {multipleFruits && (
              <div className="rounded-2xl border-2 border-black bg-[#FFF3D6] p-3 text-xs font-semibold text-black/80 leading-relaxed">
                ⚠ Terdeteksi {result.fruitCount} kandidat buah. Model dioptimalkan untuk satu
                buah per foto; hasil ditandai RAGU.
              </div>
            )}

            <p className="text-sm text-black/90 leading-relaxed font-medium bg-white/70 p-3.5 rounded-2xl border border-black/20">
              {explanation}
            </p>

            <div className="space-y-2">
              <h3 className="font-passata text-sm uppercase font-bold text-black tracking-wider">
                Probabilitas 6 kelas
              </h3>
              <div className="space-y-1.5 text-xs">
                {MODEL_LABELS.map((label, index) => {
                  const value = result.p?.[index] ?? 0;
                  const isTop = value === Math.max(...(result.p || [0]));
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-28 font-mono-tech text-[11px] text-black/80 truncate">
                        {label.replace('_', ' ')}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isTop ? 'bg-[#1E6B3E]' : 'bg-black/35'
                          }`}
                          style={{ width: `${Math.max(value * 100, 2)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono-tech text-[11px] text-black/80 font-bold">
                        {formatPercent(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-black/15">
              <h3 className="font-passata text-sm uppercase font-bold text-black tracking-wider">
                Ciri terukur
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                  <span className="text-black/70 font-medium">Rasio area cacat</span>
                  <span className="font-bold font-mono-tech">{result.rasio || 0}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                  <span className="text-black/70 font-medium">Jumlah bercak</span>
                  <span className="font-bold font-mono-tech">{result.n || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                  <span className="text-black/70 font-medium">Lokasi bercak</span>
                  <span className="font-bold font-mono-tech">{result.loc || '–'}</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white border border-black/15">
                  <span className="text-black/70 font-medium">Jarak warna</span>
                  <span className="font-bold font-mono-tech">{result.jw ?? 0}</span>
                </div>
                <div className="col-span-2 flex justify-between p-2 rounded-xl bg-white border border-black/15">
                  <span className="text-black/70 font-medium">Tekstur</span>
                  <span className="font-bold font-mono-tech">{result.tk ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={downloadSummary}
                className="px-4 py-2 rounded-xl border-2 border-black bg-[#8DF947] text-black hover:bg-[#A3FF6B] font-passata text-xs uppercase font-bold shadow-[2px_2px_0_#000000] cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} />
                Unduh Ringkasan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

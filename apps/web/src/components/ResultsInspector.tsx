import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnalysisResult } from '../types';
import { formatPercent, getDiagnosisTitle, getVerdictMeta, resolveVerdict } from '../services/cvEngine';
import { sound } from '../services/soundEngine';

interface ResultsInspectorProps {
  result: AnalysisResult | null;
}

const STEPS = [
  {
    id: 1,
    title: 'Ambil atau Unggah Foto',
    desc: 'Pilih satu buah apel, pisang, atau jeruk utuh di tengah bingkai dengan cahaya merata dan latar polos.',
  },
  {
    id: 2,
    title: 'Pengecekan Kualitas & Pra-proses',
    desc: 'Gambar dikompresi di peramban, lalu dicek kecerahan, ketajaman fokus, serta apakah benar berisi buah target (OOD).',
  },
  {
    id: 3,
    title: 'Klasifikasi & Peta Fokus',
    desc: 'Model MobileNetV3Small menghitung probabilitas 6 kelas, menampilkan peta fokus Grad-CAM, serta estimasi visual bercak kulit.',
  },
  {
    id: 4,
    title: 'Riwayat Lokal di Perangkat',
    desc: 'Foto tidak disimpan permanen di server. Ringkasan hasil disimpan di localStorage peramban agar mudah dibuka atau dihapus kapan saja.',
  },
];

export const ResultsInspector: React.FC<ResultsInspectorProps> = ({ result }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [viewHeatmap, setViewHeatmap] = useState(false);
  const navigate = useNavigate();

  const verdict = result ? resolveVerdict(result) : null;
  const meta = verdict ? getVerdictMeta(verdict) : null;
  const active = STEPS[activeStep - 1];

  return (
    <section
      id="section-cara-kerja"
      className="pt-28 pb-20 min-h-screen bg-[var(--fs-green-primary)] text-white border-t-2 border-black"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--fs-accent)] mb-2">
            <CheckCircle2 size={15} />
            Alur Pemeriksaan
          </span>
          <h1 className="font-passata text-4xl sm:text-6xl text-shadow-3d-white uppercase font-bold tracking-tight leading-none">
            Cara Kerja
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl">
            Empat tahap dari foto buah hingga hasil klasifikasi kesegaran, lengkap dengan pengecekan kualitas foto dan batas penggunaan visual.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => {
                    sound.play('click');
                    setActiveStep(step.id);
                  }}
                  aria-pressed={isActive}
                  className={`text-left p-5 rounded-2xl border-2 border-black transition-transform hover:-translate-y-0.5 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--fs-surface)] shadow-[5px_5px_0_#000]'
                      : 'bg-[var(--fs-surface)]/90 shadow-[3px_3px_0_#000]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-passata text-3xl text-[var(--fs-green-primary)] font-bold leading-none">
                      0{step.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full border border-black text-xs font-bold uppercase ${
                        isActive ? 'bg-[var(--fs-accent)] text-black' : 'bg-white text-black/75'
                      }`}
                    >
                      {isActive ? 'Aktif' : `Tahap ${step.id}`}
                    </span>
                  </div>
                  <h2 className="font-passata text-lg text-black uppercase mt-3">
                    {step.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-black/80 leading-relaxed mt-2">
                    {step.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-5 flex flex-col items-center gap-5">
            <div className="w-full max-w-[460px] bg-[var(--fs-surface)] text-black rounded-3xl border-2 border-black shadow-[6px_6px_0_#000] p-6 flex flex-col items-center justify-center text-center space-y-4">
              {result && meta ? (
                <>
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-black bg-[#EAE3D2] flex items-center justify-center p-2">
                    <img
                      src={viewHeatmap && result.cam ? result.cam : result.img || ''}
                      alt="Foto pemeriksaan terakhir"
                      className="w-full h-full object-contain rounded-xl"
                    />
                    {result.cam && verdict !== 'tidak_terdeteksi' && (
                      <button
                        type="button"
                        onClick={() => setViewHeatmap((v) => !v)}
                        className="absolute bottom-2 right-2 min-h-10 px-3 py-1.5 rounded-lg bg-black text-white font-passata text-xs uppercase cursor-pointer"
                      >
                        {viewHeatmap ? 'Foto Asli' : 'Peta Fokus'}
                      </button>
                    )}
                  </div>

                  <span
                    className={`px-4 py-1.5 rounded-full font-passata text-xs uppercase font-bold border-2 border-black ${meta.badgeClass}`}
                  >
                    {meta.badgeText}
                    {verdict !== 'tidak_terdeteksi' ? ` · ${formatPercent(result.conf)}` : ''}
                  </span>

                  <p className="font-passata text-lg uppercase text-black">
                    {getDiagnosisTitle(result)}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <img src="/fruit/apple_fresh.jpg" alt="Contoh apel" className="w-16 h-16 rounded-2xl border-2 border-black object-contain bg-white p-1" />
                    <img src="/fruit/banana_fresh.jpg" alt="Contoh pisang" className="w-16 h-16 rounded-2xl border-2 border-black object-contain bg-white p-1" />
                    <img src="/fruit/orange_fresh.jpg" alt="Contoh jeruk" className="w-16 h-16 rounded-2xl border-2 border-black object-contain bg-white p-1" />
                  </div>
                  <h3 className="font-passata text-xl text-black uppercase">
                    {active.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-black/80 font-medium leading-relaxed">
                    {active.desc}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.play('click');
                  navigate('/');
                }}
                className="btn-action-wide-ono"
              >
                <span>Periksa Foto Buah</span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              {result && (
                <button
                  type="button"
                  onClick={() => {
                    sound.play('click');
                    navigate('/riwayat');
                  }}
                  className="min-h-12 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border-2 border-white/50 text-white font-passata text-sm uppercase font-bold transition-colors cursor-pointer"
                >
                  Lihat Riwayat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

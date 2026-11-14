import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnalysisResult, Verdict, getVerdict } from '../types';
import { sound } from '../services/soundEngine';

interface ResultsInspectorProps {
  result: AnalysisResult | null;
}

const STEPS = [
  {
    id: 1,
    title: 'Bidik Buah',
    desc: 'Ambil foto lewat kamera atau unggah dari galeri. Satu buah di tengah bingkai, cahaya merata, dan latar polos memberi hasil terbaik.',
  },
  {
    id: 2,
    title: 'Matriks 224px',
    desc: 'Sistem memotong, menormalkan, dan mengubah citra menjadi tensor 224×224×3 sebelum masuk ke jaringan saraf MobileNetV3Small.',
  },
  {
    id: 3,
    title: 'Vonis Kejujuran',
    desc: 'Model menghitung probabilitas enam kelas kesegaran. Grad-CAM menunjukkan area yang paling memengaruhi keputusan, bukan sekadar angka.',
  },
  {
    id: 4,
    title: 'Arsip Otomatis',
    desc: 'Foto, vonis, probabilitas, dan penjelasan disimpan di perangkat. Riwayat bisa dibuka kapan saja tanpa mengirim foto ke server.',
  },
];

export const ResultsInspector: React.FC<ResultsInspectorProps> = ({ result }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [viewHeatmap, setViewHeatmap] = useState(false);
  const navigate = useNavigate();

  const verdict: Verdict = result ? result.verdict ?? getVerdict(result.conf, result.rot) : 'segar';
  const confPct = result ? Math.round(result.conf * 100) : 99;
  const active = STEPS[activeStep - 1];

  return (
    <>
      <section id="section-cara-kerja" className="pt-28 pb-20 bg-[#1E6B3E] relative overflow-hidden text-white border-t-2 border-black">
        <div className="absolute top-24 right-16 text-3xl select-none pointer-events-none">✦</div>
        <div className="absolute bottom-24 left-1/4 text-2xl select-none pointer-events-none">✦</div>

        <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
          <div className="max-w-3xl mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8DF947] mb-2">
              <CheckCircle2 size={14} />
              Alur Analisis
            </span>
            <h1 className="font-passata text-5xl sm:text-7xl text-shadow-3d-white uppercase font-bold tracking-tight leading-none">
              HOW IT WORKS
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
              Empat langkah dari satu foto buah menjadi vonis yang bisa dipertanggungjawabkan:
              klasifikasi enam kelas, peta Grad-CAM, dan penjelasan defek yang terukur.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      sound.play('click');
                      setActiveStep(step.id);
                    }}
                    onMouseEnter={() => sound.play('hover')}
                    className={`text-left p-5 rounded-2xl border-3 border-black transition-transform hover:-translate-y-1 cursor-pointer ${
                      isActive
                        ? 'bg-[#F7F2E5] shadow-[6px_6px_0_#000000]'
                        : 'bg-[#F7F2E5]/85 shadow-[4px_4px_0_#000000]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-passata text-4xl text-[#1E6B3E] font-bold leading-none">
                        0{step.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border border-black text-[10px] font-bold uppercase tracking-wide ${
                          isActive ? 'bg-[#8DF947] text-black' : 'bg-white/70 text-black/60'
                        }`}
                      >
                        {isActive ? 'Aktif' : 'Langkah'}
                      </span>
                    </div>
                    <h2 className="font-passata text-xl text-black uppercase mt-3">
                      {step.title}
                    </h2>
                    <p className="text-xs font-semibold text-black/70 leading-relaxed mt-2">
                      {step.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-5">
              <div className="relative w-full max-w-[460px] aspect-[4/3] bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[10px_10px_0_#000000] p-6 flex flex-col items-center justify-center">
                <div className="absolute -top-6 left-10 right-10 h-8 bg-[#EAE3D2] border-t-3 border-x-3 border-black rounded-t-2xl pointer-events-none" />

                {result ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
                    <div className="relative w-64 sm:w-72 h-44 sm:h-48 rounded-2xl overflow-hidden border-3 border-black shadow-[4px_4px_0_#000000] mb-3 bg-[#EAE3D2] flex items-center justify-center p-2">
                      <img
                        src={viewHeatmap && result.cam ? result.cam : result.img || ''}
                        alt="Spesimen hasil analisis"
                        className="w-full h-full object-contain rounded-xl drop-shadow-md"
                      />
                      <button
                        onClick={() => {
                          sound.play('click');
                          setViewHeatmap(!viewHeatmap);
                        }}
                        className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black text-white font-passata text-[10px] uppercase cursor-pointer"
                      >
                        {viewHeatmap ? 'Citra Asli' : 'Heatmap'}
                      </button>
                    </div>

                    <span
                      className={`px-4 py-1.5 rounded-xl font-passata text-base uppercase font-bold border-2 border-black shadow-[2px_2px_0_#000000] ${
                        verdict === 'segar'
                          ? 'bg-[#8DF947] text-black'
                          : verdict === 'busuk'
                          ? 'bg-[#EB3322] text-white'
                          : 'bg-[#FFC737] text-black'
                      }`}
                    >
                      {verdict === 'segar' ? 'SEGAR TERKONFIRMASI' : verdict === 'busuk' ? 'TERDETEKSI BUSUK' : 'STATUS RAGU'} • {confPct}%
                    </span>

                    <p className="font-mono-tech text-xs text-black/80 font-bold mt-2">
                      {result.fruit.toUpperCase()} • DEFEK: {result.rasio || 0}%
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <img src="/fruit/apple_fresh.jpg" alt="Apel" className="w-14 h-14 rounded-2xl border-2 border-black object-contain bg-white shadow-[2px_2px_0_#000000]" />
                      <img src="/fruit/banana_fresh.jpg" alt="Pisang" className="w-14 h-14 rounded-2xl border-2 border-black object-contain bg-white shadow-[2px_2px_0_#000000]" />
                      <img src="/fruit/orange_fresh.jpg" alt="Jeruk" className="w-14 h-14 rounded-2xl border-2 border-black object-contain bg-white shadow-[2px_2px_0_#000000]" />
                    </div>
                    <h3 className="font-passata text-2xl text-black uppercase">
                      KOTAK OBSERVASI SPESIMEN
                    </h3>
                    <p className="text-xs text-black/70 font-semibold max-w-xs mx-auto">
                      {active.desc}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    sound.play('click');
                    navigate('/');
                  }}
                  onMouseEnter={() => sound.play('hover')}
                  className="btn-action-wide-ono"
                >
                  <span>Pindai Sekarang</span>
                  <ArrowRight size={18} strokeWidth={3} />
                </button>
                {result && (
                  <button
                    onClick={() => {
                      sound.play('click');
                      navigate('/riwayat');
                    }}
                    className="px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 border-2 border-white/40 text-white font-passata text-sm uppercase font-bold transition-colors cursor-pointer"
                  >
                    Lihat Riwayat
                  </button>
                )}
              </div>

              <p className="text-[11px] text-white/70 text-center max-w-sm">
                Langkah aktif: <strong className="text-white">{active.title}</strong> — {active.desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#14532D] text-center relative overflow-hidden flex flex-col items-center justify-center border-t-2 border-black">
        <div className="absolute top-16 left-20 text-3xl select-none pointer-events-none">✦</div>
        <div className="absolute bottom-20 right-28 text-3xl select-none pointer-events-none">✦</div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-4">
          <h2 className="font-passata text-4xl sm:text-6xl lg:text-7xl text-shadow-3d-white uppercase font-bold leading-tight tracking-tight">
            PILIH BUAH TERBAIK<br />
            UNTUK KELUARGA<br />
            ATAU BISNISMU
          </h2>

          <p className="font-passata text-xl text-white/90 tracking-wide mt-2">
            Kualitas nutrisi buah tanpa kompromi 🍏
          </p>
        </div>
      </section>
    </>
  );
};

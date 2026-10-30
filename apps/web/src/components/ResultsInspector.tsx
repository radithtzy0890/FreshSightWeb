import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AnalysisResult, Verdict, getVerdict } from '../types';
import { sound } from '../services/soundEngine';

interface ResultsInspectorProps {
  result: AnalysisResult | null;
  onNavigate: (id: string) => void;
  showToast?: (msg: string, type?: 'default' | 'success' | 'error') => void;
}

const STEPS = [
  { id: 1, title: 'Bidik Buah', desc: 'Arahkan kamera ke permukaan kulit buah.' },
  { id: 2, title: 'Matriks 224px', desc: 'Sensor membaca pantulan foton epidermis.' },
  { id: 3, title: 'Vonis Kejujuran', desc: 'Klasifikasi segar atau busuk tanpa tebakan.' },
  { id: 4, title: 'Arsip Otomatis', desc: 'Foto tersimpan aman di memori lokal.' },
];

export const ResultsInspector: React.FC<ResultsInspectorProps> = ({
  result,
  onNavigate,
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [viewHeatmap, setViewHeatmap] = useState(false);

  const verdict: Verdict = result ? (result.verdict ?? getVerdict(result.conf, result.rot)) : 'segar';
  const confPct = result ? Math.round(result.conf * 100) : 99;

  return (
    <>
      {/* SECTION 2: HOW IT WORKS (Matching Image 2) */}
      <section id="section-cara-kerja" className="py-24 min-h-[90vh] bg-[#1E6B3E] relative overflow-hidden flex flex-col justify-between text-white border-t-2 border-black">

        {/* Floating Sparkles */}
        <div className="absolute top-20 right-24 text-3xl select-none pointer-events-none">✦</div>
        <div className="absolute bottom-32 left-1/3 text-2xl select-none pointer-events-none">✦</div>

        <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10 flex-1 flex flex-col justify-between">

          {/* Center Stage: The Open Take-Out Box / Specimen Tray (Matching Image 2) */}
          <div className="w-full flex items-center justify-center py-8">
            <div className="relative w-full max-w-[460px] aspect-[4/3] bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[10px_10px_0_#000000] p-6 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">

              {/* Box Top Flap Aesthetic */}
              <div className="absolute -top-6 left-10 right-10 h-8 bg-[#EAE3D2] border-t-3 border-x-3 border-black rounded-t-2xl pointer-events-none" />

              {result ? (
                /* Diagnosed Result Display */
                <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-3 border-black shadow-[4px_4px_0_#000000] mb-3">
                    <img
                      src={viewHeatmap && result.cam ? result.cam : result.img || ''}
                      alt="Diagnosed specimen"
                      className="w-full h-full object-cover"
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

                  {/* Stamped Verdict Seal */}
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
                /* Standby Illustration Stage */
                <div className="text-center space-y-2">
                  <div className="text-7xl mb-1">🍎 🍌 🍊</div>
                  <h3 className="font-passata text-2xl text-black uppercase">
                    KOTAK OBSERVASI SPESIMEN
                  </h3>
                  <p className="text-xs text-black/70 font-semibold max-w-xs mx-auto">
                    {STEPS[activeStep - 1].desc}
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* Bottom Left: Huge 3D "HOW IT WORKS" & Step Controls (Matching Image 2) */}
          <div className="space-y-4 pt-6">
            <h2 className="font-passata text-4xl sm:text-6xl text-shadow-3d-white uppercase font-bold tracking-tight">
              HOW IT WORKS
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  onClick={() => {
                    sound.play('click');
                    setActiveStep(step.id);
                  }}
                  onMouseEnter={() => sound.play('hover')}
                  className={`btn-step-ono ${activeStep === step.id ? 'is-active' : ''}`}
                >
                  {step.id}
                </button>
              ))}

              <button
                onClick={() => {
                  sound.play('click');
                  onNavigate('section-hero');
                }}
                onMouseEnter={() => sound.play('hover')}
                className="btn-action-wide-ono"
              >
                <span>Pindai Sekarang</span>
                <ArrowRight size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3: MASSIVE IMPACT BANNER (Matching Image 3) */}
      <section className="py-28 bg-[#14532D] text-center relative overflow-hidden flex flex-col items-center justify-center border-t-2 border-black">

        {/* Floating Sparkles & Cursor Arrow (Matching Image 3) */}
        <div className="absolute top-16 left-20 text-3xl select-none pointer-events-none">✦</div>
        <div className="absolute bottom-20 right-28 text-3xl select-none pointer-events-none">✦</div>
        <div className="absolute top-1/2 right-16 text-4xl select-none pointer-events-none">⮜</div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-4">
          <h2 className="font-passata text-4xl sm:text-6xl lg:text-7xl text-shadow-3d-white uppercase font-bold leading-tight tracking-tight">
            PILIH YANG SEGAR,<br />
            KONSUMSI TERBAIK<br />
            UNTUK TUBUHMU
          </h2>

          <p className="font-passata text-xl text-white/90 tracking-wide mt-2">
            Kualitas buah teruji tanpa kompromi 🍏
          </p>
        </div>
      </section>
    </>
  );
};

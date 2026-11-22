import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Cpu, Database, Layers, ShieldCheck, Zap } from 'lucide-react';

const METRICS = [
  { label: 'Test set asli', value: '98,69%', note: '918 citra, Macro-F1 0,9805' },
  { label: 'Green orange', value: '99,83%', note: '600 holdout, kelas fresh_orange' },
  { label: 'AFQC Apple Holdout', value: '96,41%', note: 'Fresh 98,09% / Rotten 94,74% (418 citra)' },
  { label: 'Banana overripe', value: '100%', note: '239 citra eksternal rotten_banana' },
];

const CLASSES = [
  { name: 'fresh_apple', label: 'Apel segar', support: 237 },
  { name: 'rotten_apple', label: 'Apel busuk', support: 26 },
  { name: 'fresh_banana', label: 'Pisang segar', support: 316 },
  { name: 'rotten_banana', label: 'Pisang busuk', support: 113 },
  { name: 'fresh_orange', label: 'Jeruk segar', support: 177 },
  { name: 'rotten_orange', label: 'Jeruk busuk', support: 49 },
];

const EVALUATION = [
  ['Test asli (918 citra, 6 kelas)', '98,69%'],
  ['Green orange (600 holdout)', '99,83%'],
  ['Fresh orange eksternal (200 holdout)', '94,00%'],
  ['Rotten orange eksternal (200 holdout)', '100%'],
  ['Blackspot orange (200 holdout)', '100%'],
  ['Canker orange (200 holdout)', '98,00%'],
  ['AFQC apple fresh holdout (209 citra)', '98,09%'],
  ['AFQC apple rotten holdout (209 citra)', '94,74%'],
  ['AFQC test independen (232 citra)', '93,97%'],
  ['Banana overripe holdout (239 citra)', '100%'],
];

const PIPELINE = [
  { title: 'Input 224×224×3', desc: 'RGB, skala 0–1' },
  { title: 'Rescaling(2, −1)', desc: 'Normalisasi ke [-1, 1]' },
  { title: 'MobileNetV3Small', desc: 'Feature map 7×7×576' },
  { title: 'Global Average Pool', desc: 'Vektor 576 dimensi' },
  { title: 'Dense 6 + Softmax', desc: 'Probabilitas 6 kelas' },
];

export const ModelDataPage: React.FC = () => {
  return (
    <section className="pt-28 pb-20 bg-[#0A2E19] text-white min-h-screen border-t-2 border-black">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8DF947] mb-2">
            <BarChart3 size={14} />
            Riset & Evaluasi
          </span>
          <h1 className="font-passata text-5xl sm:text-7xl uppercase font-bold tracking-tight leading-none">
            MODEL & DATA
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
            MobileNetV3Small dengan head enam kelas, dievaluasi pada test asli, holdout
            green orange, dan data eksternal. Semua angka di bawah berasal dari model yang
            sedang dipakai aplikasi ini.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((metric) => (
            <div
              key={metric.label}
              className="bg-[#F7F2E5] text-black rounded-2xl border-3 border-black shadow-[5px_5px_0_#000000] p-5"
            >
              <div className="font-mono-tech text-[10px] uppercase tracking-widest text-black/60">
                {metric.label}
              </div>
              <div className="font-passata text-4xl text-[#1E6B3E] font-bold mt-2">
                {metric.value}
              </div>
              <p className="text-[11px] font-semibold text-black/60 mt-2 leading-snug">
                {metric.note}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-7 bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[6px_6px_0_#000000] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-[#1E6B3E]" />
              <h2 className="font-passata text-2xl uppercase font-bold">Arsitektur Model</h2>
            </div>

            <div className="space-y-2">
              {PIPELINE.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-center gap-3 rounded-xl border border-black/15 bg-white p-3"
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#1E6B3E] text-white font-mono-tech text-[11px] font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{step.title}</div>
                    <div className="font-mono-tech text-[10px] text-black/60">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="rounded-xl border border-black/15 bg-white p-2">
                <div className="font-passata text-xl font-bold text-[#1E6B3E]">942.582</div>
                <div className="text-[10px] font-semibold text-black/60">parameter</div>
              </div>
              <div className="rounded-xl border border-black/15 bg-white p-2">
                <div className="font-passata text-xl font-bold text-[#1E6B3E]">4,13 MB</div>
                <div className="text-[10px] font-semibold text-black/60">ukuran .keras</div>
              </div>
              <div className="rounded-xl border border-black/15 bg-white p-2">
                <div className="font-passata text-xl font-bold text-[#1E6B3E]">7×7×576</div>
                <div className="text-[10px] font-semibold text-black/60">feature Grad-CAM</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[6px_6px_0_#000000] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} className="text-[#1E6B3E]" />
              <h2 className="font-passata text-2xl uppercase font-bold">Enam Kelas</h2>
            </div>
            <div className="space-y-1.5">
              {CLASSES.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/15 bg-white px-3 py-2"
                >
                  <div>
                    <div className="font-mono-tech text-[11px] font-bold">{item.name}</div>
                    <div className="text-[10px] text-black/60 font-semibold">{item.label}</div>
                  </div>
                  <span className="font-mono-tech text-[10px] text-black/60">
                    n={item.support}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-black/55 font-semibold mt-3">
              Jumlah di kanan adalah support pada test asli (total 918 citra).
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[6px_6px_0_#000000] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-[#1E6B3E]" />
              <h2 className="font-passata text-2xl uppercase font-bold">Hasil Evaluasi</h2>
            </div>
            <div className="space-y-1.5">
              {EVALUATION.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-black/10 pb-1.5 text-xs"
                >
                  <span className="font-medium text-black/75">{label}</span>
                  <span className="font-mono-tech font-bold text-[#1E6B3E]">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-black/55 font-semibold mt-3">
              Split test asli memakai klaster near-duplicate dHash agar tidak bocor ke train.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[6px_6px_0_#000000] p-6">
              <div className="flex items-center gap-2 mb-3">
                <Database size={18} className="text-[#1E6B3E]" />
                <h2 className="font-passata text-2xl uppercase font-bold">Dataset</h2>
              </div>
              <ul className="space-y-1.5 text-xs font-medium text-black/75 list-disc pl-4">
                <li>Dataset utama Pascal VOC: 3.093 citra, 6.977 anotasi objek buah.</li>
                <li>AFQC apple: 2.320 citra apel segar dan busuk.</li>
                <li>Banana overripe: 1.195 citra pisang terlalu matang.</li>
                <li>Orange external: 3.000 green orange + citra cacat (blackspot, canker, rotten).</li>
                <li>Split per klaster crop dan near-duplicate, bukan per gambar tunggal.</li>
              </ul>
            </div>

            <div className="bg-[#F7F2E5] text-black rounded-3xl border-3 border-black shadow-[6px_6px_0_#000000] p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-[#1E6B3E]" />
                <h2 className="font-passata text-2xl uppercase font-bold">Explainability</h2>
              </div>
              <ul className="space-y-1.5 text-xs font-medium text-black/75 list-disc pl-4">
                <li>Grad-CAM pada feature map terakhir menunjukkan area yang memengaruhi vonis.</li>
                <li>Mask defek mengukur rasio bercak, jumlah, lokasi, jarak warna, dan tekstur.</li>
                <li>Vonis RAGU jika keyakinan model di bawah 60%.</li>
                <li>TTA adaptif (flip + center-crop) aktif saat keyakinan awal di bawah 80%.</li>
                <li>Buah yang dipotong atau komposisinya tidak umum masih bisa menjadi domain shift.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8DF947] text-black border-2 border-black shadow-[3px_3px_0_#000000] font-passata text-sm uppercase font-bold hover:bg-[#A3FF6B] transition-colors"
          >
            Coba Analisis
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/cara-kerja"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/40 font-passata text-sm uppercase font-bold hover:bg-white/25 transition-colors"
          >
            Lihat Cara Kerja
          </Link>
        </div>
      </div>
    </section>
  );
};

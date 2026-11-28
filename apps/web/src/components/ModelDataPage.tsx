import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Cpu, Database, Layers, ShieldCheck, Zap } from 'lucide-react';

// Verified metrics directly from backend/tools/web_vs_journal_comparison.json
// and backend/tools/orange_recalibration_metrics.json for active model mobilenetv3small_external_green_v2
const METRICS = [
  { label: 'Test internal (918 citra)', value: '98,58%', note: 'Macro-F1 0,9799 · 13 error (6 kelas)' },
  { label: 'Eksternal kanonik (344)', value: '98,55%', note: 'Macro-F1 0,9852 · 5 error (apel & pisang)' },
  { label: 'Mendeley Orange (400)', value: '97,75%', note: '6-kelas · biner segar/busuk 98,00%' },
  { label: 'Foto liar Wikimedia (16)', value: '68,75%', note: '11/16 benar (sanity check, sampel kecil)' },
];

const CLASSES = [
  { name: 'Apel Segar', code: 'fresh_apple', support: 237 },
  { name: 'Apel Busuk', code: 'rotten_apple', support: 26 },
  { name: 'Pisang Segar', code: 'fresh_banana', support: 316 },
  { name: 'Pisang Busuk', code: 'rotten_banana', support: 113 },
  { name: 'Jeruk Segar', code: 'fresh_orange', support: 177 },
  { name: 'Jeruk Busuk', code: 'rotten_orange', support: 49 },
];

const EVALUATION = [
  ['Test internal (918 citra, 6 kelas)', '98,58%'],
  ['Test eksternal kanonik (344 citra, 3 kelas hadir)', '98,55%'],
  ['Mendeley Orange lintas-domain (400 citra, 6 kelas)', '97,75%'],
  ['Green orange holdout (600 citra)', '99,83%'],
  ['Fresh orange eksternal holdout (200 citra)', '94,00%'],
  ['Rotten orange eksternal holdout (200 citra)', '100,0%'],
  ['Blackspot orange holdout (200 citra)', '100,0%'],
  ['Canker orange holdout (200 citra)', '98,00%'],
  ['AFQC apple fresh holdout (209 citra)', '98,56%'],
  ['AFQC apple rotten holdout (209 citra)', '98,56%'],
  ['Banana overripe holdout (239 citra)', '100,0%'],
  ['Wikimedia foto liar (16 citra, sanity check)', '68,75% (11/16)'],
];

const PIPELINE = [
  { title: 'Input 224×224×3', desc: 'RGB [0, 1], koreksi EXIF & resize bilinear' },
  { title: 'Rescaling(2, −1)', desc: 'Normalisasi internal ke rentang [-1, 1]' },
  { title: 'MobileNetV3Small', desc: 'Ekstraksi fitur 7×7×576 (ImageNet + fine-tune)' },
  { title: 'Global Average Pool', desc: 'Vektor fitur 576 dimensi (+ OOD MobileCLIP2)' },
  { title: 'Dense 6 + Softmax', desc: 'Probabilitas 6 kelas kesegaran buah' },
];

export const ModelDataPage: React.FC = () => {
  return (
    <section className="pt-28 pb-20 bg-[var(--fs-green-dark)] text-white min-h-screen border-t-2 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--fs-accent)] mb-2">
            <BarChart3 size={15} />
            Riset & Evaluasi Transparan
          </span>
          <h1 className="font-passata text-4xl sm:text-6xl uppercase font-bold tracking-tight leading-none">
            Model & Data
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
            Seluruh angka di halaman ini diambil langsung dari artefak evaluasi model aktif{' '}
            <code className="font-mono-tech text-xs bg-white/15 px-1.5 py-0.5 rounded">
              mobilenetv3small_external_green_v2
            </code>
            , termasuk hasil foto luar domain (Wikimedia) dan keterbatasan data.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((metric) => (
            <div
              key={metric.label}
              className="bg-[var(--fs-surface)] text-black rounded-2xl border-2 border-black shadow-[4px_4px_0_#000] p-5"
            >
              <div className="font-mono-tech text-xs uppercase font-bold text-black/75">
                {metric.label}
              </div>
              <div className="font-passata text-3xl sm:text-4xl text-[var(--fs-green-primary)] font-bold mt-2">
                {metric.value}
              </div>
              <p className="text-xs font-medium text-black/75 mt-2 leading-snug">
                {metric.note}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-7 bg-[var(--fs-surface)] text-black rounded-3xl border-2 border-black shadow-[5px_5px_0_#000] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-[var(--fs-green-primary)]" />
              <h2 className="font-passata text-2xl uppercase font-bold">Arsitektur Model</h2>
            </div>

            <div className="space-y-2">
              {PIPELINE.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-center gap-3 rounded-xl border border-black/20 bg-white p-3"
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[var(--fs-green-primary)] text-white font-mono-tech text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{step.title}</div>
                    <div className="text-xs text-black/75">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="rounded-xl border border-black/20 bg-white p-2.5">
                <div className="font-passata text-xl font-bold text-[var(--fs-green-primary)]">942.582</div>
                <div className="text-xs font-semibold text-black/75">parameter</div>
              </div>
              <div className="rounded-xl border border-black/20 bg-white p-2.5">
                <div className="font-passata text-xl font-bold text-[var(--fs-green-primary)]">4,13 MB</div>
                <div className="text-xs font-semibold text-black/75">ukuran .keras</div>
              </div>
              <div className="rounded-xl border border-black/20 bg-white p-2.5">
                <div className="font-passata text-xl font-bold text-[var(--fs-green-primary)]">7×7×576</div>
                <div className="text-xs font-semibold text-black/75">peta Grad-CAM</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[var(--fs-surface)] text-black rounded-3xl border-2 border-black shadow-[5px_5px_0_#000] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} className="text-[var(--fs-green-primary)]" />
              <h2 className="font-passata text-2xl uppercase font-bold">Enam Kelas</h2>
            </div>
            <div className="space-y-2">
              {CLASSES.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/20 bg-white px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-bold">{item.name}</div>
                    <div className="font-mono-tech text-xs text-black/70">{item.code}</div>
                  </div>
                  <span className="font-mono-tech text-xs font-semibold text-black/75">
                    n={item.support}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-black/75 font-medium mt-3 leading-snug">
              Support di kanan berasal dari test internal (918 citra). Kelas <strong>Apel Busuk</strong> memiliki support terkecil (n=26).
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-[var(--fs-surface)] text-black rounded-3xl border-2 border-black shadow-[5px_5px_0_#000] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-[var(--fs-green-primary)]" />
              <h2 className="font-passata text-2xl uppercase font-bold">Hasil Evaluasi Terverifikasi</h2>
            </div>
            <div className="space-y-2">
              {EVALUATION.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-black/10 pb-2 text-xs sm:text-sm"
                >
                  <span className="font-medium text-black/85">{label}</span>
                  <span className="font-mono-tech font-bold text-[var(--fs-green-primary)] shrink-0">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-black/75 font-medium mt-3 leading-relaxed">
              Catatan audit: Split internal v2 memisahkan klaster crop `dHash &lt;= 2`, tetapi audit lanjutan masih mencatat 3,92% mirror-flip dan 18,3% kemiripan embedding tinggi (`cos_sim &gt; 0,98`). Akurasi pada foto dunia nyata dengan latar kompleks lebih rendah (lihat Wikimedia 68,75%).
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-[var(--fs-surface)] text-black rounded-3xl border-2 border-black shadow-[5px_5px_0_#000] p-6">
              <div className="flex items-center gap-2 mb-3">
                <Database size={18} className="text-[var(--fs-green-primary)]" />
                <h2 className="font-passata text-2xl uppercase font-bold">Dataset</h2>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm font-medium text-black/85 list-disc pl-4">
                <li>Dataset internal Pascal VOC: 3.093 citra unik, 6.977 crop buah.</li>
                <li>AFQC apple: 2.320 citra apel segar dan busuk.</li>
                <li>Banana overripe: 1.195 citra pisang terlalu matang.</li>
                <li>Mendeley / Orange external: jeruk hijau, segar, busuk, blackspot, dan canker.</li>
                <li>Foto liar Wikimedia: 16 citra uji silang non-dataset.</li>
              </ul>
            </div>

            <div className="bg-[var(--fs-surface)] text-black rounded-3xl border-2 border-black shadow-[5px_5px_0_#000] p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-[var(--fs-green-primary)]" />
                <h2 className="font-passata text-2xl uppercase font-bold">Keterbatasan & Explainability</h2>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm font-medium text-black/85 list-disc pl-4">
                <li>Model hanya memprediksi 6 kelas buah; uraian bercak/tekstur dihitung terpisah oleh analisis citra OpenCV (bukan head klasifikasi terlatih).</li>
                <li>Gerbang OOD ganda (MobileCLIP2 + jarak embedding) menolak objek non-buah.</li>
                <li>Status RAGU aktif jika keyakinan &lt; 60%, multi-buah terdeteksi, atau foto buram/gelap pada keyakinan rendah.</li>
                <li>Hanya menilai tampilan visual kulit luar, bukan jaminan keamanan pangan.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-8">
          <Link
            to="/"
            className="min-h-12 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--fs-accent)] text-black border-2 border-black shadow-[3px_3px_0_#000] font-passata text-sm uppercase font-bold hover:bg-[var(--fs-accent-hover)] transition-colors"
          >
            Periksa Foto Buah
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/cara-kerja"
            className="min-h-12 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/40 font-passata text-sm uppercase font-bold hover:bg-white/25 transition-colors"
          >
            Lihat Cara Kerja
          </Link>
        </div>
      </div>
    </section>
  );
};

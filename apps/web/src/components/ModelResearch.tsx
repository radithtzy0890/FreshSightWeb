import React from 'react';
import { Sliders, FileText, ExternalLink } from 'lucide-react';

export const ModelResearch: React.FC = () => {
  const pipelineSteps = [
    { num: '01', title: 'Pascal VOC', desc: 'Citra + XML BBox' },
    { num: '02', title: 'dHash Dedupe', desc: 'Klaster kemiripan' },
    { num: '03', title: 'Split Bebas Bocor', desc: '70 / 15 / 15' },
    { num: '04', title: 'Crop + Pad 5%', desc: 'Resize 224x224' },
    { num: '05', title: 'MobileNetV3', desc: 'Transfer Learning' },
    { num: '06', title: 'Evaluasi F1', desc: 'Per-Class Metrics' },
    { num: '07', title: 'Grad-CAM', desc: 'Visual Explainability' },
    { num: '08', title: 'TFLite Export', desc: 'Edge Deployment' },
  ];

  const datasets = [
    {
      name: 'Fruit-freshness-detection-dataset',
      role: 'Dataset utama format Pascal VOC. Berisi 3.093 citra dan 6.977 anotasi kotak pembatas objek buah.',
      url: 'https://github.com/zijianchen98/Fruit-freshness-detection-dataset',
    },
    {
      name: 'AFQC (Apple Fruit Quality Categorization)',
      role: 'Data augmentasi eksternal apel segar dan busuk dengan 2.320 citra beresolusi tinggi.',
      url: 'https://github.com/mustafa20999/AFQC',
    },
    {
      name: 'Banana Images CNN (Over Ripe)',
      role: 'Data fine-tuning pisang terlalu matang dan busuk dengan 1.195 sampel citra nyata.',
      url: 'https://github.com/pratheesh3780/Banana_images_CNN',
    },
    {
      name: 'Orange Fruit Image Dataset (Mendeley)',
      role: '15.000 citra jeruk bertahap untuk pengembangan varian model generasi berikutnya.',
      url: 'https://data.mendeley.com/datasets/zk4hzhtcdd/2',
    },
  ];

  return (
    <section id="section-model" className="py-20 lg:py-28 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">
            Riset & Spesifikasi
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Arsitektur Model & Benchmark
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-2xl">
            Dokumentasi komprehensif alur pemrosesan dari dataset Pascal VOC hingga inferensi edge TensorFlow Lite.
          </p>
        </div>

        {/* Pipeline Flowchart */}
        <div className="surface-card p-6 sm:p-8 mb-10">
          <h3 className="text-base font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--leaf-primary)]" />
            <span>Pipeline Pelatihan & Inferensi</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            {pipelineSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between"
              >
                <span className="font-editorial text-lg font-bold text-[var(--citrus-accent)]">
                  {step.num}
                </span>
                <div className="text-[11px] font-bold text-[var(--text-main)] mt-1">{step.title}</div>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{step.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmark Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Table 1 */}
          <div className="surface-card p-6 overflow-x-auto">
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Perbandingan Tiga Model</h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase font-semibold">
                  <th className="py-2.5 pr-2">Arsitektur</th>
                  <th className="py-2.5 px-2 text-right">Uji Asli</th>
                  <th className="py-2.5 px-2 text-right">Macro F1</th>
                  <th className="py-2.5 px-2 text-right">Uji Eksternal</th>
                  <th className="py-2.5 pl-2 text-right">Ukuran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                <tr>
                  <td className="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">CNN Baseline</td>
                  <td className="py-2.5 px-2 text-right">99,60%</td>
                  <td className="py-2.5 px-2 text-right">0,9906</td>
                  <td className="py-2.5 px-2 text-right text-[var(--text-dim)]">—</td>
                  <td className="py-2.5 pl-2 text-right">5,16 MB</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">MobileNetV3 Baseline</td>
                  <td className="py-2.5 px-2 text-right">99,20%</td>
                  <td className="py-2.5 px-2 text-right">0,9871</td>
                  <td className="py-2.5 px-2 text-right text-[#C9421A]">62,21%</td>
                  <td className="py-2.5 pl-2 text-right">11,84 MB</td>
                </tr>
                <tr className="bg-[var(--leaf-soft)] font-bold text-[var(--leaf-primary)]">
                  <td className="py-2.5 pr-2 font-sans">MobileNetV3 + Eksternal</td>
                  <td className="py-2.5 px-2 text-right">99,60%</td>
                  <td className="py-2.5 px-2 text-right">0,9912</td>
                  <td className="py-2.5 px-2 text-right">90,99%</td>
                  <td className="py-2.5 pl-2 text-right">10,05 MB</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2 */}
          <div className="surface-card p-6 overflow-x-auto">
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">Varian Ekspor TensorFlow Lite</h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase font-semibold">
                  <th className="py-2.5 pr-2">Format Berkas</th>
                  <th className="py-2.5 px-2 text-right">Akurasi Asli</th>
                  <th className="py-2.5 px-2 text-right">Eksternal</th>
                  <th className="py-2.5 pl-2 text-right">Ukuran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                <tr>
                  <td className="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">
                    mobilenetv3_external_float32.tflite
                  </td>
                  <td className="py-2.5 px-2 text-right">99,60%</td>
                  <td className="py-2.5 px-2 text-right">91,28%</td>
                  <td className="py-2.5 pl-2 text-right font-bold text-[var(--leaf-primary)]">3,74 MB</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">
                    mobilenetv3_external_dynamic.tflite
                  </td>
                  <td className="py-2.5 px-2 text-right">99,10%</td>
                  <td className="py-2.5 px-2 text-right">88,37%</td>
                  <td className="py-2.5 pl-2 text-right font-bold text-[var(--leaf-primary)]">1,11 MB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Dataset Attribution */}
        <div className="surface-card p-6 sm:p-8">
          <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--leaf-primary)]" />
            <span>Sumber Dataset & Repositori</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {datasets.map((d, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-[var(--text-main)]">{d.name}</div>
                  <div className="text-[var(--text-muted)] mt-1">{d.role}</div>
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--leaf-primary)] font-bold mt-3 hover:underline"
                >
                  <span>Buka Repositori</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};


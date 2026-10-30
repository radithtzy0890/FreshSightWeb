import React from 'react';
import { Flame, ShieldCheck, BarChart3, Cpu, Target, Layers } from 'lucide-react';

export const WhyFreshSight: React.FC = () => {
  const features = [
    {
      icon: Flame,
      title: 'Prediksi yang Dapat Dijelaskan',
      desc: 'Grad-CAM memetakan fokus konvolusi layer terdalam secara visual untuk membuktikan model melihat bercak pembusukan, bukan artefak latar belakang.',
      tag: 'Convolutional Heatmap Layer',
    },
    {
      icon: ShieldCheck,
      title: 'Evaluasi Bebas Kebocoran',
      desc: 'Pembagian data (train/val/test) dilakukan berdasarkan klaster perceptual near-duplicate dHash untuk mencegah data test bocor ke data latih.',
      tag: 'Cluster-Aware Data Split',
    },
    {
      icon: BarChart3,
      title: 'Bukan Sekadar Akurasi Rata-rata',
      desc: 'Metrik presisi, recall, macro F1, dan confusion matrix transparan dilaporkan untuk setiap kelas minoritas yang rentan keliru.',
      tag: 'Per-Class Classification Metrics',
    },
    {
      icon: Cpu,
      title: 'Siap Pasang di Perangkat Edge',
      desc: 'Model diekspor ke TensorFlow Lite format float32 (3,74 MB) dan dynamic-range quantization (1,11 MB) untuk komputasi cepat di ponsel.',
      tag: 'TFLite Quantized Deployment',
    },
    {
      icon: Target,
      title: 'Pengujian Eksternal yang Jujur',
      desc: '344 citra eksternal mandiri dan foto Wikimedia diuji terpisah untuk membuktikan performa nyata di luar dataset laboratorium.',
      tag: 'Independent Benchmark Set',
    },
    {
      icon: Layers,
      title: 'Inspeksi Multi-Layer',
      desc: 'Inspeksi dapat dialihkan seketika antara foto mentah, peta panas aktivasi Grad-CAM, serta segmentasi bercak cacat visual buah.',
      tag: 'Interactive Layer Blending',
    },
  ];

  return (
    <section className="py-12 lg:py-20">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-2">
            Arsitektur & Transparansi
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Mengapa FreshSight Berbeda
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] mt-4">
            Bukan sekadar memberikan label tunggal, sistem dirancang untuk memberikan pertanggungjawaban visual dan integritas evaluasi ilmiah.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div key={idx} className="surface-card-interactive p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-main)] mb-2">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
                  {f.tag}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


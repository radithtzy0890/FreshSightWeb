import React from 'react';
import { BarChart3, Lock, Flame, Cpu, Target, Layers } from 'lucide-react';

const FEATURES = [
  {
    icon: <BarChart3 size={24} className="text-[#1E6B3A]" />,
    title: 'Bukan sekadar akurasi',
    desc: 'Presisi, recall, F1 per kelas, dan matriks kebingungan (confusion matrix) memperlihatkan kelas minoritas yang gagal.',
  },
  {
    icon: <Lock size={24} className="text-[#1E6B3A]" />,
    title: 'Evaluasi bebas kebocoran',
    desc: 'Data dibagi per klaster near-duplicate dHash, bukan per gambar tunggal, menjamin validitas pengujian statistik.',
  },
  {
    icon: <Flame size={24} className="text-[#F6B21A]" />,
    title: 'Prediksi yang bisa dijelaskan',
    desc: 'Grad-CAM visual menunjukkan arah atensi model; fitur cacat kuantitatif menjelaskan alasan buah divonis busuk.',
  },
  {
    icon: <Cpu size={24} className="text-[#1E6B3A]" />,
    title: 'Siap dipasang pada edge device',
    desc: 'Model TFLite float32 (3,74 MB) dan dynamic-range (1,11 MB) siap dieksekusi offline di perangkat seluler.',
  },
  {
    icon: <Target size={24} className="text-[#1E6B3A]" />,
    title: 'Pengujian eksternal yang jujur',
    desc: '344 gambar eksternal dan 16 foto Wikimedia dilaporkan secara terpisah dan independen dari dataset uji asli.',
  },
  {
    icon: <Layers size={24} className="text-[#F6B21A]" />,
    title: 'Foto asli, Grad-CAM, & area cacat',
    desc: 'Inspektur multi-lapis interaktif memungkinkan pengguna menggeser dan mengatur intensitas pembacaan bercak.',
  },
];

export const WhyFreshSight: React.FC = () => {
  return (
    <section id="section-fitur" className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
      <div className="space-y-3 mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-[#1E6B3A] block">
          Keunggulan Metodologi
        </span>
        <h2 className="font-blast text-3xl sm:text-5xl text-[#14261B]">
          Mengapa FreshSight
        </h2>
        <p className="text-[#5B685E] text-base max-w-2xl">
          Dirancang untuk transparansi penalaran machine learning—bukan sekadar kotak hitam yang memberikan angka tanpa dasar visual.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feat, i) => (
          <div
            key={i}
            className="card-soft p-6 flex flex-col justify-between group hover:border-[#F6B21A]/50"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF6ED] flex items-center justify-center group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-[#14261B] tracking-tight">
                {feat.title}
              </h3>
              <p className="text-sm text-[#5B685E] leading-relaxed">
                {feat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};


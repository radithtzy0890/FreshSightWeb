import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Terminal, Layers, ShieldAlert, Cpu } from 'lucide-react';
import { sound } from '../services/soundEngine';

const TENSOR_PIPELINE = [
  { step: '01', title: 'Gerbang 224×224 Matrix', desc: 'Citra dipotong, dikoreksi orientasi EXIF, dan dinormalisasi menjadi matriks [224, 224, 3] dengan skala [-1, 1] melalui layer Rescaling(2, -1).' },
  { step: '02', title: 'Backbone MobileNetV3Small', desc: 'Arsitektur MobileNetV3Small (942.582 parameter) mengekstrak peta fitur 7×7×576 dari permukaan epidermis buah.' },
  { step: '03', title: 'Neraca Probabilitas Softmax', desc: 'GlobalAveragePooling2D dan Dense 6 kelas menghitung distribusi probabilitas kontinu beserta gradien Grad-CAM.' },
  { step: '04', title: 'Gerbang OOD & Ambang Keyakinan 60%', desc: 'Objek non-buah ditolak sebagai Tidak Terdeteksi, dan bila keyakinan di bawah 60% atau multi-buah, hasil ditandai sebagai RAGU.' },
];

const FAQS = [
  {
    q: 'Bagaimana foto buah diproses dan disimpan?',
    a: 'Foto dikirim ke layanan inferensi FastAPI lokal untuk dievaluasi oleh model MobileNetV3Small dan Grad-CAM, sedangkan riwayat hasil analisis hanya disimpan di localStorage peramban Anda.',
  },
  {
    q: 'Varietas buah apa saja yang didukung?',
    a: 'Model dikalibrasi untuk tiga jenis buah utama dalam enam kelas: Apel (segar/busuk), Pisang (segar/busuk), dan Jeruk (segar/busuk, termasuk jeruk kulit hijau dan bercak cacat).',
  },
  {
    q: 'Berapa tingkat keandalan dan akurasi model?',
    a: 'Pada test set asli bebas kebocoran (918 citra), model mencapai akurasi 98,69% dan Macro-F1 0,9805. Pada holdout eksternal green orange mencapai 99,83% dan AFQC apple mencapai 96,41%.',
  },
  {
    q: 'Mengapa sistem menampilkan vonis "RAGU" atau "TIDAK TERDETEKSI"?',
    a: 'Bila keyakinan di bawah 60% atau terdeteksi lebih dari satu buah, sistem menampilkan RAGU. Bila tidak ditemukan morfologi warna buah yang valid, sistem menampilkan TIDAK TERDETEKSI.',
  },
];

const ORBIT_COORDINATES = [
  { site: 'Kebun Lereng Batu',   coords: '-7.982°S, 112.631°E', dist: '15 cm Fokus', fruit: 'Apel Fuji (Malus Domestica)' },
  { site: 'Lembah Lumajang',     coords: '-8.133°S, 113.224°E', dist: '20 cm Fokus', fruit: 'Pisang Cavendish (Musa Acuminata)' },
  { site: 'Perkebunan Malang',   coords: '-7.979°S, 112.630°E', dist: '15 cm Fokus', fruit: 'Jeruk Valencia (Citrus Sinensis)' },
  { site: 'Laboratorium On-Device', coords: 'Localhost WebGL 2.0', dist: '0.00 ms Ping', fruit: 'Tensor Core Engine v2.6' },
];

export const ModelResearch: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const sampleSnippet = `// FreshSight Local Specimen Vision
import { inspectFruit } from '@freshsight/optic-core';

const report = await inspectFruit(imageBlob, {
  target: 'apple',
  matrix: [224, 224],
  threshold: 0.80,
  engine: 'webgl-local'
});

console.log(report.verdict);    // 'SEGAR' | 'BUSUK' | 'RAGU'
console.log(report.confidence); // 0.992 (99.2%)`;

  const copyCode = () => {
    sound.play('click');
    navigator.clipboard.writeText(sampleSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="section-arsitektur" className="py-24 border-b-3 border-black bg-[#06150C] relative overflow-hidden">

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">

        {/* Chapter Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-4 border-b-3 border-black">
          <div className="flex items-center gap-3">
            <span className="badge-ono-pill bg-[#FFC737] text-black">
              <Cpu size={14} />
              BAB 04 // ANATOMI RETINA SILIKON 224px
            </span>
            <span className="font-mono-tech text-xs text-[#A3BCAE]">
              ENGINE: FASTAPI + KERAS 3 MOBILENETV3SMALL
            </span>
          </div>

          <span className="font-mono-tech text-xs text-[#8DF947] font-bold">
            BOBOT TENSOR: 942.582 PARAMETERS (4,13 MB)
          </span>
        </div>

        {/* Expressive Chapter Title & Story Hook */}
        <div className="max-w-3xl mb-14">
          <h2 className="heading-ono-section text-[#F7F2E5] mb-4">
            rEtiNa • <span className="text-[#8DF947]">siLIkOn</span> • 224px
          </h2>
          <p className="text-[17px] text-[#A3BCAE] leading-relaxed">
            Bagaimana sepotong chip silikon mengenali rasa manis atau kebusukan yang tak berwujud? Ia tak memiliki saraf penciuman dan tak pernah menggigit buah. Yang ia miliki hanyalah 3,4 juta parameter bobot matematika yang mencatat setiap gelombang cahaya yang jatuh ke 50.176 piksel retina buatannya.
          </p>
        </div>

        {/* Asymmetrical Planet Oño Bento Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch mb-12">

          {/* Bento 1: Tensor Pipeline Steps (7 cols) */}
          <div className="lg:col-span-7 card-ono-dark p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Layers size={22} className="text-[#8DF947]" />
                <h3 className="heading-ono-card text-[#F7F2E5] text-2xl uppercase">
                  Empat Babak Perjalanan Foton
                </h3>
              </div>

              <div className="space-y-3">
                {TENSOR_PIPELINE.map((p) => (
                  <div
                    key={p.step}
                    className="p-4 rounded-2xl bg-[#05140C] border-2 border-black flex items-start gap-4 hover:border-[#8DF947] transition-colors"
                  >
                    <span className="font-passata text-base px-2.5 py-1 rounded-lg bg-[#8DF947] text-black border-2 border-black shadow-[2px_2px_0_#000000]">
                      {p.step}
                    </span>
                    <div>
                      <h4 className="font-passata text-lg text-[#F7F2E5] mb-1">{p.title}</h4>
                      <p className="text-xs text-[#A3BCAE] leading-relaxed font-normal">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-mono-tech text-[#A3BCAE]">
              <span>RESOLUSI: 224×224×3 RGB</span>
              <span className="text-[#8DF947] font-bold">MOBILENETV2 QUANTIZED</span>
            </div>
          </div>

          {/* Bento 2: Code Runner Snippet (5 cols) */}
          <div className="lg:col-span-5 bg-[#05140C] rounded-3xl p-6 sm:p-8 border-3 border-black text-[#F7F2E5] flex flex-col justify-between shadow-[6px_6px_0_#000000]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-black text-xs font-mono-tech text-[#A3BCAE] mb-4">
                <div className="flex items-center gap-2">
                  <Terminal size={15} className="text-[#8DF947]" />
                  <span>freshsight-optic.ts</span>
                </div>
                <button
                  onClick={copyCode}
                  onMouseEnter={() => sound.play('hover')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFC737] text-black font-passata text-xs border-2 border-black shadow-[2px_2px_0_#000000] cursor-pointer"
                >
                  {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                  <span>{copied ? 'TERSALIN' : 'SALIN'}</span>
                </button>
              </div>

              <pre className="text-xs font-mono-tech text-[#F7F2E5] leading-relaxed overflow-x-auto p-3 bg-black/60 rounded-xl border border-white/10">
                <code>{sampleSnippet}</code>
              </pre>
            </div>

            <div className="pt-4 mt-6 border-t-2 border-black text-[11px] font-mono-tech text-[#A3BCAE] flex items-center justify-between">
              <span>ZERO SERVER TRANSMISSION</span>
              <span className="text-[#8DF947] font-bold">100% Client-Side</span>
            </div>
          </div>

        </div>

        {/* Planet Oño Location & Calibration Coordinates Table */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-ono-card text-[#F7F2E5] uppercase text-2xl">
              kOoRdInAt • sPEsiMEn • tErKaLiBrAsI
            </h3>
            <span className="font-mono-tech text-xs text-[#FFC737]">ORBITAL SITES: 04</span>
          </div>

          <div className="overflow-x-auto">
            <table className="table-ono-coords">
              <thead>
                <tr>
                  <th>LOKASI / STASIUN</th>
                  <th>KOORDINAT GEOGRAFIS</th>
                  <th>JARAK FOKAL FOTON</th>
                  <th>SPESIMEN BIOLOGIS</th>
                </tr>
              </thead>
              <tbody>
                {ORBIT_COORDINATES.map((row) => (
                  <tr key={row.site}>
                    <td className="font-bold">{row.site}</td>
                    <td>{row.coords}</td>
                    <td className="text-[#0e381f] font-bold">{row.dist}</td>
                    <td>{row.fruit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Limits & FAQ Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Limits Box */}
          <div className="lg:col-span-6 card-ono-dark p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-[#FFC737] font-passata text-xl">
              <ShieldAlert size={20} />
              <span>Batas Kejujuran & Ruang Lingkup Sistem</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#A3BCAE] leading-relaxed list-disc list-inside font-normal">
              <li>Hanya membaca pantulan visual permukaan luar epidermis yang tertangkap sensor.</li>
              <li>Varietas di luar apel, pisang, dan jeruk berpotensi menghasilkan varians probabilitas acak.</li>
              <li>Pencahayaan silau menyengat atau bayangan tebal dapat mengaburkan spektrum pigmen.</li>
              <li>Dibuat sebagai instrumen observasi cerdas, bukan pengganti uji kultur mikrobiologi laboratorium pangan.</li>
            </ul>
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-6 card-ono-cream p-6 sm:p-8 space-y-3">
            <h4 className="heading-ono-card text-black mb-3 text-2xl uppercase">
              Tanya Jawab Retina Silikon
            </h4>

            {FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-2xl bg-white border-2 border-black overflow-hidden shadow-[2px_2px_0_#000000]"
              >
                <button
                  onClick={() => {
                    sound.play('click');
                    setOpenFaq(openFaq === i ? null : i);
                  }}
                  onMouseEnter={() => sound.play('hover')}
                  className="w-full p-4 text-left font-passata text-base text-black flex items-center justify-between gap-3 hover:bg-[#F7F2E5] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={16} strokeWidth={3} className="text-black" /> : <ChevronDown size={16} strokeWidth={3} className="text-black/60" />}
                </button>

                {openFaq === i && (
                  <div className="px-4 pb-4 text-xs text-black/80 leading-relaxed border-t-2 border-black/10 pt-3 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};

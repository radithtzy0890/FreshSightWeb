import React from 'react';

export const WorkflowSteps: React.FC = () => {
  return (
    <section className="py-16 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col items-center text-center max-w-xl mx-auto mb-14">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-2">
            Alur Kerja
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
            Tiga Langkah Mudah
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="surface-card p-6 flex flex-col">
            <span className="font-editorial text-5xl font-bold text-[var(--citrus-accent)] mb-3">01</span>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-2">Ambil atau Unggah Foto</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Gunakan kamera ponsel atau galeri file (JPG/PNG). Foto satu buah di tengah dengan pencahayaan cukup untuk hasil terbaik.
            </p>
          </div>

          <div className="surface-card p-6 flex flex-col">
            <span className="font-editorial text-5xl font-bold text-[var(--citrus-accent)] mb-3">02</span>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-2">Sistem Membaca Citra</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Buah disegmentasikan dari latar belakang, kemudian metrik bio-optik seperti warna HSV, bercak, dan kontras tekstur diukur.
            </p>
          </div>

          <div className="surface-card p-6 flex flex-col">
            <span className="font-editorial text-5xl font-bold text-[var(--citrus-accent)] mb-3">03</span>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-2">Pahami Hasil & Alasannya</h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Peta panas Grad-CAM dan diagnostik naratif memperlihatkan alasan persis mengapa buah tersebut diklasifikasikan segar atau busuk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const BenchmarkBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          const bars = containerRef.current?.querySelectorAll('[data-bar-target]');
          bars?.forEach((bar) => {
            const target = bar.getAttribute('data-bar-target');
            gsap.to(bar, {
              width: `${target}%`,
              duration: 1.4,
              ease: 'power2.out',
            });
          });
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} id="benchmark-section" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="surface-card bg-[#122A1E] text-white p-8 sm:p-12 lg:p-14 rounded-3xl relative overflow-hidden shadow-2xl">
          {/* Background Ambient Glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#1C6E3D] opacity-40 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest text-[#52D487] mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dampak Data Eksternal</span>
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                Lonjakan 62% ke 91% pada Foto Dunia Nyata
              </h2>
              <p className="text-sm sm:text-base text-[#C2D8C9] leading-relaxed max-w-xl">
                Menambahkan 1.011 apel segar, 1.028 apel busuk, dan 954 pisang terlalu matang dari repositori publik membekali model ketahanan terhadap variasi cahaya dan sudut kamera ponsel tanpa menyentuh test-set asli.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-5 bg-[#0C1E15] p-6 rounded-2xl border border-[#1E3B2C]">
              <div>
                <div className="flex items-center justify-between text-xs text-[#9EB9A6] mb-1.5 font-medium">
                  <span>MobileNetV3 Baseline</span>
                  <span className="font-mono text-white font-bold">62,21%</span>
                </div>
                <div className="h-3 rounded-full bg-[#183425] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#759180] transition-all duration-1000"
                    style={{ width: '0%' }}
                    data-bar-target="62.21"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-[#9EB9A6] mb-1.5 font-medium">
                  <span>MobileNetV3 + Data Eksternal</span>
                  <span className="font-mono text-[#52D487] font-bold">90,99%</span>
                </div>
                <div className="h-3 rounded-full bg-[#183425] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#52D487] transition-all duration-1000"
                    style={{ width: '0%' }}
                    data-bar-target="90.99"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E3B2C] flex items-center justify-between text-xs text-[#9EB9A6]">
                <span>Peningkatan Akurasi Uji</span>
                <span className="text-[#52D487] font-bold font-mono">+28,78%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


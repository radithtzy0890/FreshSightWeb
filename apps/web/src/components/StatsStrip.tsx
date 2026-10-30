import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { formatNumber } from '../services/cvEngine';

export const StatsStrip: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          const counters = containerRef.current?.querySelectorAll('[data-counter-target]');
          counters?.forEach((el) => {
            const target = parseFloat(el.getAttribute('data-counter-target') || '0');
            const decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
            const suffix = el.getAttribute('data-counter-suffix') || '';

            gsap.to(
              { val: 0 },
              {
                val: target,
                duration: 1.8,
                ease: 'power2.out',
                onUpdate: function () {
                  el.textContent = formatNumber(this.targets()[0].val, decimals) + suffix;
                },
              }
            );
          });
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="stats-strip"
      ref={containerRef}
      className="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-12"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          <div className="flex flex-col border-r border-[var(--border-subtle)] last:border-0 pr-4">
            <span
              className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--leaf-primary)] tabular-numbers"
              data-counter-target="99.6"
              data-counter-decimals="2"
              data-counter-suffix="%"
            >
              99,60%
            </span>
            <span className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">
              Akurasi Uji Asli (997 objek)
            </span>
          </div>
          <div className="flex flex-col border-r border-[var(--border-subtle)] last:border-0 pr-4">
            <span
              className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--leaf-primary)] tabular-numbers"
              data-counter-target="90.99"
              data-counter-decimals="2"
              data-counter-suffix="%"
            >
              90,99%
            </span>
            <span className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">
              Akurasi Uji Eksternal (344 foto)
            </span>
          </div>
          <div className="flex flex-col border-r border-[var(--border-subtle)] last:border-0 pr-4">
            <span
              className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--citrus-accent)] tabular-numbers"
              data-counter-target="6"
              data-counter-decimals="0"
            >
              6
            </span>
            <span className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">
              Kelas Kesegaran Buah
            </span>
          </div>
          <div className="flex flex-col pr-4">
            <span
              className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--leaf-primary)] tabular-numbers"
              data-counter-target="3.74"
              data-counter-decimals="2"
              data-counter-suffix=" MB"
            >
              3,74 MB
            </span>
            <span className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">
              Ukuran Model TFLite Siap Pakai
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};


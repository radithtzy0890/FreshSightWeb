import React, { useState, useEffect } from 'react';
import { Scan, ChevronRight } from 'lucide-react';
import { FruitSvg } from './FruitSvg';
import { DemoPreset, InspectionViewMode } from '../types';
import { FRUIT_NAMES, formatPercent } from '../services/cvEngine';

interface HeroProps {
  onNavigate: (sectionId: string) => void;
  presets: DemoPreset[];
}

export const Hero: React.FC<HeroProps> = ({ onNavigate, presets }) => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<InspectionViewMode>('asli');
  const [autoRotate, setAutoRotate] = useState(true);

  const currentPreset = presets[selectedPresetIdx] || presets[0];

  const handleSelectPreset = (idx: number) => {
    setAutoRotate(false);
    setSelectedPresetIdx(idx);
    setIsScanning(true);
    setViewMode('asli');

    setTimeout(() => {
      setIsScanning(false);
      setViewMode('cam');
    }, 900);
  };

  // Auto rotation
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setSelectedPresetIdx((prev) => {
        const next = (prev + 1) % presets.length;
        setIsScanning(true);
        setViewMode('asli');
        setTimeout(() => {
          setIsScanning(false);
          setViewMode('cam');
        }, 900);
        return next;
      });
    }, 6200);

    return () => clearInterval(interval);
  }, [autoRotate, presets.length]);

  const isRot = currentPreset[1] === 1;
  const badgeColor = isRot
    ? 'bg-[#FDE8E1] text-[#C9421A] dark:bg-[#361919] dark:text-[#F87171]'
    : 'bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]';
  const statusText = isRot ? 'Busuk' : 'Segar';
  const fruitTitle = `${FRUIT_NAMES[currentPreset[0]]} ${statusText}`;

  return (
    <section
      id="section-beranda"
      className="relative min-h-[92vh] pt-28 pb-16 flex items-center overflow-hidden"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 rounded-full bg-[var(--citrus-soft)] opacity-60 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 -left-24 w-96 h-96 rounded-full bg-[var(--leaf-soft)] opacity-70 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-6 sm:px-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Editorial Headline */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="hero-badge-reveal inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[var(--leaf-soft)] text-[var(--leaf-primary)] border border-[var(--border-subtle)] mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[var(--leaf-primary)] animate-pulse" />
              <span>Explainable Fruit-Freshness AI</span>
            </div>

            <h1 className="hero-title-reveal font-editorial text-4xl sm:text-6xl lg:text-[4.25rem] leading-[1.04] font-bold text-[var(--text-main)] mb-6 tracking-tight">
              Masih <em className="italic text-[var(--leaf-primary)] font-normal">segar</em>, atau sudah lewat batas?
            </h1>

            <p className="hero-desc-reveal text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-xl mb-8">
              Dari satu foto apel, pisang, atau jeruk, FreshSight menentukan klasifikasi segar atau busuk serta mengekspos area defek penyebabnya dengan Grad-CAM berbasis explainable AI.
            </p>

            <div className="hero-cta-reveal flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => onNavigate('section-analisis')}
                className="btn-magnetic px-6 py-3.5 rounded-full text-sm font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>Mulai Analisis Buah</span>
                <Scan className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('section-model')}
                className="btn-magnetic px-6 py-3.5 rounded-full text-sm font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Eksplorasi Model</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Optical Stage Pedestal */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="hero-stage-card surface-card p-4 sm:p-5 w-full max-w-[420px] relative shadow-2xl">
              <div
                className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-[#ECE7DC] dark:bg-[#1A281F] flex items-center justify-center ${
                  isScanning ? 'is-scanning' : ''
                }`}
              >
                <div className="scanner-sweep" />
                <div className="reticle-bracket" />
                <FruitSvg
                  fruit={currentPreset[0]}
                  isRotten={currentPreset[1]}
                  spotCount={currentPreset[4]}
                  viewMode={viewMode}
                />
              </div>

              {/* Realtime Floating Verdict Card */}
              <div
                className={`absolute bottom-7 left-7 right-7 surface-glass p-3 rounded-xl flex items-center justify-between shadow-xl transition-all duration-300 ${
                  isScanning ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                    {statusText}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    {formatPercent(currentPreset[2])}
                  </span>
                </div>
                <div className="text-xs font-bold text-[var(--text-main)]">{fruitTitle}</div>
              </div>
            </div>

            {/* Preset Selector Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-sm" role="group" aria-label="Pilih Contoh Buah">
              {presets.map((preset, idx) => {
                const isSelected = idx === selectedPresetIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(idx)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--text-main)] text-[var(--bg-primary)] border-[var(--text-main)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {FRUIT_NAMES[preset[0]]} {preset[1] ? 'Busuk' : 'Segar'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


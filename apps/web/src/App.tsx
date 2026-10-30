import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ResultsInspector } from './components/ResultsInspector';
import { HistoryJournal } from './components/HistoryJournal';
import { Footer } from './components/Footer';
import { AnalysisResult, DemoPreset } from './types';
import { createSampleFruitDataUrl, loadImageElement } from './services/cvEngine';

gsap.registerPlugin(ScrollTrigger);

const DEMO_PRESETS: DemoPreset[] = [
  ['apple',  0, 0.992, 1,  0, '–',            8.2,  0.09],
  ['apple',  1, 0.946, 24, 5, 'tengah kiri', 47.1,  0.31],
  ['banana', 0, 0.988, 2,  1, '–',            9.8,  0.12],
  ['banana', 1, 0.974, 32, 4, 'tengah',      42.5,  0.18],
  ['orange', 0, 0.985, 1,  0, '–',            8.9,  0.10],
  ['orange', 1, 0.880, 11, 2, 'bawah kiri',  33.4,  0.22],
];

interface ToastItem {
  id: number;
  message: string;
  type: 'default' | 'success' | 'error';
}

const TOAST_ICONS = {
  success: <CheckCircle2 size={16} className="text-[#00FF87]" />,
  error:   <AlertCircle size={16} className="text-[#FF4D6D]" />,
  default: <Info size={16} className="text-[#00FF87]" />,
};

// Seed initial history if empty so user immediately sees high-res fruit photos in Riwayat
function getInitialHistory(): AnalysisResult[] {
  try {
    const saved = localStorage.getItem('freshsight_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const appleSegarUrl = createSampleFruitDataUrl('apple', 0);
  const bananaBusukUrl = createSampleFruitDataUrl('banana', 1);
  const orangeSegarUrl = createSampleFruitDataUrl('orange', 0);
  const appleBusukUrl = createSampleFruitDataUrl('apple', 1);

  const initialItems: AnalysisResult[] = [
    {
      id: 101,
      fruit: 'apple',
      rot: 0,
      conf: 0.992,
      verdict: 'segar',
      n: 0,
      rasio: 1,
      loc: '–',
      jw: 8.2,
      tk: 0.09,
      p: [0.992, 0.008, 0, 0, 0, 0],
      src: 'contoh',
      model: 'MobileNetV2 (Edge)',
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      img: appleSegarUrl,
      thumb: appleSegarUrl,
    },
    {
      id: 102,
      fruit: 'banana',
      rot: 1,
      conf: 0.974,
      verdict: 'busuk',
      n: 4,
      rasio: 32,
      loc: 'tengah',
      jw: 42.5,
      tk: 0.18,
      p: [0, 0, 0.026, 0.974, 0, 0],
      src: 'contoh',
      model: 'MobileNetV2 (Edge)',
      date: new Date(Date.now() - 3600000 * 5).toISOString(),
      img: bananaBusukUrl,
      thumb: bananaBusukUrl,
    },
    {
      id: 103,
      fruit: 'orange',
      rot: 0,
      conf: 0.985,
      verdict: 'segar',
      n: 0,
      rasio: 1,
      loc: '–',
      jw: 8.9,
      tk: 0.10,
      p: [0, 0, 0, 0, 0.985, 0.015],
      src: 'contoh',
      model: 'MobileNetV2 (Edge)',
      date: new Date(Date.now() - 3600000 * 12).toISOString(),
      img: orangeSegarUrl,
      thumb: orangeSegarUrl,
    },
    {
      id: 104,
      fruit: 'apple',
      rot: 1,
      conf: 0.946,
      verdict: 'busuk',
      n: 5,
      rasio: 24,
      loc: 'tengah kiri',
      jw: 47.1,
      tk: 0.31,
      p: [0.054, 0.946, 0, 0, 0, 0],
      src: 'contoh',
      model: 'MobileNetV2 (Edge)',
      date: new Date(Date.now() - 3600000 * 24).toISOString(),
      img: appleBusukUrl,
      thumb: appleBusukUrl,
    },
  ];

  try {
    localStorage.setItem('freshsight_history', JSON.stringify(initialItems));
  } catch {}

  return initialItems;
}

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('section-hero');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>(getInitialHistory);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lenisRef = useRef<Lenis | null>(null);

  const showToast = useCallback((message: string, type: 'default' | 'success' | 'error' = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.8,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    if (!CSS.supports('animation-timeline', 'scroll()')) {
      const bar = document.getElementById('scroll-progress');
      if (bar) {
        lenis.on('scroll', ({ progress }: { progress: number }) => {
          bar.style.transform = `scaleX(${progress})`;
        });
      }
    }

    return () => lenis.destroy();
  }, []);

  // Section Tracking
  useEffect(() => {
    const sectionIds = [
      'section-hero',
      'section-cara-kerja',
      'section-riwayat',
    ];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const offset = 180;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - offset;
          const height = el.offsetHeight;
          if (scrollY >= top && scrollY < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateTo = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -88 });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveSection(sectionId);
  }, []);

  // Handle Analysis Complete
  const handleAnalysisComplete = useCallback(async (res: AnalysisResult) => {
    setCurrentResult(res);

    let thumbnail: string = res.thumb || res.img || '';
    if (!thumbnail && res.img) {
      try {
        const img = await loadImageElement(res.img);
        const c = document.createElement('canvas');
        const scale = Math.min(1, 280 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        thumbnail = c.toDataURL('image/jpeg', 0.85);
      } catch {}
    }

    const historyItem: AnalysisResult = {
      ...res,
      img: res.img || thumbnail,
      thumb: thumbnail || res.img,
    };

    setHistory((prev) => {
      const updated = [historyItem, ...prev].slice(0, 30);
      try { localStorage.setItem('freshsight_history', JSON.stringify(updated)); } catch {}
      return updated;
    });

    navigateTo('section-cara-kerja');
  }, [navigateTo]);

  const handleSelectHistoryDetail = (item: AnalysisResult) => {
    setCurrentResult(item);
    navigateTo('section-cara-kerja');
    showToast(`Spesimen ${item.fruit} berhasil dipasang pada lensa diagnosis.`, 'default');
  };

  const handleDeleteHistoryItem = (id: number) => {
    setHistory((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      try { localStorage.setItem('freshsight_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
    showToast('Spesimen dihapus dari arsip.');
  };

  const handleClearHistory = () => {
    if (window.confirm('Kosongkan seluruh arsip spesimen pada perangkat ini?')) {
      setHistory([]);
      try { localStorage.setItem('freshsight_history', '[]'); } catch {}
      showToast('Seluruh arsip spesimen berhasil dikosongkan.');
    }
  };

  return (
    <>
      <Navbar activeSection={activeSection} onNavigate={navigateTo} />

      <main>
        {/* Scene 1: Hero Stage with Comic Blast & Pedestal & Slider (Image 1) */}
        <Hero
          onAnalysisComplete={handleAnalysisComplete}
          showToast={showToast}
          presets={DEMO_PRESETS}
        />

        {/* Scene 2 & 3: HOW IT WORKS + IMPACT BANNER (Image 2 & 3) */}
        <ResultsInspector
          result={currentResult}
          onNavigate={navigateTo}
          showToast={showToast}
        />

        {/* Scene 4: WHERE TO FIND US Star Charts & Photo History (Image 4) */}
        <HistoryJournal
          history={history}
          onSelectDetail={handleSelectHistoryDetail}
          onDeleteItem={handleDeleteHistoryItem}
          onClearAll={handleClearHistory}
          onNavigate={navigateTo}
        />
      </main>

      <Footer onNavigate={navigateTo} />

      {/* Floating Tactical Notification */}
      <div
        className="fixed bottom-6 right-4 sm:right-8 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifikasi Studio"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#09170E] text-[#F3FDF6] border border-[#00FF87]/30 shadow-[0_0_25px_rgba(0,255,135,0.25)] text-xs font-mono-tech"
          >
            <span className="shrink-0">{TOAST_ICONS[toast.type]}</span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((p) => p.filter((t) => t.id !== toast.id))}
              className="text-[#5D796A] hover:text-[#00FF87] transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

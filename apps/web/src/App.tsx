import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StatsStrip } from './components/StatsStrip';
import { BenchmarkBanner } from './components/BenchmarkBanner';
import { WhyFreshSight } from './components/WhyFreshSight';
import { WorkflowSteps } from './components/WorkflowSteps';
import { AnalysisStudio } from './components/AnalysisStudio';
import { ResultsInspector } from './components/ResultsInspector';
import { HistoryJournal } from './components/HistoryJournal';
import { ModelResearch } from './components/ModelResearch';
import { Footer } from './components/Footer';
import { AnalysisResult, DemoPreset } from './types';
import { loadImageElement } from './services/cvEngine';

gsap.registerPlugin(ScrollTrigger);

const DEMO_PRESETS: DemoPreset[] = [
  ['apple', 0, 0.992, 1, 0, '–', 8.2, 0.09],
  ['apple', 1, 0.946, 24, 5, 'tengah kiri', 47.1, 0.31],
  ['banana', 0, 0.988, 2, 1, '–', 9.8, 0.12],
  ['banana', 1, 0.974, 32, 4, 'tengah', 42.5, 0.18],
  ['orange', 0, 0.985, 1, 0, '–', 8.9, 0.1],
  ['orange', 1, 0.88, 11, 2, 'bawah kiri', 33.4, 0.22],
];

interface ToastItem {
  id: number;
  message: string;
  type: 'default' | 'success' | 'error';
}

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('section-beranda');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('fs_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [history, setHistory] = useState<AnalysisResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('freshsight_history') || '[]');
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lenisRef = useRef<Lenis | null>(null);

  const showToast = useCallback((message: string, type: 'default' | 'success' | 'error' = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('fs_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Lenis Smooth Scroll Setup
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.8,
    });

    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Fallback for CSS scroll-driven progress bar
    if (!CSS.supports('animation-timeline', 'scroll()')) {
      const progressBar = document.getElementById('scroll-progress');
      if (progressBar) {
        lenis.on('scroll', ({ progress }: { progress: number }) => {
          progressBar.style.transform = `scaleX(${progress})`;
        });
      }
    }

    return () => {
      lenis.destroy();
    };
  }, []);

  // Section Observer to update active navigation pill
  useEffect(() => {
    const sectionIds = [
      'section-beranda',
      'section-analisis',
      'section-hasil',
      'section-riwayat',
      'section-model',
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

  // Handle new analysis completion
  const handleAnalysisComplete = useCallback(async (res: AnalysisResult) => {
    setCurrentResult(res);

    let thumbnail: string | null = null;
    if (res.img) {
      try {
        const img = await loadImageElement(res.img);
        const c = document.createElement('canvas');
        const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        thumbnail = c.toDataURL('image/jpeg', 0.7);
      } catch {}
    }

    const historyItem: AnalysisResult = {
      ...res,
      img: null,
      cam: null,
      msk: null,
      thumb: thumbnail,
    };

    setHistory((prev) => {
      const updated = [historyItem, ...prev].slice(0, 40);
      try {
        localStorage.setItem('freshsight_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    navigateTo('section-hasil');
    showToast('Analisis selesai! Menampilkan hasil.', 'success');
  }, [navigateTo, showToast]);

  const handleSelectHistoryDetail = (item: AnalysisResult) => {
    const fullResult: AnalysisResult = item.thumb
      ? { ...item, img: item.thumb, cam: null, msk: null }
      : item;
    setCurrentResult(fullResult);
    navigateTo('section-hasil');
  };

  const handleDeleteHistoryItem = (id: number) => {
    setHistory((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      try {
        localStorage.setItem('freshsight_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Item berhasil dihapus dari riwayat.');
  };

  const handleClearHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat analisis dari perangkat ini?')) {
      setHistory([]);
      try {
        localStorage.setItem('freshsight_history', '[]');
      } catch {}
      showToast('Semua riwayat telah dibersihkan.');
    }
  };

  return (
    <>
      <Navbar
        activeSection={activeSection}
        onNavigate={navigateTo}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main>
        <Hero onNavigate={navigateTo} presets={DEMO_PRESETS} />
        <StatsStrip />
        <BenchmarkBanner />
        <WhyFreshSight />
        <WorkflowSteps />
        <AnalysisStudio
          onAnalysisComplete={handleAnalysisComplete}
          showToast={showToast}
          presets={DEMO_PRESETS}
        />
        <ResultsInspector
          result={currentResult}
          onNavigate={navigateTo}
          showToast={showToast}
        />
        <HistoryJournal
          history={history}
          onSelectDetail={handleSelectHistoryDetail}
          onDeleteItem={handleDeleteHistoryItem}
          onClearAll={handleClearHistory}
          onNavigate={navigateTo}
        />
        <ModelResearch />
      </main>

      <Footer onNavigate={navigateTo} />

      {/* Toast Notification Container */}
      <div
        id="toast-container"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const bg =
            toast.type === 'success'
              ? 'bg-[#122A1E] text-[#88D49E] border-[#224430]'
              : 'bg-[#132419] text-[#F1F6F0] border-[#2A3F30]';
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-xl text-xs sm:text-sm font-semibold pointer-events-auto transition-all duration-300 ${bg}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  toast.type === 'success' ? 'bg-[#52D487]' : 'bg-[#EFA018]'
                }`}
              />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};


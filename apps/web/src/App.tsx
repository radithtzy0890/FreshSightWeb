import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ResultsInspector } from './components/ResultsInspector';
import { HistoryJournal } from './components/HistoryJournal';
import { ModelDataPage } from './components/ModelDataPage';
import { Footer } from './components/Footer';
import { AnalysisResult, DemoPreset } from './types';
import { loadImageElement } from './services/cvEngine';

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

function persistHistory(items: AnalysisResult[]): void {
  const write = (data: AnalysisResult[]) => {
    localStorage.setItem('freshsight_history', JSON.stringify(data));
  };

  try {
    write(items);
    return;
  } catch {}

  const withoutVisuals = items.map((item) => {
    const copy = { ...item };
    delete copy.cam;
    delete copy.msk;
    return copy;
  });

  try {
    write(withoutVisuals);
    return;
  } catch {}

  try {
    write(withoutVisuals.slice(0, 10));
  } catch {}
}

function getInitialHistory(): AnalysisResult[] {
  try {
    const saved = localStorage.getItem('freshsight_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (item: AnalysisResult) => !(item.id >= 101 && item.id <= 106)
        );
        persistHistory(cleaned);
        return cleaned;
      }
    }
  } catch {}

  return [];
}

export const App: React.FC = () => {
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>(getInitialHistory);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lenisRef = useRef<Lenis | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const showToast = useCallback((message: string, type: 'default' | 'success' | 'error' = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

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

  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const handleAnalysisComplete = useCallback(async (res: AnalysisResult) => {
    setCurrentResult(res);

    let thumbnail: string = res.thumb || '';
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
      persistHistory(updated);
      return updated;
    });
  }, []);

  const handleSelectHistoryDetail = (item: AnalysisResult) => {
    setCurrentResult(item);
    showToast(`Spesimen ${item.fruit} berhasil dipasang pada lensa diagnosis.`, 'default');
  };

  const handleDeleteHistoryItem = (id: number) => {
    setHistory((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      persistHistory(updated);
      return updated;
    });
    showToast('Spesimen dihapus dari arsip.');
  };

  const handleClearHistory = () => {
    if (window.confirm('Kosongkan seluruh arsip spesimen pada perangkat ini?')) {
      setHistory([]);
      persistHistory([]);
      showToast('Seluruh arsip spesimen berhasil dikosongkan.');
    }
  };

  return (
    <>
      <Navbar />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Hero
                onAnalysisComplete={handleAnalysisComplete}
                showToast={showToast}
                presets={DEMO_PRESETS}
                result={currentResult}
              />
            }
          />
          <Route
            path="/cara-kerja"
            element={<ResultsInspector result={currentResult} />}
          />
          <Route path="/model" element={<ModelDataPage />} />
          <Route
            path="/riwayat"
            element={
              <HistoryJournal
                history={history}
                onSelectDetail={handleSelectHistoryDetail}
                onDeleteItem={handleDeleteHistoryItem}
                onClearAll={handleClearHistory}
                onNavigate={(path) => navigate(path)}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

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

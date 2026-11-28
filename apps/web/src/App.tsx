import React, { useState, useEffect, useCallback } from 'react';
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

const TOAST_STYLE = {
  success: {
    box: 'bg-[var(--fs-surface)] text-black border-2 border-black shadow-[4px_4px_0_#000]',
    icon: <CheckCircle2 size={18} className="text-[#14532D]" />,
  },
  error: {
    box: 'bg-[#FEE2E2] text-[#7F1D1D] border-2 border-[#7F1D1D] shadow-[4px_4px_0_#7F1D1D]',
    icon: <AlertCircle size={18} className="text-[#991B1B]" />,
  },
  default: {
    box: 'bg-[var(--fs-surface)] text-black border-2 border-black shadow-[4px_4px_0_#000]',
    icon: <Info size={18} className="text-[#1E6B3E]" />,
  },
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
  const navigate = useNavigate();
  const location = useLocation();

  const showToast = useCallback(
    (message: string, type: 'default' | 'success' | 'error' = 'default') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      const durationMs = type === 'error' ? 8000 : 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    []
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const handleClearResult = useCallback(() => {
    setCurrentResult(null);
  }, []);

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
  };

  const handleDeleteHistoryItem = (id: number) => {
    setHistory((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      persistHistory(updated);
      return updated;
    });
    setCurrentResult((prev) => (prev && prev.id === id ? null : prev));
    showToast('Item dihapus dari riwayat.');
  };

  const handleUpdateHistoryItem = (updatedItem: AnalysisResult) => {
    setHistory((prev) => {
      const updated = prev.map((x) => (x.id === updatedItem.id ? updatedItem : x));
      persistHistory(updated);
      return updated;
    });
    setCurrentResult((prev) => (prev && prev.id === updatedItem.id ? updatedItem : prev));
    showToast('Umpan balik tersimpan di riwayat lokal.', 'success');
  };

  const handleClearHistory = () => {
    if (window.confirm('Hapus seluruh riwayat pemeriksaan pada perangkat ini?')) {
      setHistory([]);
      persistHistory([]);
      showToast('Seluruh riwayat berhasil dikosongkan.');
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
                onClearResult={handleClearResult}
                onUpdateResult={handleUpdateHistoryItem}
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
                onUpdateItem={handleUpdateHistoryItem}
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
        aria-live="polite"
        aria-label="Notifikasi aplikasi"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLE[toast.type];
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl text-xs font-semibold leading-snug ${style.box}`}
            >
              <span className="shrink-0 mt-0.5">{style.icon}</span>
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => setToasts((p) => p.filter((t) => t.id !== toast.id))}
                className="shrink-0 min-w-8 min-h-8 -m-1.5 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

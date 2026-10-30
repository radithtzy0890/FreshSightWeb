import React, { useState, useRef } from 'react';
import { Upload, Camera, Activity, Sparkles, Cpu } from 'lucide-react';
import { AnalysisResult, DemoPreset } from '../types';
import {
  FRUIT_NAMES,
  loadImageElement,
  analyzeImageLocally,
  fetchPredictionFromApi,
  calculateClassProbs,
  getTodayString,
} from '../services/cvEngine';

interface AnalysisStudioProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  showToast: (msg: string, type?: 'default' | 'success' | 'error') => void;
  presets: DemoPreset[];
}

export const AnalysisStudio: React.FC<AnalysisStudioProps> = ({
  onAnalysisComplete,
  showToast,
  presets,
}) => {
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number | null>(null);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [apiEndpoint, setApiEndpoint] = useState(() => {
    try {
      return localStorage.getItem('fs_api_endpoint') || '';
    } catch {
      return '';
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)/.test(file.type)) {
      showToast('Format berkas tidak didukung. Harap gunakan JPG atau PNG.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto melebihi 5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        url: reader.result as string,
      });
      showToast('Foto berhasil dimuat. Siap dianalisis.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleConnectApi = async () => {
    const url = apiEndpoint.trim().replace(/\/$/, '');
    if (!url) {
      setApiEndpoint('');
      try {
        localStorage.removeItem('fs_api_endpoint');
      } catch {}
      showToast('Kembali ke mode komputasi browser internal');
      return;
    }

    showToast('Memeriksa ketersediaan ML Service...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url + '/v1/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Status error');

      setApiEndpoint(url);
      try {
        localStorage.setItem('fs_api_endpoint', url);
      } catch {}
      showToast('Berhasil terhubung ke ML Service!', 'success');
    } catch {
      showToast('Gagal menghubungi endpoint. Periksa apakah server backend aktif.', 'error');
    }
  };

  const runPipeline = async (getResult: () => Promise<AnalysisResult>) => {
    setIsProcessing(true);

    // Stagger pipeline steps
    for (let i = 0; i < 4; i++) {
      setActivePipelineStep(i);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    try {
      const res = await getResult();
      setIsProcessing(false);
      setActivePipelineStep(null);
      onAnalysisComplete(res);
    } catch {
      setIsProcessing(false);
      setActivePipelineStep(null);
      showToast('Gagal menganalisis citra. Coba gunakan foto lain.', 'error');
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      showToast('Silakan pilih foto buah terlebih dahulu atau gunakan contoh preset.');
      return;
    }

    runPipeline(async () => {
      const imgElem = await loadImageElement(selectedFile.url);
      if (apiEndpoint) {
        try {
          return await fetchPredictionFromApi(apiEndpoint, imgElem, selectedFile);
        } catch {
          showToast('ML Service tidak merespons, beralih ke analisis browser.');
          const raw = analyzeImageLocally(imgElem);
          return {
            id: Date.now(),
            ...raw,
            img: selectedFile.url,
            src: 'browser',
            date: getTodayString(),
          };
        }
      } else {
        const raw = analyzeImageLocally(imgElem);
        return {
          id: Date.now(),
          ...raw,
          img: selectedFile.url,
          src: 'browser',
          date: getTodayString(),
        };
      }
    });
  };

  const handlePresetSample = (preset: DemoPreset) => {
    setSelectedFile(null);
    runPipeline(async () => {
      return {
        id: Date.now(),
        fruit: preset[0],
        rot: preset[1],
        conf: preset[2],
        n: preset[4],
        rasio: preset[3],
        loc: preset[5],
        jw: preset[6],
        tk: preset[7],
        p: calculateClassProbs(preset[0], preset[1], preset[2]),
        src: 'contoh',
        model: 'mobilenetv3_external',
        ms: 38,
        date: getTodayString(),
      };
    });
  };

  return (
    <section id="section-analisis" className="py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col mb-10">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">
            Studio Analisis
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Unggah Foto Buah Anda
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Mendukung klasifikasi buah Apel, Pisang, dan Jeruk menggunakan model deep learning.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dropzone & Upload Controls */}
          <div className="lg:col-span-7 flex flex-col">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => {
                if (!selectedFile) fileInputRef.current?.click();
              }}
              className={`surface-card p-8 sm:p-12 text-center flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer relative overflow-hidden ${
                isDragging
                  ? 'border-[var(--leaf-primary)] bg-[var(--leaf-soft)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--leaf-primary)]'
              } ${isProcessing ? 'is-scanning' : ''}`}
            >
              <div className="scanner-sweep" />

              {selectedFile ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-sm mb-3">
                    <img src={selectedFile.url} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-main)]">
                    {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-[11px] text-[var(--leaf-primary)] hover:underline mt-1 cursor-pointer"
                  >
                    Ketuk untuk mengganti foto
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="text-base font-semibold text-[var(--text-main)] mb-1">
                    Tarik dan jatuhkan foto buah di sini
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    atau klik untuk memilih berkas dari perangkat (JPG / PNG maks 5 MB)
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 my-5">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="px-5 py-2.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Gunakan Kamera</span>
              </button>
              <button
                onClick={handleStartAnalysis}
                disabled={isProcessing}
                className="btn-magnetic px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 flex items-center gap-2 transition-all shadow-md cursor-pointer ml-auto disabled:opacity-50"
              >
                <Activity className="w-4 h-4" />
                <span>{isProcessing ? 'Menganalisis...' : 'Mulai Analisis'}</span>
              </button>
            </div>

            {/* Pipeline Step Indicators */}
            <div className="grid grid-cols-4 gap-2 py-3 border-y border-[var(--border-subtle)] text-center text-xs font-medium">
              {['1. Auto-Crop', '2. Klasifikasi', '3. Grad-CAM', '4. Diagnostik'].map((step, idx) => {
                const isActive = activePipelineStep === idx;
                return (
                  <div
                    key={idx}
                    className={`py-1.5 px-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[var(--leaf-primary)] text-white shadow-xs font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>

            {/* Local storage save toggle */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="save-history-check-react"
                checked={saveToHistory}
                onChange={(e) => setSaveToHistory(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--leaf-primary)] focus:ring-0 cursor-pointer"
              >
              </input>
              <label htmlFor="save-history-check-react" className="text-xs text-[var(--text-muted)] cursor-pointer">
                Simpan hasil secara otomatis ke riwayat di peramban ini
              </label>
            </div>

            {/* Quick Preset Samples */}
            <div className="mt-8">
              <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">
                Belum punya foto? Coba sampel pengujian instan:
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSample(preset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--leaf-primary)] text-[var(--text-main)] transition-all cursor-pointer"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${preset[1] ? 'bg-[#C9421A]' : 'bg-[#1C6E3D]'}`} />
                    <span>
                      {FRUIT_NAMES[preset[0]]} {preset[1] ? 'Busuk' : 'Segar'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Photography Tips & Model Engine Endpoint */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="surface-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--citrus-accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">Panduan Foto Optimal</h3>
              </div>
              <ul className="text-xs text-[var(--text-muted)] flex flex-col gap-2 pl-4 list-disc">
                <li>Satu buah di tengah bingkai, usahakan memenuhi 60-80% area foto.</li>
                <li>Gunakan latar belakang polos (kertas putih, meja kayu bersih tanpa corak ramai).</li>
                <li>Hindari bayangan keras atau pantulan lampu yang menutupi tekstur kulit.</li>
                <li>Foto buah secara utuh (belum dipotong atau dikupas).</li>
              </ul>
            </div>

            <div className="surface-card p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[var(--leaf-primary)]" />
                  <h3 className="text-sm font-bold text-[var(--text-main)]">Mesin Komputasi Model</h3>
                </div>
              </div>

              <div className="text-xs text-[var(--text-muted)] mb-4 flex flex-col gap-1.5">
                {apiEndpoint ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1C6E3D] dark:bg-[#52D487]" /> Terhubung
                    </span>
                    <span>
                      Inferensi via server eksternal: <b>{apiEndpoint}</b>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3DB] text-[#EFA018] dark:bg-[#302611] dark:text-[#FBBF24]">
                      Mode Komputasi Browser
                    </span>
                    <span>Segmentasi warna & tekstur dijalankan langsung di browser Anda secara privat.</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)]"
                />
                <button
                  onClick={handleConnectApi}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-main)] transition-all cursor-pointer"
                >
                  Hubungkan
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] mt-2">
                Kosongkan URL untuk beralih kembali ke mode komputasi internal browser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


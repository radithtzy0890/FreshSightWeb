import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  X,
  AlertCircle,
  FlipHorizontal,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AnalysisResult, DemoPreset } from '../types';
import {
  createSampleResult,
  fetchPredictionFromApi,
  loadImageElement,
} from '../services/cvEngine';
import { sound } from '../services/soundEngine';
import { AnalysisResultCard } from './AnalysisResultCard';

const DEFAULT_LOCAL_API =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|freshsightweb\.test)$/i.test(window.location.hostname)
    ? 'http://127.0.0.1:8001'
    : '';
const API_BASE = (import.meta.env.VITE_PREDICT_API_URL || DEFAULT_LOCAL_API).replace(/\/$/, '');
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function imageToDataUrl(img: HTMLImageElement, maxDim: number, quality: number): string {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function toFriendlyError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Analisis dibatalkan.';
  }
  if (err instanceof TypeError) {
    return 'Layanan analisis sedang tidak dapat dihubungi. Periksa koneksi Anda atau coba lagi beberapa saat lagi.';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Gagal memproses foto buah. Silakan coba foto lain.';
}

async function analyzeFile(file: File, signal?: AbortSignal): Promise<AnalysisResult> {
  if (file.size === 0) {
    throw new Error('Berkas gambar kosong. Pilih foto lain.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran berkas melebihi batas maksimum 10 MB.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Format berkas tidak didukung. Gunakan foto JPG, PNG, atau WebP.');
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    const result = await fetchPredictionFromApi(
      API_BASE,
      img,
      { url, name: file.name },
      signal
    );
    const photo = imageToDataUrl(img, 900, 0.84);
    const thumb = imageToDataUrl(img, 320, 0.8);
    return { ...result, img: photo, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface HeroProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onClearResult: () => void;
  onUpdateResult?: (updated: AnalysisResult) => void;
  showToast: (msg: string, type?: 'default' | 'success' | 'error') => void;
  presets: DemoPreset[];
  result: AnalysisResult | null;
}

const SPECIMENS = [
  {
    name: 'Apel Segar',
    status: 'SEGAR',
    note: 'Contoh foto apel utuh dengan warna kulit merata.',
    image: '/fruit/apple_fresh.jpg',
    color: '#1E6B3E',
    presetIdx: 0,
  },
  {
    name: 'Apel Busuk',
    status: 'TIDAK SEGAR',
    note: 'Contoh foto apel dengan bercak cokelat permukaan.',
    image: '/fruit/apple_rotten.jpg',
    color: '#991B1B',
    presetIdx: 1,
  },
  {
    name: 'Pisang Segar',
    status: 'SEGAR',
    note: 'Contoh foto pisang matang merata tanpa bercak luas.',
    image: '/fruit/banana_fresh.jpg',
    color: '#1E6B3E',
    presetIdx: 2,
  },
  {
    name: 'Pisang Busuk',
    status: 'TIDAK SEGAR',
    note: 'Contoh foto pisang dengan bercak gelap meluas.',
    image: '/fruit/banana_rotten.jpg',
    color: '#7B3818',
    presetIdx: 3,
  },
  {
    name: 'Jeruk Segar',
    status: 'SEGAR',
    note: 'Contoh foto jeruk utuh dengan kulit bersih.',
    image: '/fruit/orange_fresh.jpg',
    color: '#0B6E6A',
    presetIdx: 4,
  },
  {
    name: 'Jeruk Busuk',
    status: 'TIDAK SEGAR',
    note: 'Contoh foto jeruk dengan bercak dan jamur permukaan.',
    image: '/fruit/orange_rotten.jpg',
    color: '#7F1D1D',
    presetIdx: 5,
  },
];

export const Hero: React.FC<HeroProps> = ({
  onAnalysisComplete,
  onClearResult,
  onUpdateResult,
  showToast,
  presets,
  result,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(result?.img || null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const specimen = SPECIMENS[currentIdx];

  useEffect(() => {
    if (result?.img) {
      setUploadedPhoto(result.img);
    } else if (result === null && !analyzing) {
      setUploadedPhoto(null);
      setShowHeatmap(false);
    }
  }, [result, analyzing]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      abortRef.current?.abort();
    };
  }, [stopCamera]);

  const handleResetAll = useCallback(() => {
    abortRef.current?.abort();
    setAnalyzing(false);
    setUploadedPhoto(null);
    setShowHeatmap(false);
    setAnalysisError(null);
    setLastFile(null);
    onClearResult();
  }, [onClearResult]);

  const notifyByVerdict = useCallback(
    (analysis: AnalysisResult) => {
      if (analysis.verdict === 'tidak_terdeteksi') {
        showToast('Objek apel, pisang, atau jeruk tidak terdeteksi pada foto.', 'error');
      } else if (analysis.verdict === 'ragu') {
        showToast('Hasil belum cukup pasti (status ragu). Pertimbangkan foto ulang.', 'default');
      } else {
        showToast('Foto buah selesai dianalisis.', 'success');
      }
    },
    [showToast]
  );

  const processFile = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setAnalysisError(null);
      setCameraError(null);
      setLastFile(file);
      onClearResult();
      setShowHeatmap(false);

      // Show immediate client preview while uploading/analyzing
      const tempPreview = URL.createObjectURL(file);
      setUploadedPhoto(tempPreview);
      setAnalyzing(true);

      try {
        const analysis = await analyzeFile(file, controller.signal);
        setUploadedPhoto(analysis.img || null);
        onAnalysisComplete(analysis);
        notifyByVerdict(analysis);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setUploadedPhoto(null);
          showToast('Analisis dibatalkan.', 'default');
        } else {
          const msg = toFriendlyError(err);
          setAnalysisError(msg);
          showToast(msg, 'error');
        }
      } finally {
        URL.revokeObjectURL(tempPreview);
        setAnalyzing(false);
      }
    },
    [onAnalysisComplete, onClearResult, notifyByVerdict, showToast]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || analyzing) return;
    sound.play('click');
    await processFile(file);
  };

  const handleRunSample = useCallback(async () => {
    if (analyzing) return;
    sound.play('click');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnalysisError(null);
    onClearResult();
    setUploadedPhoto(specimen.image);
    setShowHeatmap(false);
    setAnalyzing(true);

    try {
      const img = await loadImageElement(specimen.image);
      const apiRes = await fetchPredictionFromApi(
        API_BASE,
        img,
        { url: specimen.image, name: specimen.image.split('/').pop() || 'contoh.jpg' },
        controller.signal
      );
      const analysis: AnalysisResult = {
        ...apiRes,
        img: specimen.image,
        thumb: specimen.image,
      };
      onAnalysisComplete(analysis);
      notifyByVerdict(analysis);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setUploadedPhoto(null);
      } else {
        const fallback = createSampleResult(presets[specimen.presetIdx]);
        onAnalysisComplete(fallback);
        showToast('Server analisis offline — menampilkan pratinjau contoh (bukan inferensi langsung).', 'default');
      }
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, specimen, presets, onAnalysisComplete, onClearResult, notifyByVerdict, showToast]);

  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    if (analyzing) return;
    setCameraError(null);
    setAnalysisError(null);
    sound.play('click');
    const targetFacing = overrideFacing || facingMode;

    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg = 'Peramban tidak mendukung kamera langsung. Membuka kamera perangkat...';
      setCameraError(msg);
      nativeCameraInputRef.current?.click();
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: targetFacing }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (!stream) throw new Error('Tidak dapat mengakses kamera.');
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: unknown) {
      const error = err as Error;
      let msg = 'Kamera tidak dapat dibuka. Pastikan izin kamera aktif atau gunakan tombol Unggah Foto.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan peramban atau gunakan Unggah Foto.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak ditemukan pada perangkat ini. Gunakan tombol Unggah Foto.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
      }
      setCameraError(msg);
      setCameraActive(false);
      showToast(msg, 'error');
    }
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  const captureCamera = async () => {
    if (!videoRef.current || analyzing) return;
    sound.play('click');
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Match the 4:3 viewfinder aspect ratio so captured pixels match what the user framed
    const targetRatio = 4 / 3;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (vw / vh > targetRatio) {
      sw = Math.round(vh * targetRatio);
      sx = Math.round((vw - sw) / 2);
    } else {
      sh = Math.round(vw / targetRatio);
      sy = Math.round((vh - sh) / 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'foto_kamera.jpg', { type: 'image/jpeg' });
        stopCamera();
        await processFile(file);
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <section
      id="section-hero"
      className="pt-24 pb-16 min-h-[88vh] bg-[var(--fs-bg-hero)] flex items-center justify-center relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start lg:items-center">

          {/* Mobile-first Column 1: Primary Actions, Privacy, and Tips */}
          <div className="lg:col-span-3 flex flex-col items-stretch order-1 space-y-4">
            <div className="bg-[var(--fs-surface)] text-black border-2 border-black shadow-[4px_4px_0_#000] rounded-2xl p-4 space-y-3">
              <div className="space-y-1">
                <p className="font-mono-tech text-xs font-bold uppercase tracking-wider text-[var(--fs-green-primary)]">
                  Mulai Periksa
                </p>
                <p className="text-xs text-black/80 leading-relaxed">
                  Pilih foto <strong>apel, pisang, atau jeruk</strong> utuh untuk diperiksa kesegarannya.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih berkas foto buah dari perangkat"
                className="sr-only"
                onChange={handleFileChange}
              />
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Ambil foto buah menggunakan kamera perangkat"
                className="sr-only"
                onChange={handleFileChange}
              />

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={() => (cameraActive ? stopCamera() : startCamera())}
                  className="w-full min-h-12 py-2.5 px-4 rounded-xl bg-[var(--fs-accent)] border-2 border-black font-passata text-sm uppercase shadow-[3px_3px_0_#000] hover:bg-[var(--fs-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-bold text-black"
                >
                  <Camera size={18} strokeWidth={2.5} />
                  <span>{cameraActive ? 'Tutup Kamera' : 'Ambil Foto'}</span>
                </button>

                <button
                  type="button"
                  disabled={analyzing}
                  onClick={() => {
                    sound.play('click');
                    fileInputRef.current?.click();
                  }}
                  className="w-full min-h-12 py-2.5 px-4 rounded-xl bg-white border-2 border-black font-passata text-sm uppercase shadow-[3px_3px_0_#000] hover:bg-[#FFF8E7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-bold text-black"
                >
                  <Upload size={18} strokeWidth={2.5} />
                  <span>Unggah Foto</span>
                </button>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-black/15 text-xs text-black/75 leading-snug">
                <ShieldCheck size={16} className="shrink-0 text-[var(--fs-green-primary)] mt-0.5" />
                <span>
                  Foto dikirim ke server analisis (tidak disimpan permanen). Riwayat tersimpan lokal di perangkat Anda.
                </span>
              </div>
            </div>

            <div className="bg-[var(--fs-surface)] text-black border-2 border-black shadow-[3px_3px_0_#000] rounded-2xl p-4 text-left">
              <h2 className="font-passata text-xs font-bold uppercase tracking-wide text-black mb-2">
                Tips agar hasil akurat
              </h2>
              <ul className="space-y-1.5 text-xs text-black/85 leading-snug list-disc pl-4">
                <li>Satu buah utuh di tengah bingkai, tidak terlalu jauh</li>
                <li>Pencahayaan terang merata, hindari foto buram</li>
                <li>Latar polos tanpa piring bermotif atau tumpukan buah</li>
              </ul>
            </div>
          </div>

          {/* Column 2: Camera Viewfinder / Uploaded Photo Preview / Sample Card */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center order-2 space-y-3">
            <div
              className="relative w-full max-w-[360px] aspect-[4/3] rounded-3xl border-3 border-black shadow-[6px_6px_0_#000] overflow-hidden flex flex-col items-center justify-center"
              style={{ backgroundColor: cameraActive ? '#000000' : uploadedPhoto ? '#ECE7DC' : specimen.color }}
            >
              {cameraActive ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      (e.target as HTMLVideoElement).play().catch(() => {});
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-4 border-2 border-dashed border-[var(--fs-accent)]/85 rounded-2xl pointer-events-none" />

                  <button
                    type="button"
                    onClick={() => {
                      const next = facingMode === 'environment' ? 'user' : 'environment';
                      setFacingMode(next);
                      startCamera(next);
                    }}
                    className="absolute top-3 left-3 min-w-11 min-h-11 rounded-full bg-black/80 hover:bg-black text-[var(--fs-accent)] border-2 border-[var(--fs-accent)] cursor-pointer flex items-center justify-center"
                    aria-label="Ganti kamera depan atau belakang"
                  >
                    <FlipHorizontal size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="absolute top-3 right-3 min-w-11 min-h-11 rounded-full bg-black/80 hover:bg-black text-white border-2 border-white cursor-pointer flex items-center justify-center"
                    aria-label="Tutup kamera"
                  >
                    <X size={18} />
                  </button>

                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={captureCamera}
                    className="absolute bottom-3 min-h-11 px-5 py-2 rounded-xl bg-[var(--fs-accent)] text-black font-passata text-sm border-2 border-black shadow-[2px_2px_0_#000] uppercase font-bold hover:bg-[var(--fs-accent-hover)] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <Camera size={16} strokeWidth={2.5} />
                    <span>Jepret & Analisis</span>
                  </button>
                </div>
              ) : uploadedPhoto ? (
                <div className="relative w-full h-full flex items-center justify-center p-3">
                  <img
                    src={showHeatmap && result?.cam ? result.cam : uploadedPhoto}
                    alt={showHeatmap ? 'Peta fokus area pemeriksaan buah' : 'Pratinjau foto buah yang diperiksa'}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                  {!analyzing && (
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="absolute top-3 right-3 min-w-11 min-h-11 rounded-full bg-black/85 text-white border-2 border-white hover:bg-black cursor-pointer flex items-center justify-center shadow-md"
                      aria-label="Hapus foto dan bersihkan hasil"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-5 text-center space-y-3">
                  <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-black shadow-[4px_4px_0_#000] bg-white p-2 flex items-center justify-center">
                    <img
                      src={specimen.image}
                      alt={`Contoh ${specimen.name}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-white border-2 border-black font-passata text-xs text-black uppercase font-bold">
                      Contoh: {specimen.name}
                    </span>
                  </div>
                </div>
              )}

              {analyzing && (
                <div
                  role="status"
                  aria-live="assertive"
                  className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4 text-center z-20"
                >
                  <RefreshCw size={34} className="text-[var(--fs-accent)] animate-spin" />
                  <p className="font-passata text-sm text-[var(--fs-accent)] uppercase tracking-wider">
                    Memeriksa foto buah...
                  </p>
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="min-h-11 px-4 py-2 rounded-xl bg-white text-black border-2 border-black font-passata text-xs uppercase font-bold cursor-pointer hover:bg-[#FEE2E2]"
                  >
                    Batalkan
                  </button>
                </div>
              )}
            </div>

            {!cameraActive && !uploadedPhoto && (
              <button
                type="button"
                disabled={analyzing}
                onClick={handleRunSample}
                className="min-h-11 px-4 py-2 rounded-xl bg-white hover:bg-[var(--fs-surface)] border-2 border-black shadow-[2px_2px_0_#000] font-passata text-xs uppercase font-bold text-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={15} />
                <span>Uji Foto Contoh Ini</span>
              </button>
            )}

            {cameraError && (
              <div
                role="alert"
                className="w-full max-w-[360px] text-xs text-[#7F1D1D] bg-[#FEE2E2] border-2 border-[#7F1D1D] p-3 rounded-xl font-semibold flex items-start gap-2"
              >
                <AlertCircle size={18} className="shrink-0 text-[#991B1B] mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {analysisError && (
              <div
                role="alert"
                className="w-full max-w-[360px] text-xs text-[#7F1D1D] bg-[#FEE2E2] border-2 border-[#7F1D1D] p-3 rounded-xl font-semibold space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 text-[#991B1B] mt-0.5" />
                  <span>{analysisError}</span>
                </div>
                <div className="flex gap-2">
                  {lastFile && (
                    <button
                      type="button"
                      onClick={() => processFile(lastFile)}
                      className="min-h-10 px-3 py-1.5 rounded-lg bg-[#991B1B] text-white font-passata text-xs uppercase font-bold cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="min-h-10 px-3 py-1.5 rounded-lg bg-white text-black border border-black font-passata text-xs uppercase font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Analysis Result Card OR Clear Intro + Sample Carousel */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-5 order-3">
            {result ? (
              <AnalysisResultCard
                result={result}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
                onReset={handleResetAll}
                onUpdateItem={onUpdateResult}
              />
            ) : (
              <div className="space-y-4">
                <h1 className="font-passata text-4xl sm:text-5xl text-black uppercase tracking-tight font-bold leading-[1.02]">
                  Periksa Kesegaran Buah dari Foto
                </h1>
                <p className="text-sm sm:text-base text-black/85 font-medium leading-relaxed">
                  Ambil atau unggah foto satu buah <strong>apel, pisang, atau jeruk</strong> untuk mendapatkan status kesegaran, tingkat keyakinan model, dan area kulit yang menjadi perhatian.
                </p>
                <p className="text-xs text-black/80 bg-[var(--fs-surface)] border-2 border-black rounded-xl p-3 font-medium">
                  <strong>Contoh terpilih ({specimen.name}):</strong> {specimen.note}
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((prev) => (prev > 0 ? prev - 1 : SPECIMENS.length - 1))
                    }
                    className="btn-slider-square"
                    aria-label="Lihat contoh buah sebelumnya"
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                  </button>

                  <div className="slider-pill-track" aria-hidden="true">
                    <div
                      className="slider-pill-bar"
                      style={{ width: `${((currentIdx + 1) / SPECIMENS.length) * 100}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((prev) => (prev < SPECIMENS.length - 1 ? prev + 1 : 0))
                    }
                    className="btn-slider-square"
                    aria-label="Lihat contoh buah berikutnya"
                  >
                    <ArrowRight size={20} strokeWidth={2.5} />
                  </button>

                  <span className="font-mono-tech text-xs font-bold text-black/80">
                    {currentIdx + 1}/{SPECIMENS.length}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

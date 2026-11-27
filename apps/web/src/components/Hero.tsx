import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, ArrowLeft, ArrowRight, ChevronDown, RefreshCw, X, AlertCircle, FlipHorizontal, Flame, Lightbulb } from 'lucide-react';
import { AnalysisResult, DemoPreset } from '../types';
import {
  runAnalysis,
  fetchPredictionFromApi,
  loadImageElement,
  formatPercent,
  resolveVerdict,
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
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return img.src;
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function analyzeFile(file: File) {
  if (file.size === 0) {
    throw new Error('Berkas gambar kosong.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran berkas gambar melebihi batas maksimum 10 MB.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Berkas yang dipilih bukan format gambar yang didukung.');
  }

  const url = URL.createObjectURL(file);

  try {
    const img = await loadImageElement(url);
    try {
      const result = await fetchPredictionFromApi(API_BASE, img, {
        url,
        name: file.name,
      });
      const photo = imageToDataUrl(img, 900, 0.82);
      const thumb = imageToDataUrl(img, 320, 0.8);
      return { ...result, img: photo, thumb };
    } catch (apiErr) {
      if (API_BASE) {
        const msg =
          apiErr instanceof TypeError
            ? `Backend AI (${API_BASE}) tidak aktif. Jalankan uvicorn app:app --host 127.0.0.1 --port 8001 di folder backend.`
            : apiErr instanceof Error
            ? apiErr.message
            : 'Gagal menghubungi backend AI.';
        throw new Error(msg);
      }
      return runAnalysis(file, 'browser');
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface HeroProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onResetResult?: () => void;
  showToast: (msg: string, type?: 'default' | 'success' | 'error') => void;
  presets: DemoPreset[];
  result: AnalysisResult | null;
}

const SPECIMENS = [
  {
    name: 'APEL FUJI',
    variety: 'Malus Domestica',
    status: 'SEGAR',
    blurb1: 'Kutikula lilin homogen dengan turgor seluler prima tanpa retakan.',
    blurb2: 'Kandungan pektin mengikat cairan alami dengan sempurna.',
    emoji: '🍎',
    image: '/fruit/apple_fresh.jpg',
    color: '#1E6B3E',
    auraColor: 'rgba(30, 107, 62, 0.45)',
    presetIdx: 0,
  },
  {
    name: 'APEL NEKROSIS',
    variety: 'Lesi Oksidatif',
    status: 'BUSUK',
    blurb1: 'Polifenol oksidase aktif memicu pigmentasi melanin cokelat.',
    blurb2: 'Integritas jaringan melunak akibat koloni mikroba permukaan.',
    emoji: '🍎',
    image: '/fruit/apple_rotten.jpg',
    color: '#EB3322',
    auraColor: 'rgba(235, 51, 34, 0.45)',
    presetIdx: 1,
  },
  {
    name: 'PISANG CAVENDISH',
    variety: 'Musa Acuminata',
    status: 'SEGAR',
    blurb1: 'Pati alami bertransformasi sempurna menjadi sukrosa manis.',
    blurb2: 'Epidermis kuning keemasan tanpa jejak penetrasi spora.',
    emoji: '🍌',
    image: '/fruit/banana_fresh.jpg',
    color: '#6B38E8',
    auraColor: 'rgba(107, 56, 232, 0.45)',
    presetIdx: 2,
  },
  {
    name: 'PISANG MELANIN',
    variety: 'Senesens Lanjut',
    status: 'BUSUK',
    blurb1: 'Dinding sel parenkim kolaps dan melepaskan kelembapan berlebih.',
    blurb2: 'Bintik hitam meluas melampaui ambang batas kesegaran konsumsi.',
    emoji: '🍌',
    image: '/fruit/banana_rotten.jpg',
    color: '#7B3818',
    auraColor: 'rgba(123, 56, 24, 0.45)',
    presetIdx: 3,
  },
  {
    name: 'JERUK VALENCIA',
    variety: 'Citrus Sinensis',
    status: 'SEGAR',
    blurb1: 'Kantung minyak esensial flavedo rapat memancarkan aroma sitrus.',
    blurb2: 'Vakuola sel kaya vitamin C dalam perlindungan kutin kokoh.',
    emoji: '🍊',
    image: '/fruit/orange_fresh.jpg',
    color: '#0B6E6A',
    auraColor: 'rgba(11, 110, 106, 0.45)',
    presetIdx: 4,
  },
  {
    name: 'JERUK JAMUR',
    variety: 'Penicillium Koloni',
    status: 'BUSUK',
    blurb1: 'Hifa kapang hijau mengikis lapisan albedo pelindung bulir buah.',
    blurb2: 'Rasa dan aroma terdegradasi total oleh metabolisme fungal.',
    emoji: '🍊',
    image: '/fruit/orange_rotten.jpg',
    color: '#3E2A47',
    auraColor: 'rgba(62, 42, 71, 0.45)',
    presetIdx: 5,
  },
];

export const Hero: React.FC<HeroProps> = ({
  onAnalysisComplete,
  onResetResult,
  showToast,
  presets,
  result,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(result?.img || null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (result?.img) {
      setUploadedPhoto(result.img);
      setShowHeatmap(false);
    } else if (!result) {
      setUploadedPhoto(null);
      setShowHeatmap(false);
    }
  }, [result]);

  const capsuleRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!capsuleRef.current) return;
    const rect = capsuleRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const specimen = SPECIMENS[currentIdx];

  const activeVerdict = result && uploadedPhoto ? resolveVerdict(result) : null;
  const capsuleColor =
    activeVerdict === 'segar'
      ? '#1E6B3E'
      : activeVerdict === 'busuk'
      ? '#C92A2A'
      : activeVerdict === 'ragu'
      ? '#B45309'
      : activeVerdict === 'tidak_terdeteksi'
      ? '#262626'
      : specimen.color;

  const auraColor =
    activeVerdict === 'segar'
      ? 'rgba(30, 107, 62, 0.45)'
      : activeVerdict === 'busuk'
      ? 'rgba(201, 42, 42, 0.42)'
      : activeVerdict === 'ragu'
      ? 'rgba(180, 83, 9, 0.42)'
      : activeVerdict === 'tidak_terdeteksi'
      ? 'rgba(38, 38, 38, 0.35)'
      : specimen.auraColor;

  const handleClearUpload = () => {
    sound.play('click');
    setUploadedPhoto(null);
    setShowHeatmap(false);
    onResetResult?.();
  };

  const handlePrev = () => {
    sound.play('hover');
    setCurrentIdx((prev) => (prev > 0 ? prev - 1 : SPECIMENS.length - 1));
  };

  const handleNext = () => {
    sound.play('hover');
    setCurrentIdx((prev) => (prev < SPECIMENS.length - 1 ? prev + 1 : 0));
  };

  const handleTriggerAnalysis = useCallback(async () => {
    sound.play('click');
    setAnalyzing(true);
    try {
      const preset = presets[specimen.presetIdx];
      let analysis: AnalysisResult;
      try {
        const img = await loadImageElement(specimen.image);
        const apiRes = await fetchPredictionFromApi(API_BASE, img, {
          url: specimen.image,
          name: specimen.image.split('/').pop() || 'demo.jpg',
        });
        analysis = {
          ...apiRes,
          img: specimen.image,
          thumb: specimen.image,
        };
      } catch {
        analysis = await runAnalysis(null, 'contoh', preset);
      }
      setUploadedPhoto(analysis.img || null);
      setShowHeatmap(false);
      onAnalysisComplete(analysis);
      showToast(`Spesimen ${specimen.name} berhasil dianalisis.`, 'success');
    } catch {
      showToast('Gagal memproses spesimen.', 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [specimen, presets, onAnalysisComplete, showToast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sound.play('click');
    setAnalyzing(true);
    try {
      const analysis = await analyzeFile(file);
      setUploadedPhoto(analysis.img || null);
      setShowHeatmap(false);
      onAnalysisComplete(analysis);
      if (analysis.verdict === 'tidak_terdeteksi') {
        showToast('Objek buah tidak terdeteksi pada foto.', 'error');
      } else {
        showToast('Foto buah berhasil dianalisis.', 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses foto buah.';
      showToast(msg, 'error');
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  };

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

  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    sound.play('click');
    const targetFacing = overrideFacing || facingMode;

    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg = 'Peramban tidak mendukung live stream WebRTC langsung. Silakan gunakan tombol "Kamera HP / Perangkat".';
      setCameraError(msg);
      showToast(msg, 'error');
      nativeCameraInputRef.current?.click();
      return;
    }

    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream | null = null;
      // Cascade 1: Requested facing mode + ideal resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Cascade 2: Facing mode without resolution constraint
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
        } catch {
          // Cascade 3: Bare minimum video constraint (generic webcam/camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Tidak dapat menemukan perangkat stream video');
      }

      streamRef.current = stream;
      setCameraActive(true);
      showToast('Kamera aktif! Arahkan ke buah dan klik Ambil Foto.', 'success');
    } catch (err: unknown) {
      const error = err as Error;
      let msg = 'Kamera tidak terdeteksi atau izin belum diberikan.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Berikan izin di ikon gembok bilah peramban atau gunakan tombol "Kamera HP".';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        msg = 'Tidak ada perangkat kamera yang terpasang. Gunakan opsi unggah foto.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        msg = 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut dan coba lagi.';
      }
      setCameraError(msg);
      setCameraActive(false);
      showToast(msg, 'error');
    }
  };

  const handleToggleFacing = () => {
    sound.play('click');
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  const captureCamera = async () => {
    if (!videoRef.current) return;
    sound.play('click');
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'spesimen_kamera.jpg', { type: 'image/jpeg' });
      stopCamera();
      setAnalyzing(true);
      try {
        const analysis = await analyzeFile(file);
        setUploadedPhoto(analysis.img || null);
        setShowHeatmap(false);
        onAnalysisComplete(analysis);
        showToast('Hasil foto kamera berhasil dianalisis dengan akurat.', 'success');
      } catch {
        showToast('Gagal memproses foto kamera.', 'error');
      } finally {
        setAnalyzing(false);
      }
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <section id="section-hero" className="pt-28 pb-16 min-h-[92vh] w-full bg-[#FFC737] flex items-center justify-center relative overflow-x-clip overflow-y-hidden">

      {/* Floating Sparkles (Planet Oño Authentic Interactive Twinkle) */}
      <div className="absolute top-28 left-[22%] text-2xl select-none pointer-events-none animate-ono-twinkle text-white drop-shadow-[0_2px_2px_#000]">✦</div>
      <div className="hidden sm:block absolute bottom-24 left-12 lg:left-16 text-3xl select-none pointer-events-none animate-ono-twinkle-delay-1 text-black">✦</div>
      <div className="hidden sm:block absolute bottom-20 right-[10%] text-2xl select-none pointer-events-none animate-ono-twinkle-delay-2 text-white drop-shadow-[0_2px_2px_#000]">✦</div>
      <div className="absolute top-28 right-12 lg:right-16 text-xl select-none pointer-events-none animate-ono-twinkle text-black">✦</div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Comic Explosion Sticker Badge & Input Triggers */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start order-2 lg:order-1">
            <div
              className="relative group cursor-pointer select-none mt-4 sm:mt-2"
              onClick={handleTriggerAnalysis}
              title="Klik stiker untuk analisis instan spesimen"
            >
              {/* Rotating Circular Text Stamp (In front at top-right corner) */}
              <div className="absolute -top-10 -right-11 sm:-top-11 sm:-right-13 w-24 h-24 sm:w-28 sm:h-28 z-20 pointer-events-none">
                <div className="w-full h-full relative flex items-center justify-center animate-ono-spin-slow">
                  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <path
                      id="badgeCirclePath"
                      d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                      fill="none"
                    />
                    <text className="font-passata text-[9.5px] fill-black uppercase tracking-[0.24em]">
                      <textPath href="#badgeCirclePath" startOffset="0%">
                        ✦ FRESH BITE ✦ 新鮮な果物 ✦ 100% ALAMI ✦
                      </textPath>
                    </text>
                  </svg>
                  {/* Center glowing badge star */}
                  <div className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#8DF947] border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000]">
                    <span className="text-black text-xs font-bold animate-ono-twinkle">✦</span>
                  </div>
                </div>
              </div>

              {/* Main Comic Sticker Card with floating wobble */}
              <div className="sticker-blast relative z-10 overflow-hidden">
                <p className="font-mono-tech text-xs text-black font-bold tracking-wider uppercase mb-1">
                  新鮮な果物
                </p>
                <h2 className="font-passata text-4xl sm:text-5xl text-[#EB3322] leading-none uppercase">
                  FRESH<br />BITE
                </h2>
                <div className="mt-2 text-xl text-black inline-block animate-ono-spin-fast">✦</div>
              </div>
            </div>

            {/* Action Buttons: Live Camera, Native Phone Camera, and Upload */}
            <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[260px] lg:max-w-[225px]">
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
              />

              {/* 1. Ambil Foto (Camera) */}
              <button
                onClick={() => (cameraActive ? stopCamera() : startCamera())}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2.5 px-3 rounded-xl bg-[#8DF947] border-2 border-black font-passata text-sm uppercase shadow-[2px_2px_0_#000000] hover:bg-[#A3FF6B] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-bold"
              >
                <Camera size={16} strokeWidth={2.5} />
                <span>{cameraActive ? 'Tutup Kamera' : 'Ambil Foto'}</span>
              </button>

              {/* 2. Unggah File */}
              <button
                onClick={() => {
                  sound.play('click');
                  fileInputRef.current?.click();
                }}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2.5 px-3 rounded-xl bg-white border-2 border-black font-passata text-sm uppercase shadow-[2px_2px_0_#000000] hover:bg-[#FFF8E7] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-bold text-black"
              >
                <Upload size={16} strokeWidth={2.5} />
                <span>Unggah File</span>
              </button>
            </div>

            {/* Tips Foto yang Pas Card */}
            <div className="mt-5 w-full max-w-[260px] lg:max-w-[225px] bg-[#F7F2E5] text-black border-2 border-black shadow-[3px_3px_0_#000000] rounded-2xl p-3 text-left">
              <div className="flex items-center gap-1.5 mb-1.5 font-passata text-xs uppercase tracking-wider text-black">
                <Lightbulb size={14} strokeWidth={2.5} className="text-[#1E6B3E] shrink-0" />
                <span>Tips foto yang pas</span>
              </div>
              <ul className="space-y-1 text-[11px] text-black/85 font-medium leading-snug">
                <li className="flex items-start gap-1">
                  <span className="text-[#1E6B3E] font-bold">•</span>
                  <span>Satu buah di tengah, dekatkan sampai memenuhi bingkai</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-[#1E6B3E] font-bold">•</span>
                  <span>Latar polos, tanpa piring atau motif</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-[#1E6B3E] font-bold">•</span>
                  <span>Cahaya cukup, hindari bayangan keras</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-[#1E6B3E] font-bold">•</span>
                  <span>Tumpukan buah belum didukung: satu buah per foto</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Center Column: Upright Oval Capsule & Interactive 3D Specimen Pedestal */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2 relative py-4 sm:py-6">

            {/* Shifting Ambient Color Aura (Planet Oño Morphing Palette) */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[460px] h-[340px] sm:h-[460px] rounded-full blur-3xl pointer-events-none transition-all duration-700 ease-out z-0 animate-aura-float"
              style={{
                background: `radial-gradient(circle, ${auraColor} 0%, rgba(255,199,55,0) 70%)`,
              }}
            />

            {/* Floating Orbit Accents */}
            <div className="absolute -top-1 left-2 sm:-left-4 px-3 py-1 rounded-full bg-white border-2 border-black font-passata text-[10px] uppercase font-bold shadow-[2px_2px_0_#000] pointer-events-none animate-orbit-float z-20 hidden sm:flex items-center gap-1 select-none">
              <span>✦</span>
              <span>SCAN BUAH</span>
            </div>
            <div className="absolute -bottom-2 right-2 sm:-right-4 px-3 py-1 rounded-full bg-[#8DF947] border-2 border-black font-passata text-[10px] uppercase font-bold text-black shadow-[2px_2px_0_#000] pointer-events-none animate-orbit-float z-20 hidden sm:flex items-center gap-1 select-none">
              <span>100% ALAMI</span>
              <span>✦</span>
            </div>

            <div
              ref={capsuleRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={`relative border-3 border-black shadow-[8px_8px_0_#000000] flex flex-col items-center justify-center p-4 sm:p-5 text-center cursor-pointer overflow-hidden group z-10 transition-all duration-500 ease-out ${
                uploadedPhoto || cameraActive
                  ? 'w-[300px] sm:w-[360px] h-[330px] sm:h-[370px] rounded-[135px]'
                  : 'w-[280px] sm:w-[320px] h-[380px] sm:h-[420px] rounded-[160px] p-5 sm:p-6'
              }`}
              style={{
                backgroundColor: capsuleColor,
                transform: `perspective(900px) rotateY(${mouseOffset.x * 12}deg) rotateX(${-mouseOffset.y * 12}deg)`,
                transition:
                  mouseOffset.x === 0
                    ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.7s ease-out, width 0.45s ease-out, height 0.45s ease-out, border-radius 0.45s ease-out'
                    : 'background-color 0.7s ease-out',
              }}
              onClick={() => {
                if (!cameraActive && !uploadedPhoto) {
                  handleTriggerAnalysis();
                }
              }}
            >
              {/* Camera Stream Overlay */}
              {cameraActive ? (
                <div
                  className="relative w-full h-full rounded-[136px] overflow-hidden border-3 border-black bg-black flex flex-col items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
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

                  {/* Viewfinder Target Reticle with AI Laser Sweep */}
                  <div className="absolute inset-6 sm:inset-7 border-2 border-dashed border-[#8DF947]/80 rounded-[96px] pointer-events-none flex flex-col items-center justify-between p-4 overflow-hidden">
                    {/* Top Markers */}
                    <div className="w-full flex justify-between text-[#8DF947] text-[11px] font-mono font-bold select-none pt-4">
                      <span>[ ✦ ]</span>
                      <span>[ ✦ ]</span>
                    </div>

                    {/* Sweeping Laser Beam */}
                    <div className="absolute top-0 left-3 right-3 h-0.5 bg-[#8DF947] shadow-[0_0_10px_#8DF947,0_0_18px_#8DF947] animate-laser-sweep pointer-events-none" />

                    <span className="font-mono-tech text-[10px] text-[#8DF947] tracking-widest uppercase bg-black/75 px-2.5 py-1 rounded-full border border-[#8DF947]/50 shadow-sm backdrop-blur-sm select-none">
                      KAMERA AKTIF
                    </span>

                    {/* Bottom Markers */}
                    <div className="w-full flex justify-between text-[#8DF947] text-[11px] font-mono font-bold select-none pb-8">
                      <span>[ ✦ ]</span>
                      <span>[ ✦ ]</span>
                    </div>
                  </div>

                  {/* Camera Top Controls (Centered inside safe oval apex) */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFacing();
                      }}
                      className="p-2 rounded-full bg-black/80 hover:bg-black text-[#8DF947] border border-[#8DF947] cursor-pointer flex items-center gap-1 shadow-md"
                      title="Ganti Kamera Depan/Belakang"
                      aria-label="Ganti kamera depan atau belakang"
                    >
                      <FlipHorizontal size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopCamera();
                      }}
                      className="p-2 rounded-full bg-black/80 hover:bg-[#EB3322] text-white border border-white cursor-pointer shadow-md transition-colors"
                      title="Tutup Kamera"
                      aria-label="Tutup kamera"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Capture Button */}
                  <button
                    type="button"
                    onClick={captureCamera}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-[#8DF947] text-black font-passata text-sm border-2 border-black shadow-[2px_2px_0_#000000] uppercase font-bold hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5 z-20 whitespace-nowrap"
                  >
                    <Camera size={15} strokeWidth={2.5} />
                    <span>Ambil Foto</span>
                  </button>
                </div>
              ) : uploadedPhoto ? (
                <div
                  className="relative w-full h-full rounded-[118px] overflow-hidden border-3 border-black bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (result?.cam && activeVerdict !== 'tidak_terdeteksi') {
                      sound.play('click');
                      setShowHeatmap((prev) => !prev);
                    }
                  }}
                >
                  <img
                    src={showHeatmap && result?.cam ? result.cam : uploadedPhoto}
                    alt="Spesimen terunggah"
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-[118px] shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]" />

                  {activeVerdict && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black font-passata text-[11px] uppercase font-bold shadow-[2px_2px_0_#000000] whitespace-nowrap ${
                          activeVerdict === 'segar'
                            ? 'bg-[#8DF947] text-black'
                            : activeVerdict === 'busuk'
                            ? 'bg-[#EB3322] text-white'
                            : activeVerdict === 'tidak_terdeteksi'
                            ? 'bg-neutral-800 text-white'
                            : 'bg-[#FFC737] text-black'
                        }`}
                      >
                        {showHeatmap && result?.cam
                          ? 'GRAD-CAM'
                          : activeVerdict === 'segar'
                          ? `SEGAR • ${formatPercent(result?.conf ?? 0)}`
                          : activeVerdict === 'busuk'
                          ? `BUSUK • ${formatPercent(result?.conf ?? 0)}`
                          : activeVerdict === 'tidak_terdeteksi'
                          ? 'BUKAN TARGET'
                          : `RAGU • ${formatPercent(result?.conf ?? 0)}`}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                    {result?.cam && activeVerdict !== 'tidak_terdeteksi' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.play('click');
                          setShowHeatmap((prev) => !prev);
                        }}
                        className={`px-3 py-1.5 rounded-full border-2 border-black font-passata text-[11px] uppercase font-bold shadow-[2px_2px_0_#000000] cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${
                          showHeatmap ? 'bg-[#FFC737] text-black' : 'bg-white text-black hover:bg-[#FFF8E7]'
                        }`}
                        title="Lihat atau sembunyikan peta atensi Grad-CAM"
                      >
                        <Flame size={12} strokeWidth={2.5} />
                        <span>{showHeatmap ? 'Asli' : 'Grad-CAM'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearUpload();
                      }}
                      className="p-1.5 rounded-full bg-black/85 text-white border-2 border-white/80 hover:bg-[#EB3322] hover:border-black cursor-pointer shadow-[2px_2px_0_#000000] transition-colors"
                      aria-label="Hapus foto dan kembali ke spesimen"
                      title="Ganti foto"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ) : (
                /* The Floating Specimen Plate (Photorealistic Fruit Display with Planet Oño 3D Bob & Breathe) */
                <div
                  key={`${specimen.name}-${specimen.status}`}
                  className="relative z-10 flex flex-col items-center justify-center animate-fruit-float-breathe animate-specimen-pop"
                  style={{
                    transform: `translate3d(${mouseOffset.x * 24}px, ${mouseOffset.y * 24}px, 0)`,
                    transition: mouseOffset.x === 0 ? 'transform 0.4s ease-out' : 'none',
                  }}
                >
                  {/* Floating White Pedestal Disc with 3D Shadow */}
                  <div className="relative">
                    <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-3 border-black shadow-[4px_4px_0_#000000] bg-white p-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <img
                        src={specimen.image}
                        alt={specimen.name}
                        className="w-full h-full object-contain select-none transform transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    {/* Dynamic Drop Shadow below the fruit plate that squashes & stretches */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 sm:w-32 h-3 bg-black/35 rounded-full blur-[2px] pointer-events-none animate-shadow-breathe" />
                  </div>

                  <div className="mt-4 px-4 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0_#000000] font-passata text-sm text-black uppercase font-bold tracking-wider select-none hover:scale-105 transition-transform">
                    {specimen.status === 'SEGAR' ? 'SEGAR' : 'BUSUK'} • {specimen.name}
                  </div>

                  <p className="font-mono-tech text-[10px] text-white/90 mt-1 uppercase tracking-wider font-semibold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {specimen.variety}
                  </p>
                </div>
              )}

              {/* Down Arrow Indicator at Capsule Bottom (only on demo specimen pedestal) */}
              {!cameraActive && !uploadedPhoto && (
                <div className="absolute bottom-3 text-white text-xl animate-bounce pointer-events-none">
                  <ChevronDown size={22} strokeWidth={3} />
                </div>
              )}

              {/* Analysis Loading Screen */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30">
                  <RefreshCw size={36} className="text-[#8DF947] animate-spin" />
                  <p className="font-passata text-base text-[#8DF947] uppercase tracking-wider">
                    MEMERIKSA BUAH...
                  </p>
                </div>
              )}
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="mt-3 text-xs text-red-800 bg-red-100 border border-red-400 p-2 rounded-lg font-bold flex items-center gap-1.5 max-w-[320px]">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Result Card or Massive Headline */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6 order-3">

            {result ? (
              <AnalysisResultCard
                result={result}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
                onReset={handleClearUpload}
              />
            ) : (
              <>
                {/* Massive Display Headline: Refers specifically to fruit freshness & quality */}
            <h1 className="font-passata hero-display-title text-black text-shadow-3d-black uppercase font-bold break-words">
              KESEGARAN<br />
              BUAH ALAMI.<br />
              TERUJI HINGGA<br />
              SERAT TERDALAM
            </h1>

            {/* Curated Short Copy (Clean 2-line blurbs) */}
            <div
              key={currentIdx}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-black font-semibold leading-relaxed animate-specimen-pop"
            >
              <p>{specimen.blurb1}</p>
              <p>{specimen.blurb2}</p>
            </div>

            {/* Slider Navigation Bar: [ ← ] ━━━● [ → ] */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handlePrev}
                className="btn-slider-square cursor-pointer"
                aria-label="Previous specimen"
              >
                <ArrowLeft size={22} strokeWidth={3} />
              </button>

              <div className="slider-pill-track">
                <div
                  className="slider-pill-bar"
                  style={{
                    width: `${((currentIdx + 1) / SPECIMENS.length) * 100}%`,
                  }}
                />
              </div>

              <button
                onClick={handleNext}
                className="btn-slider-square cursor-pointer"
                aria-label="Next specimen"
              >
                <ArrowRight size={22} strokeWidth={3} />
              </button>
            </div>
              </>
            )}

          </div>

        </div>
      </div>

    </section>
  );
};

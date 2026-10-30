import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, ArrowLeft, ArrowRight, ChevronDown, RefreshCw, X, AlertCircle } from 'lucide-react';
import { AnalysisResult, DemoPreset } from '../types';
import { runAnalysis } from '../services/cvEngine';
import { sound } from '../services/soundEngine';

interface HeroProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  showToast: (msg: string, type?: 'default' | 'success' | 'error') => void;
  presets: DemoPreset[];
}

const SPECIMENS = [
  {
    name: 'APEL FUJI',
    variety: 'Malus Domestica',
    status: 'SEGAR',
    blurb1: 'Kutikula lilin homogen dengan turgor seluler prima tanpa retakan.',
    blurb2: 'Kandungan pektin mengikat cairan alami dengan sempurna.',
    emoji: '🍎',
    color: '#1E6B3E',
    presetIdx: 0,
  },
  {
    name: 'APEL NEKROSIS',
    variety: 'Lesi Oksidatif',
    status: 'BUSUK',
    blurb1: 'Polifenol oksidase aktif memicu pigmentasi melanin cokelat.',
    blurb2: 'Integritas jaringan melunak akibat koloni mikroba permukaan.',
    emoji: '🍎',
    color: '#EB3322',
    presetIdx: 1,
  },
  {
    name: 'PISANG CAVENDISH',
    variety: 'Musa Acuminata',
    status: 'SEGAR',
    blurb1: 'Pati alami bertransformasi sempurna menjadi sukrosa manis.',
    blurb2: 'Epidermis kuning keemasan tanpa jejak penetrasi spora.',
    emoji: '🍌',
    color: '#1E6B3E',
    presetIdx: 2,
  },
  {
    name: 'PISANG MELANIN',
    variety: 'Senesens Lanjut',
    status: 'BUSUK',
    blurb1: 'Dinding sel parenkim kolaps dan melepaskan kelembapan berlebih.',
    blurb2: 'Bintik hitam meluas melampaui ambang batas kesegaran konsumsi.',
    emoji: '🍌',
    color: '#EB3322',
    presetIdx: 3,
  },
  {
    name: 'JERUK VALENCIA',
    variety: 'Citrus Sinensis',
    status: 'SEGAR',
    blurb1: 'Kantung minyak esensial flavedo rapat memancarkan aroma sitrus.',
    blurb2: 'Vakuola sel kaya vitamin C dalam perlindungan kutin kokoh.',
    emoji: '🍊',
    color: '#1E6B3E',
    presetIdx: 4,
  },
  {
    name: 'JERUK JAMUR',
    variety: 'Penicillium Koloni',
    status: 'BUSUK',
    blurb1: 'Hifa kapang hijau mengikis lapisan albedo pelindung bulir buah.',
    blurb2: 'Rasa dan aroma terdegradasi total oleh metabolisme fungal.',
    emoji: '🍊',
    color: '#EB3322',
    presetIdx: 5,
  },
];

export const Hero: React.FC<HeroProps> = ({
  onAnalysisComplete,
  showToast,
  presets,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const specimen = SPECIMENS[currentIdx];

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
      const result = await runAnalysis(null, 'contoh', preset);
      onAnalysisComplete(result);
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
      const result = await runAnalysis(file, 'browser');
      setUploadedPhoto(result.img || null);
      onAnalysisComplete(result);
      showToast('Foto Anda berhasil dianalisis.', 'success');
    } catch {
      showToast('Gagal memproses foto.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    sound.play('click');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Peramban ini tidak mendukung akses kamera langsung.';
      setCameraError(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Coba kamera belakang (environment) untuk HP
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback untuk laptop / webcam umum
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      showToast('Kamera aktif! Arahkan ke buah dan klik Ambil Foto.', 'success');
    } catch (err: unknown) {
      const error = err as Error;
      let msg = 'Kamera tidak terdeteksi atau izin belum diberikan.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di ikon gembok peramban.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        msg = 'Tidak ada perangkat kamera / webcam yang terhubung.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain.';
      }
      setCameraError(msg);
      setCameraActive(false);
      showToast(msg, 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
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
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
      stopCamera();
      setAnalyzing(true);
      try {
        const result = await runAnalysis(file, 'browser');
        setUploadedPhoto(result.img || null);
        onAnalysisComplete(result);
        showToast('Hasil foto kamera berhasil dianalisis.', 'success');
      } catch {
        showToast('Gagal memproses kamera.', 'error');
      } finally {
        setAnalyzing(false);
      }
    }, 'image/jpeg', 0.85);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <section id="section-hero" className="pt-28 pb-16 min-h-[92vh] bg-[#FFC737] flex items-center justify-center relative overflow-hidden">

      {/* Floating Sparkles (Image 1 Details) */}
      <div className="absolute top-36 left-1/4 text-2xl select-none pointer-events-none animate-pulse">✦</div>
      <div className="absolute bottom-24 left-16 text-3xl select-none pointer-events-none">✦</div>
      <div className="absolute top-44 right-1/3 text-2xl select-none pointer-events-none">✦</div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Comic Explosion Sticker Badge (Matching Image 1) */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start order-2 lg:order-1">
            <div className="sticker-blast cursor-pointer" onClick={handleTriggerAnalysis}>
              <p className="font-mono-tech text-xs text-black font-bold tracking-wider uppercase mb-1">
                新鮮な果物
              </p>
              <h2 className="font-passata text-4xl sm:text-5xl text-[#EB3322] leading-none uppercase">
                FRESH<br />BITE
              </h2>
              <div className="mt-2 text-xl text-black">✦</div>
            </div>

            {/* Quick Upload / Camera Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[200px]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />
              <button
                onClick={() => {
                  sound.play('click');
                  fileInputRef.current?.click();
                }}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2 px-3 rounded-xl bg-white border-2 border-black font-passata text-sm uppercase shadow-[2px_2px_0_#000000] hover:bg-[#F7F2E5] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload size={14} strokeWidth={2.5} />
                <span>Unggah Foto</span>
              </button>

              <button
                onClick={() => (cameraActive ? stopCamera() : startCamera())}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2 px-3 rounded-xl bg-[#8DF947] border-2 border-black font-passata text-sm uppercase shadow-[2px_2px_0_#000000] hover:bg-[#A3FF6B] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera size={14} strokeWidth={2.5} />
                <span>{cameraActive ? 'Tutup Kamera' : 'Buka Kamera'}</span>
              </button>
            </div>
          </div>

          {/* Center Column: Upright Oval Capsule & Interactive 3D Specimen Pedestal (Matching Image 1) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2">
            <div
              className="relative w-[280px] sm:w-[320px] h-[380px] sm:h-[420px] rounded-[160px] border-3 border-black shadow-[8px_8px_0_#000000] flex flex-col items-center justify-center p-6 text-center cursor-pointer overflow-hidden transition-all group"
              style={{ backgroundColor: specimen.color }}
              onClick={handleTriggerAnalysis}
            >
              {/* Camera Stream Overlay */}
              {cameraActive ? (
                <div className="relative w-full h-full rounded-[130px] overflow-hidden border-2 border-black bg-black flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopCamera();
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/80 hover:bg-black text-white border border-white cursor-pointer z-20"
                    title="Tutup Kamera"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={captureCamera}
                    className="absolute bottom-4 px-5 py-2.5 rounded-xl bg-[#8DF947] text-black font-passata text-sm border-2 border-black shadow-[2px_2px_0_#000000] uppercase font-bold hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5 z-20"
                  >
                    <Camera size={15} strokeWidth={2.5} />
                    <span>Ambil Foto</span>
                  </button>
                </div>
              ) : uploadedPhoto ? (
                <div className="relative w-full h-full rounded-[130px] overflow-hidden border-2 border-black">
                  <img src={uploadedPhoto} alt="Uploaded fruit" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedPhoto(null);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/80 text-white border border-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* The Floating Specimen Plate */
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="text-8xl sm:text-9xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                    {specimen.emoji}
                  </div>

                  <div className="mt-4 px-4 py-1 rounded-full bg-white border-2 border-black shadow-[2px_2px_0_#000000] font-passata text-sm text-black uppercase font-bold tracking-wider">
                    {specimen.status === 'SEGAR' ? 'SEGAR' : 'BUSUK'} • {specimen.name}
                  </div>

                  <p className="font-mono-tech text-[10px] text-white/90 mt-1 uppercase tracking-wider font-semibold">
                    {specimen.variety}
                  </p>
                </div>
              )}

              {/* Down Arrow Indicator at Capsule Bottom */}
              <div className="absolute bottom-3 text-white text-xl animate-bounce pointer-events-none">
                <ChevronDown size={22} strokeWidth={3} />
              </div>

              {/* Analysis Loading Screen */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30">
                  <RefreshCw size={36} className="text-[#8DF947] animate-spin" />
                  <p className="font-passata text-base text-[#8DF947] uppercase tracking-wider">
                    MEMINDAI FOTON...
                  </p>
                </div>
              )}
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="mt-2 text-xs text-red-700 font-bold flex items-center gap-1">
                <AlertCircle size={14} />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Massive Headline & Curated Story Copy & Slider Controls (Matching Image 1) */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6 order-3">

            {/* Massive Display Headline */}
            <h1 className="font-passata text-5xl sm:text-6xl lg:text-[4.25rem] text-black text-shadow-3d-black uppercase tracking-tight font-bold leading-[0.95]">
              LEBIH DARI<br />
              SEKADAR SEGAR.<br />
              JUJUR HINGGA<br />
              SERAT TERDALAM
            </h1>

            {/* Curated Short Copy (Clean 2-line blurbs, zero fluff) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-black font-semibold leading-relaxed">
              <p>{specimen.blurb1}</p>
              <p>{specimen.blurb2}</p>
            </div>

            {/* Slider Navigation Bar: [ ← ] ━━━● [ → ] (Matching Image 1) */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handlePrev}
                className="btn-slider-square"
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
                className="btn-slider-square"
                aria-label="Next specimen"
              >
                <ArrowRight size={22} strokeWidth={3} />
              </button>
            </div>

          </div>

        </div>
      </div>

    </section>
  );
};

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, ArrowLeft, ArrowRight, ChevronDown, RefreshCw, X, AlertCircle, Smartphone, FlipHorizontal } from 'lucide-react';
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
    image: '/fruit/apple_fresh.jpg',
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
    image: '/fruit/apple_rotten.jpg',
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
    image: '/fruit/banana_fresh.jpg',
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
    image: '/fruit/banana_rotten.jpg',
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
    image: '/fruit/orange_fresh.jpg',
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
    image: '/fruit/orange_rotten.jpg',
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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
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
      showToast('Foto buah berhasil dianalisis dengan akurat.', 'success');
    } catch {
      showToast('Gagal memproses foto buah.', 'error');
    } finally {
      setAnalyzing(false);
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
        const result = await runAnalysis(file, 'browser');
        setUploadedPhoto(result.img || null);
        onAnalysisComplete(result);
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
    <section id="section-hero" className="pt-28 pb-16 min-h-[92vh] bg-[#FFC737] flex items-center justify-center relative overflow-hidden">

      {/* Floating Sparkles (Planet Oño Aesthetic) */}
      <div className="absolute top-36 left-1/4 text-2xl select-none pointer-events-none animate-pulse">✦</div>
      <div className="absolute bottom-24 left-16 text-3xl select-none pointer-events-none">✦</div>
      <div className="absolute top-44 right-1/3 text-2xl select-none pointer-events-none">✦</div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Comic Explosion Sticker Badge & Input Triggers */}
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

            {/* Action Buttons: Live Camera, Native Phone Camera, and Upload */}
            <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[210px]">
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

              {/* 1. Live WebRTC Camera */}
              <button
                onClick={() => (cameraActive ? stopCamera() : startCamera())}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2.5 px-3 rounded-xl bg-[#8DF947] border-2 border-black font-passata text-sm uppercase shadow-[2px_2px_0_#000000] hover:bg-[#A3FF6B] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-bold"
              >
                <Camera size={16} strokeWidth={2.5} />
                <span>{cameraActive ? 'Tutup Kamera' : 'Buka Kamera Web'}</span>
              </button>

              {/* 2. Direct Camera Device (Mobile Native Instant) */}
              <button
                onClick={() => {
                  sound.play('click');
                  nativeCameraInputRef.current?.click();
                }}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2.5 px-3 rounded-xl bg-white border-2 border-black font-passata text-sm uppercase shadow-[2px_2px_0_#000000] hover:bg-[#FFF8E7] flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 font-bold text-black"
              >
                <Smartphone size={16} strokeWidth={2.5} />
                <span>Foto Langsung HP</span>
              </button>

              {/* 3. Upload from Gallery */}
              <button
                onClick={() => {
                  sound.play('click');
                  fileInputRef.current?.click();
                }}
                onMouseEnter={() => sound.play('hover')}
                className="w-full py-2 px-3 rounded-xl bg-white/70 border-2 border-black font-passata text-xs uppercase shadow-[2px_2px_0_#000000] hover:bg-white flex items-center justify-center gap-1.5 cursor-pointer font-bold text-black"
              >
                <Upload size={14} strokeWidth={2.5} />
                <span>Unggah Galeri</span>
              </button>
            </div>

            {/* Tips Foto yang Pas Card (Sesuai Gambar Referensi) */}
            <div className="mt-5 w-full max-w-[210px] bg-[#F7F2E5] text-black border-2 border-black shadow-[3px_3px_0_#000000] rounded-2xl p-3 text-left">
              <div className="flex items-center gap-1.5 mb-1.5 font-passata text-xs font-bold uppercase tracking-tight text-black">
                <span>💡</span>
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
          <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2">
            <div
              className="relative w-[280px] sm:w-[320px] h-[380px] sm:h-[420px] rounded-[160px] border-3 border-black shadow-[8px_8px_0_#000000] flex flex-col items-center justify-center p-6 text-center cursor-pointer overflow-hidden transition-all group"
              style={{ backgroundColor: specimen.color }}
              onClick={handleTriggerAnalysis}
            >
              {/* Camera Stream Overlay */}
              {cameraActive ? (
                <div
                  className="relative w-full h-full rounded-[130px] overflow-hidden border-2 border-black bg-black flex flex-col items-center justify-center"
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

                  {/* Viewfinder Target Reticle */}
                  <div className="absolute inset-8 border border-dashed border-[#8DF947]/70 rounded-3xl pointer-events-none flex items-center justify-center">
                    <span className="font-mono-tech text-[10px] text-[#8DF947] tracking-widest uppercase bg-black/50 px-2 py-0.5 rounded">
                      Fokuskan Buah
                    </span>
                  </div>

                  {/* Switch Front/Rear Camera Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFacing();
                    }}
                    className="absolute top-4 left-4 p-2 rounded-full bg-black/80 hover:bg-black text-[#8DF947] border border-[#8DF947] cursor-pointer z-20 flex items-center gap-1 shadow-md"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <FlipHorizontal size={14} />
                  </button>

                  {/* Close Camera Button */}
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

                  {/* Capture Button */}
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
                  <img src={uploadedPhoto} alt="Spesimen terunggah" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedPhoto(null);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/80 text-white border border-white hover:bg-black cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* The Floating Specimen Plate (Photorealistic Fruit Display) */
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-3 border-black shadow-[4px_4px_0_#000000] bg-white p-2.5 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={specimen.image}
                      alt={specimen.name}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
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
                    MEMINDAI FOTON BUAH...
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

          {/* Right Column: Massive Headline & Curated Story Copy & Slider Controls */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6 order-3">

            {/* Massive Display Headline: Refers specifically to fruit freshness & quality */}
            <h1 className="font-passata text-5xl sm:text-6xl lg:text-[4.25rem] text-black text-shadow-3d-black uppercase tracking-tight font-bold leading-[0.95]">
              KESEGARAN<br />
              BUAH ALAMI.<br />
              TERUJI HINGGA<br />
              SERAT TERDALAM
            </h1>

            {/* Curated Short Copy (Clean 2-line blurbs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-black font-semibold leading-relaxed">
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

          </div>

        </div>
      </div>

    </section>
  );
};

import { AnalysisResult, DemoPreset, FruitType, Verdict, getVerdict } from '../types';

export const FRUIT_NAMES: Record<FruitType, string> = {
  apple: 'Apel',
  banana: 'Pisang',
  orange: 'Jeruk',
};

export const MODEL_LABELS = [
  'fresh_apple',
  'rotten_apple',
  'fresh_banana',
  'rotten_banana',
  'fresh_orange',
  'rotten_orange',
] as const;

export const LABEL_NAMES_ID: Record<string, string> = {
  fresh_apple: 'Apel Segar',
  rotten_apple: 'Apel Busuk',
  fresh_banana: 'Pisang Segar',
  rotten_banana: 'Pisang Busuk',
  fresh_orange: 'Jeruk Segar',
  rotten_orange: 'Jeruk Busuk',
};

export const FRUIT_KEYS: FruitType[] = ['apple', 'banana', 'orange'];

export const formatPercent = (val: number): string =>
  (val * 100).toFixed(1).replace('.', ',') + '%';

export const formatLabelId = (label: string): string =>
  LABEL_NAMES_ID[label] || label.replace('_', ' ');

export const resolveVerdict = (res: AnalysisResult): Verdict => {
  if (res.verdict === 'tidak_terdeteksi' || res.isOod || res.fruitCount === 0) {
    return 'tidak_terdeteksi';
  }
  if ((res.fruitCount ?? 1) > 1) {
    return 'ragu';
  }
  return res.verdict ?? getVerdict(res.conf, res.rot, res.isOod, res.fruitCount);
};

export const getVerdictMeta = (
  verdict: Verdict
): { label: string; badgeText: string; badgeClass: string; softBadgeClass: string } => {
  if (verdict === 'segar') {
    return {
      label: 'Segar',
      badgeText: '✓ Segar',
      badgeClass: 'bg-[#8DF947] text-black',
      softBadgeClass: 'bg-[#E6F4EA] text-[#14532D]',
    };
  }
  if (verdict === 'busuk') {
    return {
      label: 'Tidak Segar',
      badgeText: '× Tidak Segar',
      badgeClass: 'bg-[#B91C1C] text-white',
      softBadgeClass: 'bg-[#FEE2E2] text-[#991B1B]',
    };
  }
  if (verdict === 'tidak_terdeteksi') {
    return {
      label: 'Tidak Terdeteksi',
      badgeText: '⊘ Tidak Terdeteksi',
      badgeClass: 'bg-[#334155] text-white',
      softBadgeClass: 'bg-[#E2E8F0] text-[#1E293B]',
    };
  }
  return {
    label: 'Perlu Foto Ulang',
    badgeText: '? Ragu',
    badgeClass: 'bg-[#F59E0B] text-black',
    softBadgeClass: 'bg-[#FEF3C7] text-[#92400E]',
  };
};

export const getDiagnosisTitle = (res: AnalysisResult): string => {
  const verdict = resolveVerdict(res);
  if (verdict === 'tidak_terdeteksi') {
    return 'Objek Buah Tidak Terdeteksi';
  }
  const suffix = verdict === 'segar' ? 'Segar' : verdict === 'busuk' ? 'Tidak Segar' : 'Perlu Cek Ulang';
  return `${FRUIT_NAMES[res.fruit]} ${suffix}`;
};

export const getExplanationText = (res: AnalysisResult): string => {
  const verdict = resolveVerdict(res);
  if (verdict === 'tidak_terdeteksi') {
    return (
      res.ex ||
      'Sistem tidak mendeteksi apel, pisang, atau jeruk utuh pada foto ini. Pastikan satu buah berada di tengah bingkai dengan cahaya cukup dan latar polos.'
    );
  }
  if ((res.fruitCount ?? 1) > 1) {
    return `Terdeteksi ${res.fruitCount} kandidat buah dalam satu foto. Aplikasi ini dirancang untuk satu buah per foto, sehingga hasil ditandai ragu. Silakan foto satu buah saja di tengah bingkai.`;
  }
  if (verdict === 'ragu') {
    if (res.ex && res.quality?.warnings?.length) {
      return res.ex;
    }
    return `Keyakinan model ${formatPercent(res.conf)} belum cukup tinggi (di bawah 60%). Coba ambil ulang foto satu buah di tempat terang dengan fokus tajam dan latar polos.`;
  }
  if (res.ex) return res.ex;
  if (res.rot) {
    const locText = res.loc !== '–' && res.loc !== '-' ? ` di area ${res.loc}` : '';
    return `${FRUIT_NAMES[res.fruit]} dinilai tidak segar. Estimasi visual permukaan menunjukkan sekitar ${res.rasio}% area bercak${locText}.`;
  }
  return `${FRUIT_NAMES[res.fruit]} dinilai segar dengan warna kulit tampak merata (estimasi bercak ${res.rasio}%).`;
};

export const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export function calculateClassProbs(fruit: FruitType, isRotten: 0 | 1, confidence: number): number[] {
  const probs = Array(6).fill(((1 - confidence) * 0.15) / 4);
  const targetIndex = FRUIT_KEYS.indexOf(fruit) * 2 + isRotten;
  probs[targetIndex] = confidence;
  probs[targetIndex ^ 1] = (1 - confidence) * 0.85;
  return probs;
}

export const FRUIT_PHOTO_MAP: Record<FruitType, [string, string]> = {
  apple: ['/fruit/apple_fresh.jpg', '/fruit/apple_rotten.jpg'],
  banana: ['/fruit/banana_fresh.jpg', '/fruit/banana_rotten.jpg'],
  orange: ['/fruit/orange_fresh.jpg', '/fruit/orange_rotten.jpg'],
};

export function createSampleResult(preset: DemoPreset): AnalysisResult {
  const [fruit, rot, conf, rasio, n, loc, jw, tk] = preset;
  const p = calculateClassProbs(fruit, rot, conf);
  const photo = FRUIT_PHOTO_MAP[fruit]?.[rot] || '/fruit/apple_fresh.jpg';
  return {
    id: Date.now(),
    fruit,
    rot,
    conf,
    verdict: getVerdict(conf, rot),
    n,
    rasio,
    loc,
    jw,
    tk,
    p,
    src: 'contoh',
    model: 'contoh-preset (bukan inferensi langsung)',
    date: new Date().toISOString(),
    ms: 0,
    img: photo,
    thumb: photo,
    ex: 'Ini adalah contoh tampilan hasil (mode sampel) karena server analisis tidak terhubung. Untuk memeriksa foto buah Anda sendiri, pastikan layanan analisis aktif.',
  };
}

/** Resize large photos on the client before sending to /v1/predict to speed up mobile uploads. */
async function compressImageForUpload(
  imgElem: HTMLImageElement,
  maxDim = 640,
  quality = 0.86
): Promise<Blob> {
  const scale = Math.min(1, maxDim / Math.max(imgElem.naturalWidth || 1, imgElem.naturalHeight || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imgElem.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(imgElem.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Peramban gagal menyiapkan gambar untuk diunggah.');
  }
  ctx.drawImage(imgElem, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal mengompresi gambar sebelum dikirim.'));
      },
      'image/jpeg',
      quality
    );
  });
}

export async function fetchPredictionFromApi(
  apiEndpoint: string,
  imgElem: HTMLImageElement,
  fileObj: { url: string; name?: string },
  signal?: AbortSignal
): Promise<AnalysisResult> {
  if (!apiEndpoint) {
    throw new Error('Layanan analisis belum dikonfigurasi. Silakan coba lagi nanti.');
  }

  const compressedBlob = await compressImageForUpload(imgElem, 640, 0.86);
  const formData = new FormData();
  const safeName = (fileObj.name || 'foto.jpg').replace(/\.[^.]+$/, '') + '.jpg';
  formData.append('image', compressedBlob, safeName);

  const base = apiEndpoint.replace(/\/$/, '');
  const response = await fetch(base + '/v1/predict', {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    let errMsg = `Layanan analisis mengembalikan gangguan (kode ${response.status}). Silakan coba lagi.`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) errMsg = String(errJson.detail);
    } catch {}
    throw new Error(errMsg);
  }

  const json = await response.json();
  const labelIndex = Math.max(0, MODEL_LABELS.indexOf(json.label));
  const ft = json.features || {};
  const fruitCount = ft.fruit_count ?? 1;
  const isOod = Boolean(json.is_ood || ft.is_ood || fruitCount === 0);
  const defectRatio = +(ft.rasio_defek || 0);
  const formatBase64 = (b64?: string) =>
    b64 ? (b64.startsWith('data:') ? b64 : 'data:image/png;base64,' + b64) : null;

  const rot = (labelIndex & 1) as 0 | 1;
  const verdict: Verdict =
    json.verdict || getVerdict(json.confidence, rot, isOod, fruitCount);

  return {
    id: Date.now(),
    fruit: FRUIT_KEYS[labelIndex >> 1],
    rot,
    conf: json.confidence,
    isOod,
    verdict,
    fruitCount,
    quality: json.quality || undefined,
    n: ft.jumlah_bercak || 0,
    rasio: Math.round(defectRatio <= 1 ? defectRatio * 100 : defectRatio),
    loc: ft.lokasi_bercak || '–',
    jw: ft.jarak_warna ?? 0,
    tk: ft.tekstur ?? 0,
    p: MODEL_LABELS.map((l) => (json.probs && json.probs[l]) || 0),
    img: fileObj.url,
    cam: formatBase64(json.images?.gradcam_overlay),
    msk: formatBase64(json.images?.defect_mask),
    ar: imgElem.naturalWidth / Math.max(imgElem.naturalHeight, 1),
    ex: json.explanation,
    ms: json.inference_ms || 0,
    src: 'api',
    model: json.model?.name || 'mobilenetv3small_external_green_v2',
    date: new Date().toISOString(),
  };
}

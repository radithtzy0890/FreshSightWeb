import { AnalysisResult, FruitType, DemoPreset, getVerdict } from '../types';

export const FRUIT_NAMES: Record<FruitType, string> = {
  apple: 'Apel',
  banana: 'Pisang',
  orange: 'Jeruk',
};

export const DEFECT_DESCRIPTIONS: Record<FruitType, string> = {
  apple: 'bercak cokelat nekrotik dan dehidrasi kutikula epidermis',
  banana: 'hiperpigmentasi melanin pekat dan pelunakan jaringan buah',
  orange: 'degradasi kulit, bintik kapang, atau koloni jamur permukaan',
};

export const MODEL_LABELS = [
  'fresh_apple',
  'rotten_apple',
  'fresh_banana',
  'rotten_banana',
  'fresh_orange',
  'rotten_orange',
];

export const FRUIT_KEYS: FruitType[] = ['apple', 'banana', 'orange'];

export const clampNum = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

export const formatPercent = (val: number): string =>
  (val * 100).toFixed(1).replace('.', ',') + '%';

export const formatNumber = (val: number, decimals = 2): string =>
  val.toFixed(decimals).replace('.', ',');

export const getTodayString = (): string =>
  new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const getDiagnosisTitle = (res: AnalysisResult): string =>
  `${FRUIT_NAMES[res.fruit]} ${res.rot ? 'Busuk' : 'Segar'}`;

export const getExplanationText = (res: AnalysisResult): string => {
  if (res.ex) return res.ex;
  const isLow = res.conf < 0.7;
  const prefix = isLow ? 'Hasil estimasi awal: ' : '';
  if (res.rot) {
    const locText = res.loc !== '–' ? `, terkonsentrasi di area ${res.loc}` : '';
    return `${prefix}${FRUIT_NAMES[res.fruit]} menunjukkan anomali kesegaran karena ${DEFECT_DESCRIPTIONS[res.fruit]}${locText}. Defek menutupi estimasi ${res.rasio}% dari total permukaan buah yang diinspeksi.`;
  } else {
    const spotText = res.n ? `terdapat ${res.n} titik pigmen minor` : 'tanpa lesi atau bercak terdeteksi';
    return `${prefix}${FRUIT_NAMES[res.fruit]} terklasifikasi prima: integritas warna kulit homogen dengan ${spotText} (rasio defek ${res.rasio}%).`;
  }
};

export const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function connectedComponents(mask: Uint8Array, w: number, h: number) {
  const total = w * h;
  const labels = new Int32Array(total);
  const stack = new Int32Array(total);
  const sizes = [0];
  let currentLabel = 0;

  for (let s = 0; s < total; s++) {
    if (!mask[s] || labels[s]) continue;
    currentLabel++;
    let stackPointer = 0;
    let area = 0;
    stack[stackPointer++] = s;
    labels[s] = currentLabel;

    while (stackPointer > 0) {
      const p = stack[--stackPointer];
      area++;
      const x = p % w;
      const y = (p / w) | 0;

      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = currentLabel; stack[stackPointer++] = p - 1; }
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = currentLabel; stack[stackPointer++] = p + 1; }
      if (y > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = currentLabel; stack[stackPointer++] = p - w; }
      if (y < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = currentLabel; stack[stackPointer++] = p + w; }
    }
    sizes.push(area);
  }
  return { labels, sizes };
}

function erodeMask(mask: Uint8Array, w: number, h: number, radius: number) {
  const temp = new Uint8Array(w * h);
  const output = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let keep = 1;
      for (let d = -radius; d <= radius; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= w || !mask[y * w + xx]) { keep = 0; break; }
      }
      temp[y * w + x] = keep;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let keep = 1;
      for (let d = -radius; d <= radius; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= h || !temp[yy * w + x]) { keep = 0; break; }
      }
      output[y * w + x] = keep;
    }
  }
  return output;
}

function boxBlur(arr: Float32Array, w: number, h: number, radius: number): Float32Array {
  const temp = new Float32Array(w * h);
  const output = new Float32Array(w * h);
  const kernelSize = 2 * radius + 1;
  const bound = (v: number, max: number) => (v < 0 ? 0 : v >= max ? max - 1 : v);

  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += arr[y * w + bound(x, w)];
    for (let x = 0; x < w; x++) {
      temp[y * w + x] = sum / kernelSize;
      sum += arr[y * w + bound(x + radius + 1, w)] - arr[y * w + bound(x - radius, w)];
    }
  }

  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += temp[bound(y, h) * w + x];
    for (let y = 0; y < h; y++) {
      output[y * w + x] = sum / kernelSize;
      sum += temp[bound(y + radius + 1, h) * w + x] - temp[bound(y - radius, h) * w + x];
    }
  }
  return output;
}

export function calculateClassProbs(fruit: FruitType, isRotten: 0 | 1, confidence: number): number[] {
  const probs = Array(6).fill((1 - confidence) * 0.15 / 4);
  const targetIndex = FRUIT_KEYS.indexOf(fruit) * 2 + isRotten;
  probs[targetIndex] = confidence;
  probs[targetIndex ^ 1] = (1 - confidence) * 0.85;
  return probs;
}

export function analyzeImageLocally(imageElement: HTMLImageElement): Omit<AnalysisResult, 'id' | 'src' | 'date'> {
  const startTime = performance.now();
  const scale = Math.min(1, 224 / Math.max(imageElement.naturalWidth, imageElement.naturalHeight));
  const w = Math.max(16, Math.round(imageElement.naturalWidth * scale));
  const h = Math.max(16, Math.round(imageElement.naturalHeight * scale));
  const totalPixels = w * h;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(imageElement, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h).data;

  const H = new Float32Array(totalPixels);
  const S = new Float32Array(totalPixels);
  const V = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const r = imageData[i * 4] / 255;
    const g = imageData[i * 4 + 1] / 255;
    const b = imageData[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    V[i] = max;
    S[i] = max ? delta / max : 0;
    let hue = 0;
    if (delta) {
      hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    H[i] = hue;
  }

  // Border sampling for background estimation
  const margin = Math.max(2, Math.round(Math.min(w, h) * 0.05));
  const borderSamples: [number[], number[], number[]] = [[], [], []];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < margin || y < margin || x >= w - margin || y >= h - margin) {
        const idx = (y * w + x) * 4;
        borderSamples[0].push(imageData[idx]);
        borderSamples[1].push(imageData[idx + 1]);
        borderSamples[2].push(imageData[idx + 2]);
      }
    }
  }

  const median = (arr: number[]) => arr.sort((a, b) => a - b)[arr.length >> 1];
  const bgColors = borderSamples.map(median);
  const foreground = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const dr = imageData[i * 4] - bgColors[0];
    const dg = imageData[i * 4 + 1] - bgColors[1];
    const db = imageData[i * 4 + 2] - bgColors[2];
    foreground[i] = Math.sqrt(dr * dr + dg * dg + db * db) > 48 ? 1 : 0;
  }

  const { labels, sizes } = connectedComponents(foreground, w, h);
  let bestLabel = 0;
  let bestArea = 0;
  sizes.forEach((area, idx) => {
    if (idx && area > bestArea) {
      bestArea = area;
      bestLabel = idx;
    }
  });

  const fruitMask = new Uint8Array(totalPixels);
  let isFallbackMask = false;

  if (bestLabel && bestArea > totalPixels * 0.04 && bestArea < totalPixels * 0.88) {
    for (let i = 0; i < totalPixels; i++) fruitMask[i] = labels[i] === bestLabel ? 1 : 0;
    const inv = fruitMask.map(v => (v ? 0 : 1));
    const invComp = connectedComponents(inv, w, h);
    const outerLabels = new Set<number>();
    for (let x = 0; x < w; x++) {
      outerLabels.add(invComp.labels[x]);
      outerLabels.add(invComp.labels[(h - 1) * w + x]);
    }
    for (let y = 0; y < h; y++) {
      outerLabels.add(invComp.labels[y * w]);
      outerLabels.add(invComp.labels[y * w + w - 1]);
    }
    for (let i = 0; i < totalPixels; i++) {
      if (inv[i] && !outerLabels.has(invComp.labels[i])) fruitMask[i] = 1;
    }
  } else {
    isFallbackMask = true;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = (x - w / 2) / (w * 0.38);
        const v = (y - h / 2) / (h * 0.38);
        fruitMask[y * w + x] = u * u + v * v < 1 ? 1 : 0;
      }
    }
  }

  let minX = w, maxX = 0, minY = h, maxY = 0, fruitArea = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (fruitMask[y * w + x]) {
        fruitArea++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;
  const fillRatio = fruitArea / (bboxW * bboxH);
  const aspectRatio = Math.max(bboxW, bboxH) / Math.min(bboxW, bboxH);

  const innerMask = erodeMask(fruitMask, w, h, Math.max(2, Math.round(Math.sqrt(fruitArea) * 0.045)));
  const innerIndices: number[] = [];
  for (let i = 0; i < totalPixels; i++) {
    if (innerMask[i]) innerIndices.push(i);
  }

  const validPixelCount = Math.max(innerIndices.length, 1);
  const Rs: number[] = [], Gs: number[] = [], Bs: number[] = [], Vs: number[] = [];
  innerIndices.forEach(i => {
    Rs.push(imageData[i * 4]);
    Gs.push(imageData[i * 4 + 1]);
    Bs.push(imageData[i * 4 + 2]);
    Vs.push(V[i]);
  });

  const medianColor = [median(Rs), median(Gs), median(Bs)];
  let yellow = 0, orange = 0, red = 0, green = 0;
  const defectMask = new Uint8Array(totalPixels);
  let defectCount = 0, sumX = 0, sumY = 0, sumColorDiff = 0, textureVariation = 0;

  innerIndices.forEach(i => {
    const hu = H[i], s = S[i], v = V[i];
    if (hu >= 45 && hu < 72 && s > 0.35 && v > 0.5) yellow++;
    else if (hu >= 14 && hu < 45 && s > 0.55 && v > 0.55) orange++;
    else if ((hu < 14 || hu > 340) && s > 0.45 && v > 0.25) red++;
    else if (hu >= 70 && hu < 160 && s > 0.25) green++;

    const isBrownish = hu >= 12 && hu < 50 && s > 0.25 && v > 0.08 && v < 0.55;
    if (v < 0.2 || isBrownish) {
      defectMask[i] = 1;
      defectCount++;
      sumX += i % w;
      sumY += (i / w) | 0;
      sumColorDiff += Math.hypot(
        imageData[i * 4] - medianColor[0],
        imageData[i * 4 + 1] - medianColor[1],
        imageData[i * 4 + 2] - medianColor[2]
      );
    }
    if (i + 1 < totalPixels) textureVariation += Math.abs(V[i] - V[i + 1]);
  });

  const defectRatio = defectCount / validPixelCount;
  const coloredCount = yellow + orange + red + green;
  const isBananaShape = fillRatio < 0.64 || aspectRatio > 1.55 || (yellow / validPixelCount > 0.55 && aspectRatio > 1.3);
  let fruitType: FruitType = 'apple';
  let typeConfidenceMultiplier = 1;

  if (isBananaShape) {
    fruitType = 'banana';
    typeConfidenceMultiplier = clampNum(0.55 + (yellow / validPixelCount), 0.55, 1);
  } else {
    const medH = median(innerIndices.map(i => H[i]));
    const medS = median(innerIndices.map(i => S[i]));
    let scoreApple = red + green + yellow * 0.6;
    let scoreOrange = orange;
    if (coloredCount < validPixelCount * 0.1) {
      scoreOrange = (medH >= 14 && medH < 50 && medS > 0.35 && median(Vs.slice()) > 0.5) ? 1 : 0;
      scoreApple = 1 - scoreOrange;
    }
    fruitType = scoreOrange > scoreApple ? 'orange' : 'apple';
    typeConfidenceMultiplier = clampNum(Math.abs(scoreOrange - scoreApple) / (scoreOrange + scoreApple + 1e-3) * 0.5 + 0.5, 0.55, 1);
  }

  const threshold = fruitType === 'banana' ? 0.18 : 0.15;
  const zScore = (defectRatio - threshold) / 0.1;
  const rotProbability = 1 / (1 + Math.exp(-2.2 * zScore));
  const isRotten: 0 | 1 = rotProbability >= 0.5 ? 1 : 0;

  let confidence = clampNum(isRotten ? rotProbability : 1 - rotProbability, 0.55, 0.985) * (0.88 + 0.12 * typeConfidenceMultiplier);
  confidence = clampNum(confidence, 0.52, 0.985);
  if (isFallbackMask) confidence = Math.min(confidence, 0.66);

  const spotCount = (() => {
    const comp = connectedComponents(defectMask, w, h);
    return comp.sizes.filter((area, i) => i && area >= Math.max(6, fruitArea * 0.004)).length;
  })();

  let defectLocation = '–';
  if (defectCount > 0 && defectRatio > 0.01) {
    const cx = (sumX / defectCount - minX) / bboxW;
    const cy = (sumY / defectCount - minY) / bboxH;
    const vPos = cy < 0.34 ? 'atas' : cy > 0.66 ? 'bawah' : '';
    const hPos = cx < 0.34 ? 'kiri' : cx > 0.66 ? 'kanan' : '';
    defectLocation = (vPos + ' ' + hPos).trim() || 'tengah';
  }

  // Grad-CAM and Defect Mask texture generation
  const mf = new Float32Array(totalPixels);
  const df = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    mf[i] = fruitMask[i];
    df[i] = defectMask[i];
  }

  const blurRadius = Math.max(2, Math.round(Math.sqrt(fruitArea) * (isRotten ? 0.07 : 0.22)));
  const heatmap = boxBlur(boxBlur(isRotten ? df : mf, w, h, blurRadius), w, h, blurRadius);
  let maxHeat = 0;
  heatmap.forEach(v => { if (v > maxHeat) maxHeat = v; });
  const smoothFruitMask = boxBlur(mf, w, h, 3);

  const createPngFromData = (pixelFunc: (idx: number) => number[]) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    if (!x) return '';
    const imgData = x.createImageData(w, h);
    for (let i = 0; i < totalPixels; i++) {
      const rgba = pixelFunc(i);
      imgData.data[i * 4] = rgba[0];
      imgData.data[i * 4 + 1] = rgba[1];
      imgData.data[i * 4 + 2] = rgba[2];
      imgData.data[i * 4 + 3] = rgba[3];
    }
    x.putImageData(imgData, 0, 0);
    return c.toDataURL('image/png');
  };

  const lerpColor = (a: number[], b: number[], t: number) =>
    a.map((val, idx) => Math.round(val + (b[idx] - val) * t));

  const gradCamPng = createPngFromData(i => {
    let t = maxHeat > 1e-6 ? heatmap[i] / maxHeat : 0;
    if (!isRotten) t *= 0.55;
    const color = t < 0.5 ? lerpColor([0, 176, 255], [255, 196, 0], t * 2) : lerpColor([255, 196, 0], [255, 23, 68], (t - 0.5) * 2);
    const alpha = Math.round(clampNum(t * 1.3, 0, 0.85) * 255 * clampNum(smoothFruitMask[i] * 1.6, 0, 1));
    return [color[0], color[1], color[2], alpha];
  });

  const defectMaskPng = createPngFromData(i => {
    return defectMask[i] ? [255, 69, 58, 230] : fruitMask[i] ? [0, 0, 0, 120] : [0, 0, 0, 160];
  });

  return {
    fruit: fruitType,
    rot: isRotten,
    conf: confidence,
    verdict: getVerdict(confidence, isRotten),
    n: spotCount,
    rasio: Math.round(defectRatio * 100),
    loc: defectLocation,
    jw: Math.round(sumColorDiff / Math.max(defectCount, 1) * 10) / 10,
    tk: Math.round(textureVariation / validPixelCount * 100) / 10,
    p: calculateClassProbs(fruitType, isRotten, confidence),
    cam: gradCamPng,
    msk: defectMaskPng,
    ar: w / h,
    fb: isFallbackMask,
    ms: Math.round(performance.now() - startTime),
    model: 'analisis-warna (browser)',
  };
}

// Helper to create procedural photo render for presets so history always has high-res images
export function createSampleFruitDataUrl(fruit: FruitType, isRotten: 0 | 1): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean studio background
  ctx.fillStyle = '#f5f5f7';
  ctx.fillRect(0, 0, 400, 400);

  // Soft studio surface drop shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(200, 320, 110, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.filter = 'blur(8px)';
  ctx.fill();
  ctx.restore();

  if (fruit === 'apple') {
    // Apple body
    const grad = ctx.createRadialGradient(170, 170, 20, 200, 200, 140);
    if (isRotten) {
      grad.addColorStop(0, '#a33c2a');
      grad.addColorStop(0.4, '#6b2014');
      grad.addColorStop(0.8, '#42160d');
      grad.addColorStop(1, '#2b0c07');
    } else {
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(0.3, '#dc2626');
      grad.addColorStop(0.7, '#991b1b');
      grad.addColorStop(1, '#450a0a');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(170, 210, 95, 0, Math.PI * 2);
    ctx.arc(230, 210, 95, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#451a03';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(200, 130);
    ctx.quadraticCurveTo(205, 95, 225, 80);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = isRotten ? '#57534e' : '#15803d';
    ctx.beginPath();
    ctx.ellipse(220, 95, 18, 9, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Defect spots for rotten
    if (isRotten) {
      ctx.fillStyle = 'rgba(30, 10, 5, 0.75)';
      ctx.beginPath();
      ctx.arc(180, 230, 32, 0, Math.PI * 2);
      ctx.arc(235, 195, 24, 0, Math.PI * 2);
      ctx.arc(150, 180, 18, 0, Math.PI * 2);
      ctx.fill();

      // Mold speckles
      ctx.fillStyle = 'rgba(230, 240, 220, 0.45)';
      ctx.beginPath();
      ctx.arc(175, 225, 6, 0, Math.PI * 2);
      ctx.arc(188, 235, 4, 0, Math.PI * 2);
      ctx.arc(232, 198, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (fruit === 'banana') {
    // Banana body
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(-Math.PI / 6);
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.strokeStyle = isRotten ? '#854d0e' : '#eab308';
    ctx.beginPath();
    ctx.arc(0, 0, 120, Math.PI * 0.75, Math.PI * 1.55);
    ctx.stroke();

    // Inner highlight
    ctx.lineWidth = 26;
    ctx.strokeStyle = isRotten ? '#713f12' : '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 120, Math.PI * 0.82, Math.PI * 1.48);
    ctx.stroke();

    if (isRotten) {
      // Dark necrotic melanin spots
      ctx.fillStyle = '#291405';
      const spots = [[-85, 80, 12], [-65, 40, 14], [-30, -10, 18], [10, -50, 15], [50, -85, 11]];
      spots.forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  } else {
    // Orange body
    const grad = ctx.createRadialGradient(175, 175, 20, 200, 200, 120);
    if (isRotten) {
      grad.addColorStop(0, '#c2410c');
      grad.addColorStop(0.5, '#7c2d12');
      grad.addColorStop(1, '#431407');
    } else {
      grad.addColorStop(0, '#fb923c');
      grad.addColorStop(0.4, '#ea580c');
      grad.addColorStop(0.8, '#c2410c');
      grad.addColorStop(1, '#7c2d12');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(200, 200, 105, 0, Math.PI * 2);
    ctx.fill();

    // Stem navel
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(200, 100, 8, 0, Math.PI * 2);
    ctx.fill();

    if (isRotten) {
      // Mold patch
      ctx.fillStyle = 'rgba(74, 110, 95, 0.85)';
      ctx.beginPath();
      ctx.arc(170, 210, 42, 0, Math.PI * 2);
      ctx.fill();

      // White mold mycelium halo
      ctx.strokeStyle = 'rgba(235, 245, 235, 0.6)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(170, 210, 44, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

// ── runAnalysis: top-level helper used by AnalysisStudio ─────────────────
export async function runAnalysis(
  file: File | null,
  src: 'browser' | 'api' | 'contoh',
  preset?: DemoPreset
): Promise<AnalysisResult> {
  const now = new Date().toISOString();
  const id = Date.now();

  if (src === 'contoh' && preset) {
    const [fruit, rot, conf, rasio, n, loc, jw, tk] = preset;
    const p = calculateClassProbs(fruit, rot, conf);
    const photoDataUrl = createSampleFruitDataUrl(fruit, rot);

    return {
      id,
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
      model: 'MobileNetV2 (Edge)',
      date: now,
      ms: Math.round(45 + Math.random() * 25),
      img: photoDataUrl,
      thumb: photoDataUrl,
    };
  }

  if (!file) throw new Error('No file provided');

  // Convert File to compressed persistent Base64 DataURL (so it never expires!)
  const photoDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const imgElem = await loadImageElement(photoDataUrl);
  const partial = analyzeImageLocally(imgElem);

  return {
    id,
    ...partial,
    verdict: getVerdict(partial.conf, partial.rot),
    src: 'browser',
    date: now,
    img: photoDataUrl,
    thumb: photoDataUrl,
  };
}

export async function fetchPredictionFromApi(
  apiEndpoint: string,
  imgElem: HTMLImageElement,
  fileObj: { url: string; name?: string }
): Promise<AnalysisResult> {
  const blob = await (await fetch(fileObj.url)).blob();
  const formData = new FormData();
  formData.append('image', blob, fileObj.name || 'foto.jpg');

  const response = await fetch(apiEndpoint.replace(/\/$/, '') + '/v1/predict', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('API Prediction failed');
  const json = await response.json();
  const labelIndex = MODEL_LABELS.indexOf(json.label);
  const ft = json.features || {};
  const defectRatio = +(ft.rasio_defek || 0);
  const formatBase64 = (b64?: string) =>
    b64 ? (b64.startsWith('data:') ? b64 : 'data:image/png;base64,' + b64) : null;

  return {
    id: Date.now(),
    fruit: FRUIT_KEYS[labelIndex >> 1],
    rot: (labelIndex & 1) as 0 | 1,
    conf: json.confidence,
    verdict: getVerdict(json.confidence, (labelIndex & 1) as 0 | 1),
    n: ft.jumlah_bercak || 0,
    rasio: Math.round(defectRatio <= 1 ? defectRatio * 100 : defectRatio),
    loc: ft.lokasi_bercak || '–',
    jw: ft.jarak_warna ?? 0,
    tk: ft.tekstur ?? 0,
    p: MODEL_LABELS.map(l => (json.probs && json.probs[l]) || 0),
    img: fileObj.url,
    cam: formatBase64(json.images?.gradcam_overlay),
    msk: formatBase64(json.images?.defect_mask),
    ar: imgElem.naturalWidth / imgElem.naturalHeight,
    ex: json.explanation,
    ms: json.inference_ms || 0,
    src: 'api',
    model: json.model?.name || 'mobilenetv3_external',
    date: getTodayString(),
  };
}


import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import confetti from 'canvas-confetti';
import {
  createIcons,
  Leaf,
  Scan,
  Layers,
  Flame,
  Target,
  BarChart3,
  Clock,
  Check,
  X,
  AlertTriangle,
  Sliders,
  Upload,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  Camera,
  Activity,
  Cpu,
  ArrowRight,
  RefreshCw,
  Copy,
  Printer,
  ChevronRight,
  Share2,
  Trash2,
  Search,
  ExternalLink,
  HelpCircle,
  FileText
} from 'lucide';

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// CONSTANTS & VOCABULARY
// ==========================================
const FRUIT_NAMES = { apple: 'Apel', banana: 'Pisang', orange: 'Jeruk' };
const DEFECT_DESCRIPTIONS = {
  apple: 'bercak cokelat nekrotik dan dehidrasi kutikula epidermis',
  banana: 'hiperpigmentasi melanin pekat dan pelunakan jaringan buah',
  orange: 'degradasi kulit, bintik kapang, atau koloni jamur permukaan'
};
const MODEL_LABELS = ['fresh_apple', 'rotten_apple', 'fresh_banana', 'rotten_banana', 'fresh_orange', 'rotten_orange'];
const FRUIT_KEYS = ['apple', 'banana', 'orange'];

// Curated reference demo presets [fruit, isRotten, confidence, defectRatio, spotCount, location, colorDistance, texture]
const DEMO_PRESETS = [
  ['apple', 0, 0.992, 1, 0, '–', 8.2, 0.09],
  ['apple', 1, 0.946, 24, 5, 'tengah kiri', 47.1, 0.31],
  ['banana', 0, 0.988, 2, 1, '–', 9.8, 0.12],
  ['banana', 1, 0.974, 32, 4, 'tengah', 42.5, 0.18],
  ['orange', 0, 0.985, 1, 0, '–', 8.9, 0.10],
  ['orange', 1, 0.880, 11, 2, 'bawah kiri', 33.4, 0.22]
];

const SPOT_COORDINATES = [[105, 125, 13], [135, 100, 8], [150, 150, 10], [90, 150, 6], [120, 170, 7]];

// State variables
let globalSvgId = 0;
let currentResult = null;
let currentUploadedFile = null;
let currentInspectionView = 'asli';
let activeHeroPresetIndex = 0;
let isHeroAutoRotating = true;
let heroRotationTimer = null;
let mlApiEndpoint = '';

try {
  mlApiEndpoint = localStorage.getItem('fs_api_endpoint') || '';
} catch (e) {}

// History storage helper
const getStoredHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('freshsight_history') || '[]');
  } catch (e) {
    return [];
  }
};
const setStoredHistory = (items) => {
  try {
    localStorage.setItem('freshsight_history', JSON.stringify(items.slice(0, 40)));
  } catch (e) {}
};
let historyList = getStoredHistory();

// Helper: Toast notification
const showToast = (message, type = 'default') => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-[#122A1E] text-[#88D49E] border-[#224430]' : 'bg-[#132419] text-[#F1F6F0] border-[#2A3F30]';
  toast.className = `flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-xl text-xs sm:text-sm font-semibold pointer-events-auto transition-all duration-300 opacity-0 translate-y-2 ${bg}`;
  toast.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${type === 'success' ? 'bg-[#52D487]' : 'bg-[#EFA018]'}"></span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
};

// ==========================================
// PROCEDURAL SVG FRUIT GENERATOR
// ==========================================
function generateFruitSvg(fruit, isRotten, spotCount, viewMode = 'asli', isBare = false) {
  const gid = 'g_' + (++globalSvgId);
  const u = (x) => `url(#${gid}${x})`;
  const spots = isRotten ? SPOT_COORDINATES.slice(0, Math.max(spotCount, 1)) : [];

  const blurCircles = spots.map(s => `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2] * 1.45}"/>`).join('');
  const maskCircles = spots.map(s => `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2]}"/>`).join('');

  const shapes = {
    apple: `<path id="${gid}Shape" d="M125 72C100 50 52 62 46 114c-5 46 26 102 59 104 9 .5 14-4 20-4s11 4.5 20 4c33-2 64-58 59-104C198 62 150 50 125 72Z"/>`,
    orange: `<circle id="${gid}Shape" cx="125" cy="130" r="72"/>`,
    banana: `<path id="${gid}Shape" d="M72 46C58 62 52 98 70 138c22 48 82 76 136 52 4-2 6-8 1-10-47 6-95-20-109-58-8-24-6-48 0-68C92 40 80 38 72 46Z"/>`
  }[fruit];

  const palettes = {
    apple: isRotten ? ['#A8683E', '#6B3821', '#2C160B'] : ['#EC4B3F', '#B9151C', '#5F0910'],
    orange: isRotten ? ['#D8B669', '#9E7A34', '#593F15'] : ['#FFA834', '#F47F10', '#B74F03'],
    banana: isRotten ? ['#B69248', '#785923', '#34210D'] : ['#FDE769', '#F1C42B', '#B7850E']
  }[fruit];

  const isBanana = fruit === 'banana';
  const filterTurbulence = (id, freq, m) =>
    `<filter id="${gid}${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${m[0]}"/><feColorMatrix values="${m[1]}"/></filter>`;

  const defs = `<defs>
    <linearGradient id="${gid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7F3EA"/><stop offset="1" stop-color="#DDD5C2"/></linearGradient>
    ${isBanana
      ? `<linearGradient id="${gid}fill" x1=".05" y1=".1" x2=".95" y2=".9">`
      : `<radialGradient id="${gid}fill" cx=".36" cy=".3" r=".9">`}
      <stop offset="0" stop-color="${palettes[0]}"/>
      <stop offset=".55" stop-color="${palettes[1]}"/>
      <stop offset="1" stop-color="${palettes[2]}"/>
    ${isBanana ? '</linearGradient>' : '</radialGradient>'}
    <radialGradient id="${gid}vignette" cx=".5" cy=".42" r=".62"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>
    <filter id="${gid}blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="${gid}sharp" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    ${filterTurbulence('G', '.85', [3, '0 0 0 0 .1 0 0 0 0 .06 0 0 0 0 .03 0 0 0 .9 -.3'])}
    ${filterTurbulence('R', '.5 .03', [7, '0 0 0 0 .96 0 0 0 0 .66 0 0 0 0 .22 0 0 0 1.8 -.72'])}
    ${filterTurbulence('K2', '.5', [11, '0 0 0 0 .14 0 0 0 0 .08 0 0 0 0 .03 0 0 0 12 -6.6'])}
    <filter id="${gid}bump" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="4" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="1.8" diffuseConstant="1.75" result="l"><feDistantLight azimuth="235" elevation="55"/></feDiffuseLighting><feComposite in="l" in2="SourceGraphic" operator="in" result="m"/><feBlend in="SourceGraphic" in2="m" mode="multiply"/></filter>
    <filter id="${gid}disp" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="22"/><feGaussianBlur stdDeviation="1.6"/></filter>
    ${shapes}
    <clipPath id="${gid}Clip"><use href="#${gid}Shape"/></clipPath>
  </defs>`;

  const orangeMold = fruit === 'orange' ? `
    <g filter="${u('disp')}" fill="#E4ECD8" opacity=".85">${spots.slice(0, 3).map(s => `<circle cx="${s[0] + 6}" cy="${s[1] - 4}" r="${s[2] * 0.8}"/>`).join('')}</g>
    <g filter="${u('sharp')}" fill="#5E9A86" opacity=".8">${spots.slice(0, 3).map(s => `<circle cx="${s[0] - 3}" cy="${s[1] + 3}" r="${s[2] * 0.35}"/>`).join('')}</g>` : '';

  const bananaRidge = isBanana ? `
    <g fill="none" stroke-linecap="round">
      <path d="M80.6 48.6C69.2 66 64.5 98 79.2 132.7 98.6 177.4 154.6 204.8 206.3 186.7" stroke="#6B4A00" opacity=".3" stroke-width="1.4"/>
      <path d="M89.2 51.3C80.4 69.9 77.1 98 88.5 127.4 105.2 168.8 157.3 195.5 206.7 183.4" stroke="#6B4A00" opacity=".3" stroke-width="1.4"/>
      <path d="M75 54C64 72 60 100 75 135 96 178 150 204 198 190" stroke="#FFF7B8" opacity="${isRotten ? 0.18 : 0.5}" stroke-width="3.5" filter="${u('sharp')}"/>
    </g>` : '';

  const stemAndParts = {
    apple: `<ellipse cx="125" cy="76" rx="10" ry="4" fill="#2A140A" opacity=".45"/>
      <path d="M124 78C122 60 127 46 138 34" stroke="${isRotten ? '#2E2014' : '#5A3A22'}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      ${isRotten ? '' : '<path d="M139 42C150 24 176 26 182 40 168 52 150 54 139 42Z" fill="#4C9A3A"/><path d="M141 43C156 40 168 38 178 40" stroke="#2E6B26" stroke-width="1.2" fill="none"/>'}`,
    banana: `<path d="M82 54L85 27Q92 22 99 28L99 56Z" fill="${isRotten ? '#3E3318' : '#7C8A3A'}"/>
      <ellipse cx="92" cy="27" rx="7" ry="3" fill="#3A3315"/>
      <ellipse cx="205" cy="185" rx="6" ry="4" transform="rotate(-35 205 185)" fill="#2B1C0C"/>`,
    orange: `<circle cx="125" cy="61" r="5.5" fill="${isRotten ? '#3E3418' : '#5E8A25'}"/>
      ${isRotten ? '' : '<path d="M128 58c6-8 16-9 22-5-6 7-16 9-22 5z" fill="#5E9A32"/>'}`
  }[fruit];

  const bodyContent = isBare ? '' : `
    ${defs}
    <rect width="250" height="250" fill="${u('bg')}"/>
    <ellipse cx="125" cy="214" rx="76" ry="10" fill="#000" opacity=".32" filter="${u('blur')}"/>
    <use href="#${gid}Shape" fill="${u('fill')}" ${fruit === 'orange' ? `filter="${u('bump')}"` : ''}/>
    <g clip-path="${u('Clip')}">
      <rect width="250" height="250" filter="${u('G')}" opacity="${fruit === 'orange' ? 0.3 : 0.5}"/>
      ${fruit === 'apple' && !isRotten ? `<rect width="250" height="250" filter="${u('R')}" opacity=".2"/>` : ''}
      ${bananaRidge}
      <use href="#${gid}Shape" fill="${u('vignette')}"/>
      ${isRotten ? `
        <g filter="${u('disp')}" fill="${fruit === 'orange' ? '#4A3314' : '#22110A'}" opacity=".8">${blurCircles}</g>
        ${isBanana ? `<rect width="250" height="250" filter="${u('K2')}" opacity=".85"/>` : fruit === 'apple' ? `<rect width="250" height="250" filter="${u('K2')}" opacity=".3"/>` : orangeMold}
      ` : isBanana ? '' : `<ellipse cx="96" cy="100" rx="15" ry="30" transform="rotate(32 96 100)" fill="#fff" opacity=".5" filter="${u('sharp')}"/>`}
    </g>
    ${stemAndParts}`;

  const hx = isRotten && spotCount ? SPOT_COORDINATES[0][0] : 125;
  const hy = isRotten && spotCount ? SPOT_COORDINATES[0][1] : 140;

  return `<svg viewBox="0 0 250 250" data-view="${viewMode}" class="w-full h-full block object-contain select-none" role="img" aria-label="${isBare ? 'Peta analisis' : 'Ilustrasi ' + FRUIT_NAMES[fruit]}">
    ${bodyContent}
    <g class="layer-cam ${viewMode === 'cam' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 pointer-events-none">
      <defs>
        <radialGradient id="${gid}heat">
          <stop offset="0" stop-color="#FF1744" stop-opacity="${isRotten ? 0.88 : 0.4}"/>
          <stop offset=".5" stop-color="#FFC400" stop-opacity=".5"/>
          <stop offset="1" stop-color="#00B0FF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${hx}" cy="${hy}" r="${isRotten ? 85 : 100}" fill="url(#${gid}heat)"/>
    </g>
    <g class="layer-mask ${viewMode === 'mask' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 pointer-events-none">
      <rect width="250" height="250" fill="#000" opacity=".6"/>
      <g fill="#FF453A">${maskCircles}</g>
    </g>
  </svg>`;
}

// ==========================================
// IN-BROWSER COMPUTER VISION PIPELINE
// ==========================================
const clampNum = (val, min, max) => Math.max(min, Math.min(max, val));

function connectedComponents(mask, w, h) {
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

function erodeMask(mask, w, h, radius) {
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

function boxBlur(arr, w, h, radius) {
  const temp = new Float32Array(w * h);
  const output = new Float32Array(w * h);
  const kernelSize = 2 * radius + 1;
  const bound = (v, max) => (v < 0 ? 0 : v >= max ? max - 1 : v);

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

function calculateClassProbs(fruit, isRotten, confidence) {
  const probs = Array(6).fill((1 - confidence) * 0.15 / 4);
  const targetIndex = FRUIT_KEYS.indexOf(fruit) * 2 + isRotten;
  probs[targetIndex] = confidence;
  probs[targetIndex ^ 1] = (1 - confidence) * 0.85;
  return probs;
}

function analyzeImageLocally(imageElement) {
  const startTime = performance.now();
  const scale = Math.min(1, 224 / Math.max(imageElement.naturalWidth, imageElement.naturalHeight));
  const w = Math.max(16, Math.round(imageElement.naturalWidth * scale));
  const h = Math.max(16, Math.round(imageElement.naturalHeight * scale));
  const totalPixels = w * h;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
  const borderSamples = [[], [], []];
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

  const median = (arr) => arr.sort((a, b) => a - b)[arr.length >> 1];
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

  let fruitMask = new Uint8Array(totalPixels);
  let isFallbackMask = false;

  if (bestLabel && bestArea > totalPixels * 0.04 && bestArea < totalPixels * 0.88) {
    for (let i = 0; i < totalPixels; i++) fruitMask[i] = labels[i] === bestLabel ? 1 : 0;
    const inv = fruitMask.map(v => (v ? 0 : 1));
    const invComp = connectedComponents(inv, w, h);
    const outerLabels = new Set();
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
  const innerIndices = [];
  for (let i = 0; i < totalPixels; i++) {
    if (innerMask[i]) innerIndices.push(i);
  }

  const validPixelCount = Math.max(innerIndices.length, 1);
  const Rs = [], Gs = [], Bs = [], Vs = [];
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
  let fruitType = 'apple';
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
  const isRotten = rotProbability >= 0.5 ? 1 : 0;

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

  const createPngFromData = (pixelFunc) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
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

  const lerpColor = (a, b, t) => a.map((val, idx) => Math.round(val + (b[idx] - val) * t));

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
    ms: Math.round(performance.now() - startTime)
  };
}

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Formatters
const formatPercent = (val) => (val * 100).toFixed(1).replace('.', ',') + '%';
const formatNumber = (val, decimals = 2) => val.toFixed(decimals).replace('.', ',');
const getTodayString = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const getDiagnosisTitle = (res) =>
  `${FRUIT_NAMES[res.fruit]} ${res.rot ? 'Busuk' : 'Segar'}`;

const getExplanationText = (res) => {
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

// ==========================================
// LENIS & GSAP INTEGRATION
// ==========================================
let lenisInstance = null;

function initSmoothScroll() {
  lenisInstance = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.8
  });

  lenisInstance.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenisInstance.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Fallback for CSS scroll-driven progress bar (Modern Web Guidance)
  if (!CSS.supports('animation-timeline', 'scroll()')) {
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
      lenisInstance.on('scroll', ({ progress }) => {
        progressBar.style.transform = `scaleX(${progress})`;
      });
    }
  }

  // Smooth anchor scrolling
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-scroll-to');
      navigateToSection(targetId);
    });
  });
}

// Section navigation
function navigateToSection(sectionId) {
  const targetElem = document.getElementById(sectionId);
  if (!targetElem) return;

  // Update URL hash without jumping
  if (window.location.hash !== '#' + sectionId) {
    history.pushState(null, null, '#' + sectionId);
  }

  if (lenisInstance) {
    lenisInstance.scrollTo(targetElem, { offset: -88 });
  } else {
    targetElem.scrollIntoView({ behavior: 'smooth' });
  }

  updateActiveNavPill(sectionId);
}

function updateActiveNavPill(activeId) {
  const navButtons = document.querySelectorAll('#nav-links button');
  const pillIndicator = document.getElementById('nav-active-pill');

  navButtons.forEach(btn => {
    const isTarget = btn.getAttribute('data-nav') === activeId;
    btn.classList.toggle('text-[#F1F6F0]', isTarget);
    btn.classList.toggle('text-[var(--text-muted)]', !isTarget);
    if (isTarget && pillIndicator) {
      pillIndicator.style.width = btn.offsetWidth + 'px';
      pillIndicator.style.transform = `translateX(${btn.offsetLeft}px)`;
    }
  });
}

// ==========================================
// GSAP ENTRANCE & SCROLL TRIGGERS
// ==========================================
function initAnimations() {
  // Hero reveal timeline
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTl
    .fromTo('.hero-badge-reveal', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.1 })
    .fromTo('.hero-title-reveal', { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration: 1.0 }, '-=0.6')
    .fromTo('.hero-desc-reveal', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.7')
    .fromTo('.hero-cta-reveal', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .fromTo('.hero-stage-card', { opacity: 0, scale: 0.94, y: 25 }, { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'back.out(1.2)' }, '-=0.9');

  // Generic reveal on scroll elements
  gsap.utils.toArray('.reveal-on-scroll').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Animated stat counters
  ScrollTrigger.create({
    trigger: '#stats-strip',
    start: 'top 82%',
    onEnter: () => {
      document.querySelectorAll('[data-counter-target]').forEach(counter => {
        const targetValue = parseFloat(counter.getAttribute('data-counter-target'));
        const decimals = parseInt(counter.getAttribute('data-counter-decimals') || '0', 10);
        const suffix = counter.getAttribute('data-counter-suffix') || '';

        gsap.to({ val: 0 }, {
          val: targetValue,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: function () {
            counter.textContent = formatNumber(this.targets()[0].val, decimals) + suffix;
          }
        });
      });
    }
  });

  // Benchmark comparative bars reveal
  ScrollTrigger.create({
    trigger: '#benchmark-section',
    start: 'top 80%',
    onEnter: () => {
      document.querySelectorAll('[data-bar-target]').forEach(bar => {
        const targetWidth = bar.getAttribute('data-bar-target');
        gsap.to(bar, {
          width: targetWidth + '%',
          duration: 1.4,
          ease: 'power2.out'
        });
      });
    }
  });

  // Magnetic button micro-interaction
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' });

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) * 0.22;
      const relY = (e.clientY - rect.top - rect.height / 2) * 0.22;
      xTo(relX);
      yTo(relY);
    });

    btn.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

// ==========================================
// HERO INTERACTIVE STAGE & ROTATION
// ==========================================
function updateHeroStage(presetIndex) {
  activeHeroPresetIndex = presetIndex;
  const preset = DEMO_PRESETS[presetIndex];
  const stage = document.getElementById('hero-stage-render');
  const verdictCard = document.getElementById('hero-stage-verdict');
  const chipContainer = document.getElementById('hero-preset-chips');

  if (!stage || !verdictCard) return;

  // Update chips state
  if (chipContainer) {
    chipContainer.querySelectorAll('button').forEach((b, idx) => {
      const isSelected = idx === presetIndex;
      b.classList.toggle('bg-[var(--text-main)]', isSelected);
      b.classList.toggle('text-[var(--bg-primary)]', isSelected);
      b.classList.toggle('border-[var(--text-main)]', isSelected);
      b.classList.toggle('bg-[var(--bg-surface)]', !isSelected);
      b.classList.toggle('text-[var(--text-main)]', !isSelected);
      b.classList.toggle('border-[var(--border-subtle)]', !isSelected);
    });
  }

  // Trigger scanning sequence
  stage.classList.add('is-scanning');
  verdictCard.classList.add('opacity-0', 'translate-y-3');

  // Insert fresh SVG
  stage.innerHTML = `
    <div class="scanner-sweep"></div>
    <div class="reticle-bracket"></div>
    ${generateFruitSvg(preset[0], preset[1], preset[4], 'asli')}
  `;

  clearTimeout(heroRotationTimer);
  heroRotationTimer = setTimeout(() => {
    stage.classList.remove('is-scanning');
    const svgElem = stage.querySelector('svg');
    if (svgElem) {
      svgElem.setAttribute('data-view', 'cam');
      const camLayer = svgElem.querySelector('.layer-cam');
      if (camLayer) camLayer.classList.replace('opacity-0', 'opacity-100');
    }

    // Update verdict badge & score
    const isRot = preset[1];
    const badgeColor = isRot ? 'bg-[#FDE8E1] text-[#C9421A] dark:bg-[#361919] dark:text-[#F87171]' : 'bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]';
    const statusText = isRot ? 'Busuk' : 'Segar';
    const fruitTitle = `${FRUIT_NAMES[preset[0]]} ${statusText}`;

    verdictCard.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}">
          ${statusText}
        </span>
        <span class="text-xs text-[var(--text-muted)] font-mono">${formatPercent(preset[2])}</span>
      </div>
      <div class="text-xs font-bold text-[var(--text-main)]">${fruitTitle}</div>
    `;
    verdictCard.classList.remove('opacity-0', 'translate-y-3');
  }, 1000);
}

function initHeroPresets() {
  const chipContainer = document.getElementById('hero-preset-chips');
  if (!chipContainer) return;

  chipContainer.innerHTML = DEMO_PRESETS.map((p, idx) => `
    <button data-hero-preset="${idx}" class="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${idx === 0 ? 'bg-[var(--text-main)] text-[var(--bg-primary)] border-[var(--text-main)]' : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'}">
      ${FRUIT_NAMES[p[0]]} ${p[1] ? 'Busuk' : 'Segar'}
    </button>
  `).join('');

  chipContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hero-preset]');
    if (btn) {
      isHeroAutoRotating = false;
      updateHeroStage(parseInt(btn.getAttribute('data-hero-preset'), 10));
    }
  });

  updateHeroStage(0);

  // Auto rotation every 6 seconds if visible and user hasn't manually taken over
  setInterval(() => {
    if (isHeroAutoRotating && !document.hidden) {
      const nextIndex = (activeHeroPresetIndex + 1) % DEMO_PRESETS.length;
      updateHeroStage(nextIndex);
    }
  }, 6200);
}

// ==========================================
// ANALYSIS DROPZONE & PIPELINE EXECUTION
// ==========================================
function initAnalysisStudio() {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input');
  const cameraInput = document.getElementById('camera-input');
  const cameraTriggerBtn = document.getElementById('camera-btn');
  const analyzeActionBtn = document.getElementById('analyze-btn');
  const samplePillsContainer = document.getElementById('sample-analysis-pills');
  const previewContainer = document.getElementById('dropzone-preview');
  const apiStatusElem = document.getElementById('api-engine-status');
  const apiInput = document.getElementById('api-url-input');
  const apiConnectBtn = document.getElementById('api-connect-btn');

  // Render sample fruit test buttons
  if (samplePillsContainer) {
    samplePillsContainer.innerHTML = DEMO_PRESETS.map((p, idx) => `
      <button data-sample-idx="${idx}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--leaf-primary)] text-[var(--text-main)] transition-all cursor-pointer">
        <span class="w-1.5 h-1.5 rounded-full ${p[1] ? 'bg-[#C9421A]' : 'bg-[#1C6E3D]'}"></span>
        <span>${FRUIT_NAMES[p[0]]} ${p[1] ? 'Busuk' : 'Segar'}</span>
      </button>
    `).join('');

    samplePillsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sample-idx]');
      if (btn) {
        const idx = parseInt(btn.getAttribute('data-sample-idx'), 10);
        const preset = DEMO_PRESETS[idx];
        const syntheticResult = {
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
          date: getTodayString()
        };
        currentUploadedFile = null;
        renderDropzonePlaceholder();
        executeAnalysisSequence(syntheticResult);
      }
    });
  }

  function renderDropzonePlaceholder() {
    if (!previewContainer) return;
    previewContainer.innerHTML = `
      <div class="w-14 h-14 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-3">
        <i data-lucide="upload" class="w-7 h-7"></i>
      </div>
      <div class="text-base font-semibold text-[var(--text-main)] mb-1">Tarik dan jatuhkan foto buah di sini</div>
      <div class="text-xs text-[var(--text-muted)]">atau klik untuk memilih berkas dari perangkat (JPG / PNG maks 5 MB)</div>
    `;
    createIcons({
      icons: { Upload }
    });
  }

  function handleFileSelected(file) {
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
      currentUploadedFile = {
        name: file.name,
        size: file.size,
        url: reader.result
      };
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-sm mb-3">
            <img src="${reader.result}" alt="Pratinjau Foto" class="w-full h-full object-cover">
          </div>
          <div class="text-xs font-semibold text-[var(--text-main)]">${file.name} · ${(file.size / 1024).toFixed(0)} KB</div>
          <div class="text-[11px] text-[var(--text-muted)] mt-1">Klik atau seret untuk mengganti foto</div>
        `;
      }
      showToast('Foto berhasil dimuat. Siap dianalisis.', 'success');
    };
    reader.readAsDataURL(file);
  }

  if (fileInput) fileInput.addEventListener('change', (e) => handleFileSelected(e.target.files[0]));
  if (cameraInput) cameraInput.addEventListener('change', (e) => handleFileSelected(e.target.files[0]));
  if (cameraTriggerBtn && cameraInput) cameraTriggerBtn.addEventListener('click', () => cameraInput.click());

  if (dropzone) {
    ['dragover', 'dragenter'].forEach(ev => dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('border-[var(--leaf-primary)]', 'bg-[var(--leaf-soft)]');
    }));
    ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-[var(--leaf-primary)]', 'bg-[var(--leaf-soft)]');
    }));
    dropzone.addEventListener('drop', (e) => handleFileSelected(e.dataTransfer.files[0]));
    dropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && fileInput) fileInput.click();
    });
  }

  // ML Service connection handler
  function updateEngineStatusText() {
    if (!apiStatusElem || !apiInput) return;
    apiInput.value = mlApiEndpoint;
    if (mlApiEndpoint) {
      apiStatusElem.innerHTML = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#1C6E3D] dark:bg-[#52D487]"></span> Terhubung
        </span>
        <span>Inferensi via server eksternal: <b>${mlApiEndpoint}</b></span>
      `;
    } else {
      apiStatusElem.innerHTML = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3DB] text-[#EFA018] dark:bg-[#302611] dark:text-[#FBBF24]">
          Mode Komputasi Browser
        </span>
        <span>Segmentasi warna & tekstur dijalankan langsung di browser Anda secara privat.</span>
      `;
    }
  }

  if (apiConnectBtn && apiInput) {
    apiConnectBtn.addEventListener('click', async () => {
      const url = apiInput.value.trim().replace(/\/$/, '');
      if (!url) {
        mlApiEndpoint = '';
        try { localStorage.removeItem('fs_api_endpoint'); } catch (e) {}
        updateEngineStatusText();
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

        mlApiEndpoint = url;
        try { localStorage.setItem('fs_api_endpoint', url); } catch (e) {}
        updateEngineStatusText();
        showToast('Berhasil terhubung ke ML Service!', 'success');
      } catch (err) {
        showToast('Gagal menghubungi endpoint. Periksa apakah server backend aktif.', 'error');
      }
    });
  }

  // Analyze button trigger
  if (analyzeActionBtn) {
    analyzeActionBtn.addEventListener('click', async () => {
      if (!currentUploadedFile) {
        showToast('Silakan pilih foto buah terlebih dahulu atau gunakan contoh preset.');
        return;
      }

      const dropzoneBox = document.getElementById('upload-dropzone');
      if (dropzoneBox) dropzoneBox.classList.add('is-scanning');

      try {
        const imgElem = await loadImageElement(currentUploadedFile.url);
        let analysisResult;

        if (mlApiEndpoint) {
          try {
            analysisResult = await fetchPredictionFromApi(imgElem, currentUploadedFile);
          } catch (apiErr) {
            showToast('ML Service tidak merespons, beralih ke engine browser internal.');
            analysisResult = await runBrowserDetection(imgElem, currentUploadedFile);
          }
        } else {
          analysisResult = await runBrowserDetection(imgElem, currentUploadedFile);
        }

        executeAnalysisSequence(analysisResult);
      } catch (e) {
        if (dropzoneBox) dropzoneBox.classList.remove('is-scanning');
        showToast('Gagal memproses gambar. Coba gunakan foto lain.', 'error');
      }
    });
  }

  renderDropzonePlaceholder();
  updateEngineStatusText();
}

async function runBrowserDetection(imgElem, fileObj) {
  const res = analyzeImageLocally(imgElem);
  return {
    id: Date.now(),
    ...res,
    img: fileObj.url,
    src: 'browser',
    model: 'analisis-warna (internal)',
    date: getTodayString()
  };
}

async function fetchPredictionFromApi(imgElem, fileObj) {
  const blob = await (await fetch(fileObj.url)).blob();
  const formData = new FormData();
  formData.append('image', blob, fileObj.name || 'foto.jpg');

  const response = await fetch(mlApiEndpoint.replace(/\/$/, '') + '/v1/predict', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('API Prediction failed');
  const json = await response.json();
  const labelIndex = MODEL_LABELS.indexOf(json.label);
  const ft = json.features || {};
  const defectRatio = +(ft.rasio_defek || 0);
  const formatBase64 = (b64) => b64 ? (b64.startsWith('data:') ? b64 : 'data:image/png;base64,' + b64) : null;

  return {
    id: Date.now(),
    fruit: FRUIT_KEYS[labelIndex >> 1],
    rot: labelIndex & 1,
    conf: json.confidence,
    n: ft.jumlah_bercak || 0,
    rasio: Math.round(defectRatio <= 1 ? defectRatio * 100 : defectRatio),
    loc: ft.lokasi_bercak || '–',
    jw: ft.jarak_warna ?? 0,
    tk: ft.tekstur ?? 0,
    p: MODEL_LABELS.map(l => (json.probs && json.probs[l]) || 0),
    img: fileObj.url,
    cam: formatBase64(json.images && json.images.gradcam_overlay),
    msk: formatBase64(json.images && json.images.defect_mask),
    ar: imgElem.naturalWidth / imgElem.naturalHeight,
    ex: json.explanation,
    ms: json.inference_ms || 0,
    src: 'api',
    model: (json.model && json.model.name) || 'mobilenetv3_external',
    date: getTodayString()
  };
}

async function executeAnalysisSequence(result) {
  const pipelineSteps = document.querySelectorAll('#pipeline-indicator-steps > div');
  const dropzoneBox = document.getElementById('upload-dropzone');

  if (dropzoneBox) dropzoneBox.classList.add('is-scanning');

  // Stagger pipeline steps highlight
  pipelineSteps.forEach((step, idx) => {
    step.classList.remove('bg-[var(--leaf-primary)]', 'text-[#FFF]');
    step.classList.add('bg-[var(--bg-surface)]', 'text-[var(--text-muted)]');
    setTimeout(() => {
      step.classList.remove('bg-[var(--bg-surface)]', 'text-[var(--text-muted)]');
      step.classList.add('bg-[var(--leaf-primary)]', 'text-[#FFF]');
    }, idx * 320);
  });

  setTimeout(async () => {
    if (dropzoneBox) dropzoneBox.classList.remove('is-scanning');
    currentResult = result;

    // Save to history if checkbox is checked
    const saveCheck = document.getElementById('save-history-check');
    if (!saveCheck || saveCheck.checked) {
      let thumbnail = null;
      if (result.img) {
        try {
          const img = await loadImageElement(result.img);
          const c = document.createElement('canvas');
          const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          thumbnail = c.toDataURL('image/jpeg', 0.7);
        } catch (e) {}
      }
      historyList.unshift({
        ...result,
        img: null,
        cam: null,
        msk: null,
        thumb: thumbnail
      });
      setStoredHistory(historyList);
      renderHistoryList();
    }

    // Render results view and scroll smoothly to it
    renderResultsView(result);
    navigateToSection('section-hasil');

    // Confetti celebration if classified fresh with high confidence
    if (!result.rot && result.conf >= 0.88) {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#1C6E3D', '#52D487', '#EFA018', '#FFF']
      });
    }

    showToast('Analisis selesai! Menampilkan hasil.', 'success');
  }, 1400);
}

// ==========================================
// RESULTS INSPECTOR VIEW
// ==========================================
function renderResultsView(res) {
  const resultsContainer = document.getElementById('results-content-box');
  if (!resultsContainer) return;

  const isLowConfidence = res.conf < 0.7;
  const isRot = res.rot;
  const badgeClass = isLowConfidence
    ? 'bg-[#FEF3DB] text-[#EFA018] dark:bg-[#302611] dark:text-[#FBBF24]'
    : isRot
    ? 'bg-[#FDE8E1] text-[#C9421A] dark:bg-[#361919] dark:text-[#F87171]'
    : 'bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]';

  const badgeIcon = isLowConfidence ? 'alert-triangle' : isRot ? 'x' : 'check';
  const badgeLabel = isLowConfidence ? 'Kurang Yakin (<70%)' : isRot ? 'Busuk' : 'Segar';
  const targetClassIndex = FRUIT_KEYS.indexOf(res.fruit) * 2 + isRot;

  resultsContainer.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column: Visual Inspector Stage -->
      <div class="lg:col-span-5 flex flex-col items-center">
        <div class="surface-card w-full p-4 relative overflow-hidden">
          <div id="inspector-stage" class="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#ECE7DC] dark:bg-[#1A281F] flex items-center justify-center">
            ${res.img ? `
              <img id="inspector-base-img" src="${res.img}" alt="Foto Asli" class="absolute inset-0 w-full h-full object-contain">
              ${res.cam ? `<img id="inspector-cam-img" src="${res.cam}" alt="Grad-CAM" class="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 pointer-events-none">` : ''}
              ${res.msk ? `<img id="inspector-mask-img" src="${res.msk}" alt="Area Cacat" class="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 pointer-events-none">` : ''}
            ` : generateFruitSvg(res.fruit, res.rot, res.n, 'asli')}
            <div class="reticle-bracket"></div>
          </div>

          <!-- View Switcher Tabs -->
          <div class="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-3">
            <div class="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
              <span>Lapisan Visualisasi</span>
              <span id="layer-active-name" class="font-bold text-[var(--text-main)]">Foto Asli</span>
            </div>
            <div id="view-layer-buttons" class="grid grid-cols-3 gap-2 bg-[var(--bg-secondary)] p-1 rounded-xl">
              <button data-layer="asli" class="py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm cursor-pointer transition-all">Foto Asli</button>
              <button data-layer="cam" class="py-2 px-3 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-all">Grad-CAM</button>
              <button data-layer="mask" class="py-2 px-3 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-all">Area Cacat</button>
            </div>

            <!-- Heatmap Opacity Slider -->
            <div class="flex items-center gap-3 pt-1">
              <span class="text-xs text-[var(--text-muted)] whitespace-nowrap">Intensitas:</span>
              <input type="range" id="layer-opacity-slider" min="20" max="100" value="100" class="flex-1 accent-[var(--leaf-primary)] cursor-pointer">
              <span id="layer-opacity-val" class="text-xs font-mono text-[var(--text-dim)]">100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Diagnostic & Analytical Report -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        <div class="surface-card p-6 sm:p-8">
          <!-- Header Badge & Title -->
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${badgeClass}">
              <i data-lucide="${badgeIcon}" class="w-3.5 h-3.5"></i>
              <span>${badgeLabel}</span>
            </div>
            <div class="text-xs text-[var(--text-dim)] font-mono">
              Model: <span class="font-bold text-[var(--text-main)]">${res.model}</span> ${res.ms ? `(${res.ms} ms)` : ''}
            </div>
          </div>

          <h2 class="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-main)] mb-3">
            ${getDiagnosisTitle(res)}
          </h2>

          <!-- Radial Confidence & Score Dial -->
          <div class="flex items-center gap-6 my-6 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div class="relative w-24 h-24 flex-none">
              <svg viewBox="0 0 120 120" class="w-full h-full radial-meter">
                <circle cx="60" cy="60" r="52" class="radial-meter-bg"/>
                <circle id="radial-progress-circle" cx="60" cy="60" r="52" class="radial-meter-fg" stroke="${isLowConfidence ? 'var(--citrus-accent)' : isRot ? 'var(--rot-primary)' : 'var(--leaf-primary)'}"/>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center font-editorial text-xl font-bold text-[var(--text-main)]">
                <span id="confidence-counter-num">0%</span>
              </div>
            </div>
            <div>
              <div class="text-xs uppercase tracking-wider text-[var(--text-dim)] font-bold mb-0.5">Tingkat Keyakinan</div>
              <div class="text-sm font-semibold text-[var(--text-main)] mb-1">${formatPercent(res.conf)} akurasi estimasi</div>
              <p class="text-xs text-[var(--text-muted)] leading-relaxed">${getExplanationText(res)}</p>
            </div>
          </div>

          <!-- 6-Class Probability Bars -->
          <div class="mb-6">
            <div class="text-xs uppercase tracking-wider text-[var(--text-dim)] font-bold mb-3">Probabilitas 6 Kelas Model</div>
            <div class="flex flex-col gap-2.5">
              ${res.p.map((prob, idx) => {
                const label = MODEL_LABELS[idx].replace('_', ' ');
                const isWinner = idx === targetClassIndex;
                const barColor = isWinner
                  ? (isLowConfidence ? 'bg-[var(--citrus-accent)]' : isRot ? 'bg-[var(--rot-primary)]' : 'bg-[var(--leaf-primary)]')
                  : 'bg-[var(--border-subtle)]';
                return `
                  <div class="flex items-center gap-3 text-xs">
                    <span class="w-28 text-[var(--text-muted)] capitalize truncate ${isWinner ? 'font-bold text-[var(--text-main)]' : ''}">${label}</span>
                    <div class="flex-1 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <div class="h-full rounded-full ${barColor} transition-all duration-1000" style="width: 0%" data-result-bar="${Math.max(prob * 100, 1)}"></div>
                    </div>
                    <span class="w-12 text-right font-mono text-[var(--text-dim)] ${isWinner ? 'font-bold text-[var(--text-main)]' : ''}">${formatPercent(prob)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Measured Bio-Optical Properties Grid -->
          <div class="mb-6 pt-5 border-t border-[var(--border-subtle)]">
            <div class="text-xs uppercase tracking-wider text-[var(--text-dim)] font-bold mb-3">Metrik Bio-Optik Terukur</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div class="text-[11px] text-[var(--text-muted)]">Rasio Defek</div>
                <div class="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5">${res.rasio}%</div>
              </div>
              <div class="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div class="text-[11px] text-[var(--text-muted)]">Jumlah Bercak</div>
                <div class="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5">${res.n} titik</div>
              </div>
              <div class="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div class="text-[11px] text-[var(--text-muted)]">Lokasi Anomali</div>
                <div class="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5 capitalize">${res.loc}</div>
              </div>
              <div class="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <div class="text-[11px] text-[var(--text-muted)]">Varian Tekstur</div>
                <div class="text-base font-bold font-editorial text-[var(--text-main)] mt-0.5">${res.tk}</div>
              </div>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-[var(--border-subtle)] no-print">
            <div class="flex items-center gap-2">
              <button id="copy-summary-btn" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] transition-all cursor-pointer">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Salin Ringkasan</span>
              </button>
              <button id="print-report-btn" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] transition-all cursor-pointer">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>Cetak PDF</span>
              </button>
            </div>
            <button data-scroll-to="section-analisis" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>Analisis Foto Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  createIcons({
    icons: { Check, X, AlertTriangle, Copy, Printer, RefreshCw }
  });

  // Animate Radial Dial & Number
  setTimeout(() => {
    const circle = document.getElementById('radial-progress-circle');
    const counter = document.getElementById('confidence-counter-num');
    if (circle) {
      circle.style.strokeDashoffset = 326.7 * (1 - res.conf);
    }
    if (counter) {
      gsap.to({ val: 0 }, {
        val: res.conf * 100,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: function () {
          counter.textContent = this.targets()[0].val.toFixed(1).replace('.', ',') + '%';
        }
      });
    }

    // Animate Result Bars
    document.querySelectorAll('[data-result-bar]').forEach(bar => {
      bar.style.width = bar.getAttribute('data-result-bar') + '%';
    });
  }, 100);

  // Inspector Layer Switcher Logic
  const layerButtons = document.querySelectorAll('#view-layer-buttons button');
  const opacitySlider = document.getElementById('layer-opacity-slider');
  const opacityLabel = document.getElementById('layer-opacity-val');
  const layerNameLabel = document.getElementById('layer-active-name');
  const stage = document.getElementById('inspector-stage');

  layerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const layer = btn.getAttribute('data-layer');
      currentInspectionView = layer;

      layerButtons.forEach(b => {
        const isSelected = b === btn;
        b.classList.toggle('bg-[var(--bg-surface)]', isSelected);
        b.classList.toggle('text-[var(--text-main)]', isSelected);
        b.classList.toggle('shadow-sm', isSelected);
        b.classList.toggle('text-[var(--text-muted)]', !isSelected);
      });

      if (layerNameLabel) {
        layerNameLabel.textContent = layer === 'asli' ? 'Foto Asli' : layer === 'cam' ? 'Grad-CAM' : 'Area Cacat';
      }

      // If SVG
      const svg = stage.querySelector('svg');
      if (svg) {
        svg.setAttribute('data-view', layer);
        const camL = svg.querySelector('.layer-cam');
        const maskL = svg.querySelector('.layer-mask');
        if (camL) camL.classList.toggle('opacity-100', layer === 'cam');
        if (camL) camL.classList.toggle('opacity-0', layer !== 'cam');
        if (maskL) maskL.classList.toggle('opacity-100', layer === 'mask');
        if (maskL) maskL.classList.toggle('opacity-0', layer !== 'mask');
      }

      // If real uploaded image
      const camImg = document.getElementById('inspector-cam-img');
      const maskImg = document.getElementById('inspector-mask-img');
      if (camImg) camImg.classList.toggle('opacity-100', layer === 'cam');
      if (maskImg) maskImg.classList.toggle('opacity-100', layer === 'mask');
    });
  });

  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (opacityLabel) opacityLabel.textContent = val + '%';
      const camImg = document.getElementById('inspector-cam-img');
      const maskImg = document.getElementById('inspector-mask-img');
      const opacityFrac = val / 100;
      if (camImg) camImg.style.opacity = currentInspectionView === 'cam' ? opacityFrac : 0;
      if (maskImg) maskImg.style.opacity = currentInspectionView === 'mask' ? opacityFrac : 0;
    });
  }

  // Copy Summary handler
  const copyBtn = document.getElementById('copy-summary-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = `${getDiagnosisTitle(res)} (Keyakinan: ${formatPercent(res.conf)}). ${getExplanationText(res)}`;
      navigator.clipboard?.writeText(text).then(
        () => showToast('Ringkasan berhasil disalin ke clipboard!', 'success'),
        () => showToast('Gagal menyalin ringkasan.')
      );
    });
  }

  // Print PDF handler
  const printBtn = document.getElementById('print-report-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  // Retain internal navigation for new analysis
  const newAnalysisBtn = resultsContainer.querySelector('[data-scroll-to="section-analisis"]');
  if (newAnalysisBtn) {
    newAnalysisBtn.addEventListener('click', () => navigateToSection('section-analisis'));
  }
}

// ==========================================
// HISTORY JOURNAL
// ==========================================
function renderHistoryList() {
  const container = document.getElementById('history-cards-container');
  const countBadge = document.getElementById('history-count-badge');
  const searchInput = document.getElementById('history-search-input');
  const fruitFilter = document.getElementById('history-fruit-filter');
  const statusFilter = document.getElementById('history-status-filter');
  const clearAllBtn = document.getElementById('clear-history-btn');

  if (!container) return;

  const searchQuery = (searchInput?.value || '').toLowerCase().trim();
  const selectedFruit = fruitFilter?.value || '';
  const selectedStatus = statusFilter?.value || '';

  const filtered = historyList.filter(item => {
    const title = getDiagnosisTitle(item).toLowerCase();
    const matchesSearch = !searchQuery || title.includes(searchQuery);
    const matchesFruit = !selectedFruit || item.fruit === selectedFruit;
    const matchesStatus = !selectedStatus || (selectedStatus === 'r' ? item.rot : !item.rot);
    return matchesSearch && matchesFruit && matchesStatus;
  });

  if (countBadge) {
    countBadge.textContent = `${historyList.length} tersimpan di perangkat ini`;
  }
  if (clearAllBtn) {
    clearAllBtn.style.display = historyList.length > 0 ? 'inline-flex' : 'none';
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full surface-card p-12 text-center flex flex-col items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-dim)] mb-4">
          <i data-lucide="file-text" class="w-8 h-8"></i>
        </div>
        <div class="font-editorial text-2xl font-bold text-[var(--text-main)] mb-1">
          ${historyList.length === 0 ? 'Belum ada riwayat analisis' : 'Tidak ada riwayat yang cocok'}
        </div>
        <p class="text-xs text-[var(--text-muted)] max-w-sm mb-6">
          ${historyList.length === 0 ? 'Setiap foto buah yang Anda klasifikasikan akan otomatis tersimpan di peramban ini.' : 'Coba gunakan kata kunci pencarian lain atau setel ulang filter.'}
        </p>
        <button data-scroll-to="section-analisis" class="px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer">
          Analisis Foto Sekarang
        </button>
      </div>
    `;
    createIcons({ icons: { FileText } });
    const cta = container.querySelector('[data-scroll-to="section-analisis"]');
    if (cta) cta.addEventListener('click', () => navigateToSection('section-analisis'));
    return;
  }

  container.innerHTML = filtered.map(item => {
    const isRot = item.rot;
    const badgeColor = isRot ? 'bg-[#FDE8E1] text-[#C9421A] dark:bg-[#361919] dark:text-[#F87171]' : 'bg-[#E6F3EA] text-[#1C6E3D] dark:bg-[#142E1F] dark:text-[#52D487]';
    return `
      <div class="surface-card-interactive p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-3.5 mb-3">
            <div class="w-16 h-16 rounded-xl overflow-hidden bg-[#ECE7DC] dark:bg-[#1A281F] flex-none relative">
              ${item.thumb ? `<img src="${item.thumb}" alt="Thumb" class="w-full h-full object-cover">` : generateFruitSvg(item.fruit, item.rot, item.n, 'asli', true)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-bold text-[var(--text-main)] truncate">${getDiagnosisTitle(item)}</div>
              <div class="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">${item.date} · ${formatPercent(item.conf)}</div>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${badgeColor}">
                ${isRot ? 'Busuk' : 'Segar'}
              </span>
            </div>
          </div>
          <p class="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-4">
            ${getExplanationText(item)}
          </p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <button data-history-detail="${item.id}" class="text-xs font-semibold text-[var(--leaf-primary)] hover:underline cursor-pointer">Lihat Detail</button>
          <button data-history-delete="${item.id}" class="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[#C9421A] transition-all cursor-pointer" title="Hapus catatan">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  createIcons({ icons: { Trash2 } });

  // Event handlers for history cards
  container.querySelectorAll('[data-history-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-history-detail'), 10);
      const found = historyList.find(x => x.id === id);
      if (found) {
        currentResult = found.thumb ? { ...found, img: found.thumb, cam: null, msk: null } : found;
        renderResultsView(currentResult);
        navigateToSection('section-hasil');
      }
    });
  });

  container.querySelectorAll('[data-history-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-history-delete'), 10);
      historyList = historyList.filter(x => x.id !== id);
      setStoredHistory(historyList);
      renderHistoryList();
      showToast('Item berhasil dihapus dari riwayat.');
    });
  });
}

function initHistorySection() {
  const searchInput = document.getElementById('history-search-input');
  const fruitFilter = document.getElementById('history-fruit-filter');
  const statusFilter = document.getElementById('history-status-filter');
  const clearAllBtn = document.getElementById('clear-history-btn');

  [searchInput, fruitFilter, statusFilter].forEach(elem => {
    if (elem) elem.addEventListener('input', renderHistoryList);
  });

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat analisis dari perangkat ini?')) {
        historyList = [];
        setStoredHistory(historyList);
        renderHistoryList();
        showToast('Semua riwayat telah dibersihkan.');
      }
    });
  }

  renderHistoryList();
}

// ==========================================
// THEME SWITCHER & GLOBAL MICRO-INTERACTIONS
// ==========================================
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  const currentTheme = () => document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  toggleBtn.addEventListener('click', () => {
    const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('fs_theme', nextTheme);
    } catch (e) {}

    // Subtle button spin
    gsap.fromTo(toggleBtn, { rotate: 0 }, { rotate: 360, duration: 0.5, ease: 'back.out(1.5)' });
  });

  // Load saved theme preference
  try {
    const saved = localStorage.getItem('fs_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
}

function initRippleEffect() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.surface-card-interactive, .btn-magnetic, #nav-links button, #view-layer-buttons button');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-fx';
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ==========================================
// BOOTSTRAP APPLICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  createIcons({
    icons: {
      Leaf,
      Scan,
      Layers,
      Flame,
      Target,
      BarChart3,
      Clock,
      Check,
      X,
      AlertTriangle,
      Sliders,
      Upload,
      ShieldCheck,
      Sun,
      Moon,
      Sparkles,
      Camera,
      Activity,
      Cpu,
      ArrowRight,
      RefreshCw,
      Copy,
      Printer,
      ChevronRight,
      Share2,
      Trash2,
      Search,
      ExternalLink,
      HelpCircle,
      FileText
    }
  });

  initSmoothScroll();
  initThemeToggle();
  initRippleEffect();
  initHeroPresets();
  initAnalysisStudio();
  initHistorySection();
  initAnimations();

  // If page opens with an anchor hash
  if (window.location.hash) {
    const targetSection = window.location.hash.slice(1);
    setTimeout(() => navigateToSection(targetSection), 200);
  }
});

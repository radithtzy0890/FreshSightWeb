export type FruitType = 'apple' | 'banana' | 'orange';
export type Verdict = 'segar' | 'busuk' | 'ragu' | 'tidak_terdeteksi';
export type InspectionViewMode = 'asli' | 'cam' | 'mask';

export interface QualityCheck {
  light: 'ok' | 'dark' | 'glare';
  focus: 'ok' | 'blur';
  distance: 'ok' | 'far';
}

export interface AnalysisResult {
  id: number;
  fruit: FruitType;
  rot: 0 | 1;
  conf: number;
  verdict: Verdict;
  n: number;
  rasio: number;
  loc: string;
  jw: number;
  tk: number;
  p: number[];
  cam?: string | null;
  msk?: string | null;
  ar?: number;
  img?: string | null;
  thumb?: string | null;
  src: 'browser' | 'api' | 'contoh';
  model: string;
  ms?: number;
  date: string;
  ex?: string;
  fb?: boolean;
  quality?: QualityCheck;
  latencyMs?: number;
}

export type DemoPreset = [
  fruit: FruitType,
  isRotten: 0 | 1,
  confidence: number,
  defectRatio: number,
  spotCount: number,
  location: string,
  colorDistance: number,
  texture: number
];

export const VERDICT_STYLE: Record<
  Verdict,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    label: string;
    icon: string;
  }
> = {
  segar: {
    bg: 'rgba(0, 212, 164, 0.08)',
    border: 'rgba(0, 212, 164, 0.25)',
    text: '#047857',
    badgeBg: '#00D4A4',
    label: 'SEGAR',
    icon: 'Check',
  },
  busuk: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    text: '#B91C1C',
    badgeBg: '#EF4444',
    label: 'BUSUK',
    icon: 'X',
  },
  ragu: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    text: '#B45309',
    badgeBg: '#F59E0B',
    label: 'RAGU',
    icon: 'HelpCircle',
  },
  tidak_terdeteksi: {
    bg: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.25)',
    text: '#475569',
    badgeBg: '#64748B',
    label: 'TIDAK TERDETEKSI',
    icon: 'Ban',
  },
};

export function getVerdict(conf: number, rot: 0 | 1): Verdict {
  if (conf >= 0.80) return rot === 0 ? 'segar' : 'busuk';
  if (conf >= 0.60) return 'ragu';
  return 'ragu';
}

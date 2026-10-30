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
  { bg: string; icon: string; label: string; stripe: boolean; color: string }
> = {
  segar: { bg: '#00c68e', icon: 'Check', label: 'SEGAR', stripe: false, color: '#111' },
  busuk: { bg: '#ff4d4d', icon: 'X', label: 'BUSUK', stripe: true, color: '#111' },
  ragu: { bg: '#ffd000', icon: 'HelpCircle', label: 'RAGU', stripe: false, color: '#111' },
  tidak_terdeteksi: { bg: '#eeeeee', icon: 'Ban', label: 'TIDAK TERDETEKSI', stripe: true, color: '#111' },
};

export function getVerdict(conf: number, rot: 0 | 1): Verdict {
  if (conf >= 0.80) return rot === 0 ? 'segar' : 'busuk';
  if (conf >= 0.60) return 'ragu';
  return 'ragu';
}

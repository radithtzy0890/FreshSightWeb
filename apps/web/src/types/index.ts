export type FruitType = 'apple' | 'banana' | 'orange';
export type Verdict = 'segar' | 'busuk' | 'ragu' | 'tidak_terdeteksi';
export type InspectionViewMode = 'asli' | 'cam' | 'mask';

export interface QualityCheck {
  light: 'ok' | 'dark' | 'glare';
  focus: 'ok' | 'blur';
  distance: 'ok' | 'far';
  warnings?: string[];
}

export interface AnalysisResult {
  id: number;
  fruit: FruitType;
  rot: 0 | 1;
  conf: number;
  verdict: Verdict;
  isOod?: boolean;
  n: number;
  rasio: number;
  loc: string;
  jw: number;
  tk: number;
  p: number[];
  fruitCount?: number;
  cam?: string | null;
  msk?: string | null;
  ar?: number;
  img?: string | null;
  thumb?: string | null;
  src: 'api' | 'contoh';
  model: string;
  ms?: number;
  date: string;
  ex?: string;
  fb?: boolean;
  quality?: QualityCheck;
  latencyMs?: number;
  userVerified?: boolean;
  userCorrection?: string;
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

export function getVerdict(
  conf: number,
  rot: 0 | 1,
  isOod?: boolean,
  fruitCount?: number
): Verdict {
  if (isOod || fruitCount === 0) return 'tidak_terdeteksi';
  if ((fruitCount ?? 1) > 1) return 'ragu';
  if (conf >= 0.6) return rot === 0 ? 'segar' : 'busuk';
  return 'ragu';
}

export type ColorMode = 'threshold' | 'gradient';

export interface ColStats { min: number; max: number; mean: number }

const RED   = [248, 113, 113] as const;  // red-400
const MID   = [226, 232, 240] as const;  // slate-200  ("white" on dark bg)
const GREEN = [ 74, 222, 128] as const;  // emerald-400

export function computeStats(values: number[]): ColStats {
  if (!values.length) return { min: 0, max: 0, mean: 0 };
  const min  = Math.min(...values);
  const max  = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, mean };
}

export function gradientColor(value: number, { min, mean, max }: ColStats): string {
  if (max === min) return `rgb(${MID.join(',')})`;
  const [from, to, t] =
    value <= mean
      ? [RED,   MID,   mean === min ? 1 : (value - min)  / (mean - min)]
      : [MID,   GREEN, max  === mean ? 1 : (value - mean) / (max  - mean)];
  const rgb = [0, 1, 2].map(i =>
    Math.round(from[i] + (to[i] - from[i]) * Math.max(0, Math.min(1, t)))
  );
  return `rgb(${rgb.join(',')})`;
}

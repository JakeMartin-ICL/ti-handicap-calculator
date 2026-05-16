export type IncompleteMode = 'allow' | 'drop' | 'normalise' | 'normalise-all';
export type ExperienceLevel =
  | 'Beginner (Learning rules)'
  | 'Intermediate (Understands rules)'
  | 'Advanced (Understands rules and can play most races)'
  | 'Expert (Can play any race with ease)';

export interface Setup {
  playerCounts: number[];
  pointsTargets: Array<10 | 14>;
  unit: 1 | 0.5;
  incomplete: IncompleteMode;
  experienceLevels: ExperienceLevel[];
}

export interface GameRow {
  playerCount: number;
  pointsTarget: number;
  factionVPs: Array<{ faction: string; vp: number; experience: string | null }>;
}

export interface HandicapResult {
  adjustments: Record<string, number>;
  factionMeans: Record<string, number>;
  rawMean: number;
  overallMean: number;
  confidence: number;
  factionAppearances: Record<string, number>;
  factionWinRates: Record<string, number>;
  factionExpectedWinRates: Record<string, number>;
}

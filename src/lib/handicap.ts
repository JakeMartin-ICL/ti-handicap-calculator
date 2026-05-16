import Papa from 'papaparse';
import { GameRow, HandicapResult, IncompleteMode, ExperienceLevel } from '../types';

// Columns A=0, B=1 … AE=30
// Faction positions (1st–8th): F(5), I(8), L(11), O(14), R(17), U(20), X(23), AA(26)
// VP positions (1st–8th):      H(7), K(10), N(13), Q(16), T(19), W(22), Z(25), AC(28)
const FACTION_COLS     = [5, 8, 11, 14, 17, 20, 23, 26];
const EXPERIENCE_COLS  = [6, 9, 12, 15, 18, 21, 24, 27];
const VP_COLS          = [7, 10, 13, 16, 19, 22, 25, 28];
const PLAYER_COUNT_COL = 1;
const POINTS_TARGET_COL = 3;
const EXPANSIONS_COL = 30;
const MIN_GLOBAL_APPEARANCES = 10;

export function parseGameRows(rawRows: string[][]): GameRow[] {
  const games: GameRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.length <= EXPANSIONS_COL) continue;

    const expansions = row[EXPANSIONS_COL] ?? '';
    if (!expansions.includes('Prophecy of Kings')) continue;

    const playerCount = parseInt(row[PLAYER_COUNT_COL]);
    const pointsTarget = parseInt(row[POINTS_TARGET_COL]);
    if (isNaN(playerCount) || isNaN(pointsTarget)) continue;

    const factionVPs: Array<{ faction: string; vp: number; experience: string | null }> = [];
    for (let p = 0; p < 8; p++) {
      const faction = row[FACTION_COLS[p]]?.trim();
      const vp = parseFloat(row[VP_COLS[p]]);
      const experience = row[EXPERIENCE_COLS[p]]?.trim() || null;
      if (faction && faction.length > 0 && faction.toLowerCase() !== 'none' && !isNaN(vp)) {
        factionVPs.push({ faction, vp, experience });
      }
    }

    if (factionVPs.length > 0) {
      games.push({ playerCount, pointsTarget, factionVPs });
    }
  }

  return games;
}

function applyIncompleteMode(game: GameRow, mode: IncompleteMode): GameRow | null {
  const winningVP = Math.max(...game.factionVPs.map(e => e.vp));
  if (winningVP <= 0) return game;
  const isIncomplete = winningVP < game.pointsTarget;
  if (mode === 'allow') return game;
  if (mode === 'drop') return isIncomplete ? null : game;
  const shouldScale = mode === 'normalise-all' || (mode === 'normalise' && isIncomplete);
  if (!shouldScale) return game;
  const scale = game.pointsTarget / winningVP;
  return { ...game, factionVPs: game.factionVPs.map(e => ({ ...e, vp: e.vp * scale })) };
}

export function calculateHandicaps(
  games: GameRow[],
  playerCounts: number[],   // empty = no filter
  pointsTargets: number[],  // empty = no filter
  activeFactions: string[] | null = null,
  unit: number = 1,
  incomplete: IncompleteMode = 'allow',
  experienceLevels: ExperienceLevel[] = []
): HandicapResult {
  const empty: HandicapResult = {
    adjustments: {},
    factionMeans: {},
    rawMean: 0,
    overallMean: 0,
    confidence: 0,
    factionAppearances: {},
    factionWinRates: {},
    factionExpectedWinRates: {},
  };

  const filtered = games
    .filter(
      (g) =>
        (playerCounts.length === 0 || playerCounts.includes(g.playerCount)) &&
        (pointsTargets.length === 0 || pointsTargets.includes(g.pointsTarget))
    )
    .flatMap((g) => {
      const processed = applyIncompleteMode(g, incomplete);
      return processed ? [processed] : [];
    });

  // Collect VP lists, wins, and expected wins per faction across all filtered games
  const factionVPMap: Record<string, number[]> = {};
  const factionWinsMap: Record<string, number> = {};
  const factionExpWinsMap: Record<string, number> = {};
  for (const game of filtered) {
    const maxVP = Math.max(...game.factionVPs.map(e => e.vp));
    const entries = experienceLevels.length === 0
      ? game.factionVPs
      : game.factionVPs.filter(e => e.experience !== null && experienceLevels.includes(e.experience as ExperienceLevel));
    for (const { faction, vp } of entries) {
      if (!factionVPMap[faction]) factionVPMap[faction] = [];
      factionVPMap[faction].push(vp);
      factionWinsMap[faction] = (factionWinsMap[faction] ?? 0) + (vp === maxVP ? 1 : 0);
      factionExpWinsMap[faction] = (factionExpWinsMap[faction] ?? 0) + 1 / game.playerCount;
    }
  }

  // Rare factions are already stripped from game rows at load time — no second filter needed
  const factionMeans: Record<string, number> = {};
  const factionAppearances: Record<string, number> = {};
  for (const [faction, vps] of Object.entries(factionVPMap)) {
    factionMeans[faction] = vps.reduce((a, b) => a + b, 0) / vps.length;
    factionAppearances[faction] = vps.length;
  }

  // Restrict to caller-specified factions if provided
  let factions = Object.keys(factionMeans);
  if (activeFactions && activeFactions.length > 0) {
    factions = factions.filter((f) => activeFactions.includes(f));
  }

  if (factions.length === 0) return empty;

  const rawMean = factions.reduce((sum, f) => sum + factionMeans[f], 0) / factions.length;

  const adjustments: Record<string, number> = {};
  for (const f of factions) adjustments[f] = 0;

  for (let iter = 0; iter < 10; iter++) {
    const adjustedValues = factions.map((f) => factionMeans[f] + adjustments[f]);
    const adjustedMean = adjustedValues.reduce((a, b) => a + b, 0) / factions.length;

    let changed = false;
    for (const f of factions) {
      const adjusted = factionMeans[f] + adjustments[f];
      if (adjusted - adjustedMean > unit / 2) {
        adjustments[f] -= unit;
        changed = true;
      } else if (adjustedMean - adjusted > unit / 2) {
        adjustments[f] += unit;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const overallMean =
    factions.reduce((sum, f) => sum + factionMeans[f] + adjustments[f], 0) / factions.length;

  const resultMeans: Record<string, number> = {};
  const resultAppearances: Record<string, number> = {};
  const factionWinRates: Record<string, number> = {};
  const factionExpectedWinRates: Record<string, number> = {};
  for (const f of factions) {
    resultMeans[f] = factionMeans[f];
    resultAppearances[f] = factionAppearances[f];
    const apps = factionAppearances[f];
    factionWinRates[f] = apps > 0 ? (factionWinsMap[f] ?? 0) / apps : 0;
    factionExpectedWinRates[f] = apps > 0 ? (factionExpWinsMap[f] ?? 0) / apps : 0;
  }

  return { adjustments, factionMeans: resultMeans, rawMean, overallMean, confidence: filtered.length, factionAppearances: resultAppearances, factionWinRates, factionExpectedWinRates };
}

function stripRareFactions(games: GameRow[]): GameRow[] {
  const globalCounts: Record<string, number> = {};
  for (const game of games) {
    for (const { faction } of game.factionVPs) {
      globalCounts[faction] = (globalCounts[faction] ?? 0) + 1;
    }
  }
  const valid = new Set(
    Object.entries(globalCounts)
      .filter(([, n]) => n >= MIN_GLOBAL_APPEARANCES)
      .map(([f]) => f)
  );
  return games
    .map((game) => ({ ...game, factionVPs: game.factionVPs.filter(({ faction }) => valid.has(faction)) }))
    .filter((game) => game.factionVPs.length > 0);
}

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1bFNBZv8BtV6mDAhCg9MoFcCe-LPloqxRKRs2tnbJkEI/gviz/tq?tqx=out:csv';

export async function fetchGameData(): Promise<GameRow[]> {
  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return stripRareFactions(parseGameRows(data));
}

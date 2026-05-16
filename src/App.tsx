import { useState, useEffect, useMemo } from 'react';
import { fetchGameData, calculateHandicaps } from './lib/handicap';
import { GameRow, Setup } from './types';
import { ColorMode } from './lib/colorScale';
import Header from './components/Header';
import GameFilter from './components/GameFilter';
import FactionPicker from './components/FactionPicker';
import HandicapTable from './components/HandicapTable';
import MergedHandicapTable from './components/MergedHandicapTable';

const DEFAULT_SETUP: Setup = { playerCounts: [6], pointsTargets: [10], unit: 1, incomplete: 'allow', experienceLevels: [] };

function ColorModeToggle({ colorMode, onChange }: { colorMode: ColorMode; onChange: (m: ColorMode) => void }) {
  return (
    <div className="flex gap-1">
      {(['threshold', 'gradient'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${
            colorMode === m
              ? 'bg-space-600 border-space-400 text-slate-300'
              : 'border-space-500 text-slate-600 hover:text-slate-400 hover:border-space-400'
          }`}
        >
          {m === 'threshold' ? 'Threshold' : 'Gradient'}
        </button>
      ))}
    </div>
  );
}

function patch<K extends keyof Setup>(
  setter: React.Dispatch<React.SetStateAction<Setup>>,
  key: K,
  value: Setup[K]
) {
  setter((prev) => ({ ...prev, [key]: value }));
}

export default function App() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [primary, setPrimary] = useState<Setup>(DEFAULT_SETUP);
  const [compare, setCompare] = useState<Setup | null>(null);
  const [mergedView, setMergedView] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  const [showWinRate, setShowWinRate] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('threshold');
  const [selectedFactions, setSelectedFactions] = useState<(string | null)[]>(Array(6).fill(null));

  const isComparing = compare !== null;

  useEffect(() => {
    fetchGameData()
      .then((rows) => { setGames(rows); setLoading(false); })
      .catch(() => { setError('Failed to load game data. Check your connection and refresh.'); setLoading(false); });
  }, []);

  const seatCount = useMemo(() => {
    const all = [...primary.playerCounts, ...(compare?.playerCounts ?? [])];
    return all.length > 0 ? Math.max(...all) : 8;
  }, [primary.playerCounts, compare]);

  useEffect(() => {
    setSelectedFactions((prev) => {
      if (seatCount === prev.length) return prev;
      if (seatCount > prev.length) return [...prev, ...Array(seatCount - prev.length).fill(null)];
      return prev.slice(0, seatCount);
    });
  }, [seatCount]);

  const allFactions = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const game of games) {
      for (const { faction } of game.factionVPs) seen.add(faction);
    }
    return [...seen].sort();
  }, [games]);

  const activeFactions = useMemo<string[]>(
    () => selectedFactions.filter(Boolean) as string[],
    [selectedFactions]
  );

  const active = activeFactions.length > 0 ? activeFactions : null;

  const primaryResult = useMemo(() => {
    if (!games.length) return null;
    return calculateHandicaps(games, primary.playerCounts, primary.pointsTargets, active, primary.unit, primary.incomplete, primary.experienceLevels);
  }, [games, primary, active]);

  const compareResult = useMemo(() => {
    if (!games.length || !compare) return null;
    return calculateHandicaps(games, compare.playerCounts, compare.pointsTargets, active, compare.unit, compare.incomplete, compare.experienceLevels);
  }, [games, compare, active]);

  const handleFactionChange = (i: number, faction: string | null) =>
    setSelectedFactions((prev) => { const n = [...prev]; n[i] = faction; return n; });

  const factionPicker = allFactions.length > 0 ? (
    <FactionPicker
      playerCount={seatCount}
      factions={allFactions}
      selectedFactions={selectedFactions}
      onFactionChange={handleFactionChange}
    />
  ) : (
    <div className="card">
      <div className="card-header"><span className="card-title">Faction Seats</span></div>
      <div className="flex items-center justify-center h-24">
        <span className="text-slate-600 text-sm animate-pulse">Loading factions…</span>
      </div>
    </div>
  );

  // Wide layout only when comparing side-by-side
  const containerWidth =
    isComparing && !mergedView ? (showWinRate ? 'max-w-[130rem]' : 'max-w-[100rem]')
    : showWinRate              ? 'max-w-6xl'
    :                            'max-w-4xl';

  return (
    <div className="min-h-screen">
      <div className={`${containerWidth} mx-auto px-4 pb-16`}>
        <Header loading={loading} error={error} gameCount={games.length} />

        {!isComparing ? (
          /* ── Single layout ── */
          <>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <GameFilter
                playerCounts={primary.playerCounts}
                pointsTargets={primary.pointsTargets}
                unit={primary.unit}
                incomplete={primary.incomplete}
                experienceLevels={primary.experienceLevels}
                onPlayerCountsChange={(v) => patch(setPrimary, 'playerCounts', v)}
                onPointsTargetsChange={(v) => patch(setPrimary, 'pointsTargets', v)}
                onUnitChange={(v) => patch(setPrimary, 'unit', v)}
                onIncompleteModeChange={(v) => patch(setPrimary, 'incomplete', v)}
                onExperienceLevelsChange={(v) => patch(setPrimary, 'experienceLevels', v)}
              />
              {factionPicker}
            </div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <ColorModeToggle colorMode={colorMode} onChange={setColorMode} />
                <div className="w-px h-4 bg-space-500 mx-1" />
                <button
                  onClick={() => setShowWinRate(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${showWinRate ? 'bg-space-600 border-space-400 text-slate-300' : 'border-space-500 text-slate-600 hover:text-slate-400 hover:border-space-400'}`}
                >
                  Win rate
                </button>
              </div>
              <button
                onClick={() => { setCompare({ ...primary }); setMergedView(true); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-gold-400 border border-space-400 hover:border-gold-600 rounded px-3 py-1.5 transition-colors duration-150"
              >
                <span className="text-sm leading-none">⊕</span> Compare setup
              </button>
            </div>
            <HandicapTable
              result={primaryResult}
              playerCounts={primary.playerCounts}
              pointsTargets={primary.pointsTargets}
              activeFactionCount={activeFactions.length}
              loading={loading}
              colorMode={colorMode}
              showWinRate={showWinRate}
            />
          </>
        ) : (
          /* ── Compare layout ── */
          <>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <GameFilter
                label="A"
                playerCounts={primary.playerCounts}
                pointsTargets={primary.pointsTargets}
                unit={primary.unit}
                incomplete={primary.incomplete}
                experienceLevels={primary.experienceLevels}
                onPlayerCountsChange={(v) => patch(setPrimary, 'playerCounts', v)}
                onPointsTargetsChange={(v) => patch(setPrimary, 'pointsTargets', v)}
                onUnitChange={(v) => patch(setPrimary, 'unit', v)}
                onIncompleteModeChange={(v) => patch(setPrimary, 'incomplete', v)}
                onExperienceLevelsChange={(v) => patch(setPrimary, 'experienceLevels', v)}
              />
              <GameFilter
                label="B"
                showClose
                onClose={() => setCompare(null)}
                playerCounts={compare.playerCounts}
                pointsTargets={compare.pointsTargets}
                unit={compare.unit}
                incomplete={compare.incomplete}
                experienceLevels={compare.experienceLevels}
                onPlayerCountsChange={(v) => patch(setCompare as React.Dispatch<React.SetStateAction<Setup>>, 'playerCounts', v)}
                onPointsTargetsChange={(v) => patch(setCompare as React.Dispatch<React.SetStateAction<Setup>>, 'pointsTargets', v)}
                onUnitChange={(v) => patch(setCompare as React.Dispatch<React.SetStateAction<Setup>>, 'unit', v)}
                onIncompleteModeChange={(v) => patch(setCompare as React.Dispatch<React.SetStateAction<Setup>>, 'incomplete', v)}
                onExperienceLevelsChange={(v) => patch(setCompare as React.Dispatch<React.SetStateAction<Setup>>, 'experienceLevels', v)}
              />
            </div>
            <div className="mb-4">{factionPicker}</div>

            {/* View toggle */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <ColorModeToggle colorMode={colorMode} onChange={setColorMode} />
                <div className="w-px h-4 bg-space-500 mx-1" />
                <button
                  onClick={() => setShowWinRate(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${showWinRate ? 'bg-space-600 border-space-400 text-slate-300' : 'border-space-500 text-slate-600 hover:text-slate-400 hover:border-space-400'}`}
                >
                  Win rate
                </button>
              </div>
              <div className="flex gap-2">
                {mergedView && (
                  <button
                    onClick={() => setShowDiff(d => !d)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${showDiff ? 'bg-space-600 border-space-400 text-slate-300' : 'border-space-500 text-slate-600 hover:text-slate-400 hover:border-space-400'}`}
                  >
                    Show Δ A–B
                  </button>
                )}
                {(['merged', 'side-by-side'] as const).map((mode) => {
                  const active = (mode === 'merged') === mergedView;
                  return (
                    <button
                      key={mode}
                      onClick={() => setMergedView(mode === 'merged')}
                      className={`text-xs px-3 py-1.5 rounded border transition-colors duration-150 ${active ? 'bg-space-600 border-space-400 text-slate-300' : 'border-space-500 text-slate-600 hover:text-slate-400 hover:border-space-400'}`}
                    >
                      {mode === 'merged' ? 'Merged' : 'Side by side'}
                    </button>
                  );
                })}
              </div>
            </div>

            {mergedView ? (
              <MergedHandicapTable
                resultA={primaryResult}
                resultB={compareResult}
                playerCountsA={primary.playerCounts}
                pointsTargetsA={primary.pointsTargets}
                playerCountsB={compare.playerCounts}
                pointsTargetsB={compare.pointsTargets}
                activeFactionCount={activeFactions.length}
                loading={loading}
                colorMode={colorMode}
                showDiff={showDiff}
                showWinRate={showWinRate}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <HandicapTable
                  label="A"
                  result={primaryResult}
                  playerCounts={primary.playerCounts}
                  pointsTargets={primary.pointsTargets}
                  activeFactionCount={activeFactions.length}
                  loading={loading}
                  colorMode={colorMode}
                  showWinRate={showWinRate}
                />
                <HandicapTable
                  label="B"
                  result={compareResult}
                  playerCounts={compare.playerCounts}
                  pointsTargets={compare.pointsTargets}
                  activeFactionCount={activeFactions.length}
                  loading={loading}
                  colorMode={colorMode}
                  showWinRate={showWinRate}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { HandicapResult } from '../types';
import { ColorMode, ColStats, computeStats, gradientColor } from '../lib/colorScale';

interface Props {
  result: HandicapResult | null;
  playerCounts: number[];
  pointsTargets: number[];
  activeFactionCount: number;
  loading: boolean;
  label?: string;
  colorMode: ColorMode;
  showWinRate: boolean;
}

type SortCol = 'faction' | 'adj' | 'mean' | 'delta' | 'adjMean' | 'adjDelta' | 'appearances' | 'winRate' | 'winRateDelta';
type SortDir = 'asc' | 'desc';

function AdjBadge({ adj }: { adj: number }) {
  if (adj === 0) {
    return <span className="text-slate-600 text-base font-mono select-none">—</span>;
  }
  const pos = adj > 0;
  const label = `${pos ? '+' : ''}${Number.isInteger(adj) ? adj : adj.toFixed(1)}`;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded text-sm font-bold font-mono
        ${pos
          ? 'bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-800/60'
          : 'bg-red-900/40 text-red-400 ring-1 ring-red-900/60'
        }`}
    >
      {label}
    </span>
  );
}

function Delta({ value }: { value: number }) {
  const sign = value >= 0 ? '+' : '';
  const color = value > 0.05
    ? 'text-emerald-400/70'
    : value < -0.05
    ? 'text-red-400/70'
    : 'text-slate-600';
  return (
    <span className={`text-xs font-mono tabular-nums ${color}`}>
      {sign}{value.toFixed(2)}
    </span>
  );
}

function GradCell({ value, stats, fmt }: { value: number; stats: ColStats; fmt: (v: number) => string }) {
  return (
    <span className="text-sm font-mono tabular-nums font-semibold" style={{ color: gradientColor(value, stats) }}>
      {fmt(value)}
    </span>
  );
}

function WinRate({ value }: { value: number }) {
  return <span className="text-xs text-slate-400 font-mono tabular-nums">{(value * 100).toFixed(1)}%</span>;
}

function WinDelta({ value }: { value: number }) {
  const sign = value >= 0 ? '+' : '';
  const color = value > 0.005 ? 'text-emerald-400/70' : value < -0.005 ? 'text-red-400/70' : 'text-slate-600';
  return <span className={`text-xs font-mono tabular-nums ${color}`}>{sign}{(value * 100).toFixed(1)}%</span>;
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) {
    return <span className="ml-1 text-slate-700 text-[9px]">⇅</span>;
  }
  return <span className="ml-1 text-gold-500 text-[9px]">{dir === 'asc' ? '▲' : '▼'}</span>;
}

function filterLabel(playerCounts: number[], pointsTargets: number[]): string {
  const p = playerCounts.length === 0 ? 'Any' : [...playerCounts].sort((a, b) => a - b).join('/') + 'P';
  const vp = pointsTargets.length === 0 ? 'Any VP' : [...pointsTargets].sort((a, b) => a - b).join('/') + ' VP';
  return `${p} · ${vp}`;
}

export default function HandicapTable({
  result,
  playerCounts,
  pointsTargets,
  activeFactionCount,
  loading,
  label,
  colorMode,
  showWinRate,
}: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('adj');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const thClass = (col: SortCol, align: 'left' | 'center' | 'right' = 'center') =>
    `px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap
     cursor-pointer select-none transition-colors duration-100
     ${sortCol === col ? 'text-gold-500' : 'text-slate-600 hover:text-slate-400'}
     text-${align}`;

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Handicap Recommendations</span>
        </div>
        <div className="flex items-center justify-center h-32">
          <span className="text-slate-600 text-sm animate-pulse">Loading…</span>
        </div>
      </div>
    );
  }

  if (!result || result.confidence === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Handicap Recommendations</span>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-slate-400 text-sm">No data for the selected filters.</p>
          <p className="text-slate-600 text-xs mt-1">Try broadening the player count or VP target.</p>
        </div>
      </div>
    );
  }

  const unsortedRows = Object.entries(result.adjustments).map(([faction, adj]) => {
    const mean = result.factionMeans[faction];
    const adjMean = mean + adj;
    const winRate = result.factionWinRates[faction] ?? 0;
    return {
      faction,
      adj,
      mean,
      delta: mean - result.rawMean,
      adjMean,
      adjDelta: adjMean - result.overallMean,
      appearances: result.factionAppearances[faction],
      winRate,
      winRateDelta: winRate - (result.factionExpectedWinRates[faction] ?? 0),
    };
  });

  const colStats = {
    adj:           computeStats(unsortedRows.map(r => r.adj)),
    mean:          computeStats(unsortedRows.map(r => r.mean)),
    delta:         computeStats(unsortedRows.map(r => r.delta)),
    adjMean:       computeStats(unsortedRows.map(r => r.adjMean)),
    adjDelta:      computeStats(unsortedRows.map(r => r.adjDelta)),
    appearances:   computeStats(unsortedRows.map(r => r.appearances)),
    winRate:       computeStats(unsortedRows.map(r => r.winRate)),
    winRateDelta:  computeStats(unsortedRows.map(r => r.winRateDelta)),
  };

  const avgExpWinRate = unsortedRows.length > 0
    ? unsortedRows.reduce((s, r) => s + (r.winRate - r.winRateDelta), 0) / unsortedRows.length
    : 0;
  const avgAbsWinRateDelta = unsortedRows.reduce((s, r) => s + Math.abs(r.winRateDelta), 0) / unsortedRows.length;

  const rows = [...unsortedRows].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortCol === 'faction') return mul * a.faction.localeCompare(b.faction);
    const diff = a[sortCol] - b[sortCol];
    return diff !== 0 ? mul * diff : a.faction.localeCompare(b.faction);
  });

  const avgAbsDelta = unsortedRows.reduce((sum, r) => sum + Math.abs(r.delta), 0) / unsortedRows.length;
  const avgAbsAdjDelta = unsortedRows.reduce((sum, r) => sum + Math.abs(r.adjDelta), 0) / unsortedRows.length;
  const avgAppearances = unsortedRows.reduce((sum, r) => sum + r.appearances, 0) / unsortedRows.length;

  return (
    <div className="card min-w-0 animate-fade-in">
      <div className="card-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="card-title">
              Handicap Recommendations
              {label && <span className="ml-2 text-gold-500/50">{label}</span>}
            </span>
            {activeFactionCount > 0 && (
              <span className="text-[10px] text-gold-500/70 tracking-wider uppercase">
                {activeFactionCount} faction{activeFactionCount !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600 tracking-wider">
              {filterLabel(playerCounts, pointsTargets)}
            </span>
            <span className="bg-gold-500/10 ring-1 ring-gold-600/30 text-gold-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
              {result.confidence.toLocaleString()} games
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-space-500">
              <th onClick={() => handleSort('faction')} className={thClass('faction', 'left') + ' pl-5 w-full'}>
                Faction <SortIcon col="faction" active={sortCol} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('adj')} className={thClass('adj')}>
                Handicap <SortIcon col="adj" active={sortCol} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('mean')} className={thClass('mean')}>
                Mean VP <SortIcon col="mean" active={sortCol} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('delta')} className={thClass('delta')}>
                Δ from mean <SortIcon col="delta" active={sortCol} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('adjMean')} className={thClass('adjMean')}>
                Adj. mean <SortIcon col="adjMean" active={sortCol} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('adjDelta')} className={thClass('adjDelta')}>
                Δ adj. <SortIcon col="adjDelta" active={sortCol} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('appearances')} className={thClass('appearances', showWinRate ? 'center' : 'right') + (showWinRate ? '' : ' pr-5')}>
                Games <SortIcon col="appearances" active={sortCol} dir={sortDir} />
              </th>
              {showWinRate && <>
                <th onClick={() => handleSort('winRate')} className={thClass('winRate')}>
                  Win % <SortIcon col="winRate" active={sortCol} dir={sortDir} />
                </th>
                <th onClick={() => handleSort('winRateDelta')} className={thClass('winRateDelta', 'right') + ' pr-5'}>
                  Win Δ <SortIcon col="winRateDelta" active={sortCol} dir={sortDir} />
                </th>
              </>}
            </tr>
            <tr className="border-b border-space-600/40">
              <td colSpan={2} />
              <td className="px-4 pb-2 text-center text-[10px] text-slate-600 font-mono tabular-nums">
                {result.rawMean.toFixed(2)}
              </td>
              <td className="px-4 pb-2 text-center text-[10px] text-slate-600 font-mono tabular-nums">
                ±{avgAbsDelta.toFixed(2)}
              </td>
              <td className="px-4 pb-2 text-center text-[10px] text-slate-600 font-mono tabular-nums">
                {result.overallMean.toFixed(2)}
              </td>
              <td className="px-4 pb-2 text-center text-[10px] text-slate-600 font-mono tabular-nums">
                ±{avgAbsAdjDelta.toFixed(2)}
              </td>
              <td className={`pb-2 text-[10px] text-slate-600 font-mono tabular-nums ${showWinRate ? 'px-4 text-center' : 'px-5 text-right'}`}>
                {Math.round(avgAppearances)}
              </td>
              {showWinRate && <>
                <td className="px-4 pb-2 text-center text-[10px] text-slate-600 font-mono tabular-nums">
                  {(avgExpWinRate * 100).toFixed(1)}%
                </td>
                <td className="px-4 pb-2 text-center text-[10px] text-slate-600 font-mono tabular-nums pr-5">
                  ±{(avgAbsWinRateDelta * 100).toFixed(1)}%
                </td>
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ faction, adj, mean, delta, adjMean, adjDelta, appearances, winRate, winRateDelta }, idx) => (
              <tr
                key={faction}
                className={`border-b border-space-600/40 transition-colors duration-100 ${
                  idx % 2 === 0
                    ? 'hover:bg-space-700/25'
                    : 'bg-space-800/25 hover:bg-space-700/25'
                }`}
              >
                <td className="px-5 py-3 text-sm text-slate-300">{faction}</td>
                <td className="px-4 py-3 text-center">
                  {colorMode === 'gradient'
                    ? <GradCell value={adj} stats={colStats.adj} fmt={v => `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : v.toFixed(1)}`} />
                    : <AdjBadge adj={adj} />}
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-400 font-mono tabular-nums">
                  {colorMode === 'gradient'
                    ? <GradCell value={mean} stats={colStats.mean} fmt={v => v.toFixed(2)} />
                    : mean.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {colorMode === 'gradient'
                    ? <GradCell value={delta} stats={colStats.delta} fmt={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`} />
                    : <Delta value={delta} />}
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-400 font-mono tabular-nums">
                  {colorMode === 'gradient'
                    ? <GradCell value={adjMean} stats={colStats.adjMean} fmt={v => v.toFixed(2)} />
                    : adjMean.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {colorMode === 'gradient'
                    ? <GradCell value={adjDelta} stats={colStats.adjDelta} fmt={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`} />
                    : <Delta value={adjDelta} />}
                </td>
                <td className={`py-3 text-sm text-slate-600 tabular-nums ${showWinRate ? 'px-4 text-center' : 'px-5 text-right'}`}>
                  {colorMode === 'gradient'
                    ? <GradCell value={appearances} stats={colStats.appearances} fmt={v => String(v)} />
                    : appearances}
                </td>
                {showWinRate && <>
                  <td className="px-4 py-3 text-center">
                    {colorMode === 'gradient'
                      ? <GradCell value={winRate} stats={colStats.winRate} fmt={v => `${(v * 100).toFixed(1)}%`} />
                      : <WinRate value={winRate} />}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {colorMode === 'gradient'
                      ? <GradCell value={winRateDelta} stats={colStats.winRateDelta} fmt={v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`} />
                      : <WinDelta value={winRateDelta} />}
                  </td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-space-600/40 bg-space-900/40">
        <p className="text-[11px] text-slate-600 leading-relaxed">
          <strong className="text-slate-500 font-medium">How to read:</strong>{' '}
          <span className="text-emerald-500 font-medium">+1</span> = earns 1 extra VP toward the winning threshold.{' '}
          <span className="text-red-500 font-medium">−1</span> = needs 1 more VP than the table to win.{' '}
          Δ shows raw historical performance vs. the group average.
          {activeFactionCount > 0 && (
            <> Handicaps are calculated relative to your selected faction pool.</>
          )}
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { HandicapResult } from '../types';
import { ColorMode, ColStats, computeStats, gradientColor } from '../lib/colorScale';

type SortCol = 'faction' | 'adj' | 'mean' | 'delta' | 'adjMean' | 'adjDelta' | 'appearances' | 'winRate' | 'winRateDelta';
type SortDir = 'asc' | 'desc';
type SortSrc = 'a' | 'b' | 'diff';
interface SortState { col: SortCol; dir: SortDir; src: SortSrc }

interface RowData {
  adj: number; mean: number; delta: number;
  adjMean: number; adjDelta: number; appearances: number;
  winRate: number; winRateDelta: number;
}

interface Props {
  resultA: HandicapResult | null;
  resultB: HandicapResult | null;
  playerCountsA: number[];
  pointsTargetsA: number[];
  playerCountsB: number[];
  pointsTargetsB: number[];
  activeFactionCount: number;
  loading: boolean;
  colorMode: ColorMode;
  showDiff: boolean;
  showWinRate: boolean;
}

function AdjBadge({ adj }: { adj: number }) {
  if (adj === 0) return <span className="text-slate-600 text-sm font-mono">—</span>;
  const pos = adj > 0;
  return (
    <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded text-xs font-bold font-mono
      ${pos ? 'bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-800/60'
             : 'bg-red-900/40 text-red-400 ring-1 ring-red-900/60'}`}>
      {pos ? '+' : ''}{Number.isInteger(adj) ? adj : adj.toFixed(1)}
    </span>
  );
}

function Delta({ value }: { value: number }) {
  const sign = value >= 0 ? '+' : '';
  const color = value > 0.05 ? 'text-emerald-400/70' : value < -0.05 ? 'text-red-400/70' : 'text-slate-600';
  return <span className={`text-xs font-mono tabular-nums ${color}`}>{sign}{value.toFixed(2)}</span>;
}

function Num({ value }: { value: number }) {
  return <span className="text-xs text-slate-400 font-mono tabular-nums">{value.toFixed(2)}</span>;
}

function Nil() {
  return <span className="text-slate-700 text-xs">—</span>;
}

function WinRate({ value }: { value: number }) {
  return <span className="text-xs text-slate-400 font-mono tabular-nums">{(value * 100).toFixed(1)}%</span>;
}

function WinDelta({ value }: { value: number }) {
  const sign = value >= 0 ? '+' : '';
  const color = value > 0.005 ? 'text-emerald-400/70' : value < -0.005 ? 'text-red-400/70' : 'text-slate-600';
  return <span className={`text-xs font-mono tabular-nums ${color}`}>{sign}{(value * 100).toFixed(1)}%</span>;
}

function GradCell({ value, stats, fmt }: { value: number; stats: ColStats; fmt: (v: number) => string }) {
  return (
    <span className="text-xs font-mono tabular-nums font-semibold" style={{ color: gradientColor(value, stats) }}>
      {fmt(value)}
    </span>
  );
}

function DiffVal({ value, stats, colorMode, fmt }: {
  value: number;
  stats: ColStats;
  colorMode: ColorMode;
  fmt: (v: number) => string;
}) {
  const color = colorMode === 'gradient'
    ? gradientColor(value, stats)
    : value > 0 ? 'rgb(74,222,128)' : value < 0 ? 'rgb(248,113,113)' : 'rgb(100,116,139)';
  return (
    <span
      className="text-[10px] font-mono tabular-nums border-l border-space-500/40 pl-1.5 ml-0.5 opacity-80"
      style={{ color }}
    >
      {fmt(value)}
    </span>
  );
}

function SortIndicator({ col, state }: { col: SortCol; state: SortState }) {
  if (col !== state.col) return <span className="ml-1 text-slate-700 text-[9px]">⇅</span>;
  const arrow = state.dir === 'asc' ? '▲' : '▼';
  const [color, label] = state.src === 'a' ? ['text-gold-500', 'A'] : state.src === 'b' ? ['text-sky-400', 'B'] : ['text-violet-400', 'Δ'];
  return <span className={`ml-1 text-[9px] ${color}`}>{arrow}{label}</span>;
}

function filterLabel(counts: number[], targets: number[]): string {
  const p = counts.length === 0 ? 'Any' : [...counts].sort((a, b) => a - b).join('/') + 'P';
  const vp = targets.length === 0 ? 'Any VP' : [...targets].sort((a, b) => a - b).join('/') + ' VP';
  return `${p} · ${vp}`;
}

function getRowData(result: HandicapResult, faction: string): RowData | null {
  if (!(faction in result.adjustments)) return null;
  const adj = result.adjustments[faction];
  const mean = result.factionMeans[faction];
  const adjMean = mean + adj;
  const winRate = result.factionWinRates[faction] ?? 0;
  return { adj, mean, delta: mean - result.rawMean, adjMean, adjDelta: adjMean - result.overallMean, appearances: result.factionAppearances[faction], winRate, winRateDelta: winRate - (result.factionExpectedWinRates[faction] ?? 0) };
}

function nextSort(prev: SortState, col: SortCol, showDiff: boolean): SortState {
  if (col !== prev.col) return { col, dir: 'asc', src: 'a' };
  if (prev.src === 'a'    && prev.dir === 'asc')  return { col, dir: 'desc', src: 'a' };
  if (prev.src === 'a'    && prev.dir === 'desc') return { col, dir: 'asc',  src: 'b' };
  if (prev.src === 'b'    && prev.dir === 'asc')  return { col, dir: 'desc', src: 'b' };
  if (prev.src === 'b'    && prev.dir === 'desc') return showDiff ? { col, dir: 'asc', src: 'diff' } : { col, dir: 'asc', src: 'a' };
  if (prev.src === 'diff' && prev.dir === 'asc')  return { col, dir: 'desc', src: 'diff' };
  return { col, dir: 'asc', src: 'a' };
}

function Lbl({ src }: { src: 'a' | 'b' }) {
  return (
    <span className={`text-[8px] font-bold uppercase w-3 shrink-0 ${src === 'a' ? 'text-gold-500/60' : 'text-sky-400/60'}`}>
      {src.toUpperCase()}
    </span>
  );
}

function PairCell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1 items-center justify-center">{children}</div>;
}

function PairRow({ src, children }: { src: 'a' | 'b'; children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-1"><Lbl src={src} />{children}</div>;
}

// Wraps PairCell + optional diff value aligned to the vertical midpoint between A and B
function Cell({ aContent, bContent, diff }: {
  aContent: React.ReactNode;
  bContent: React.ReactNode;
  diff?: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center justify-center gap-0">
      <PairCell>
        <PairRow src="a">{aContent}</PairRow>
        <PairRow src="b">{bContent}</PairRow>
      </PairCell>
      {diff}
    </div>
  );
}

const fmtAdj = (v: number) => `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : v.toFixed(1)}`;
const fmtFixed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const fmtInt = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)}`;
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtPctDiff = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

export default function MergedHandicapTable({
  resultA, resultB,
  playerCountsA, pointsTargetsA,
  playerCountsB, pointsTargetsB,
  activeFactionCount, loading,
  colorMode, showDiff, showWinRate,
}: Props) {
  const [sort, setSort] = useState<SortState>({ col: 'adj', dir: 'asc', src: 'a' });

  useEffect(() => {
    if (!showDiff && sort.src === 'diff') {
      setSort(s => ({ ...s, src: 'a', dir: 'asc' }));
    }
  }, [showDiff]);

  const activeColor = sort.src === 'a' ? 'text-gold-500' : sort.src === 'b' ? 'text-sky-400' : 'text-violet-400';
  const thClass = (col: SortCol, align: 'left' | 'center' | 'right' = 'center') =>
    `px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap
     cursor-pointer select-none transition-colors duration-100
     ${sort.col === col ? activeColor : 'text-slate-600 hover:text-slate-400'}
     text-${align}`;

  if (loading) {
    return (
      <div className="card min-w-0">
        <div className="card-header"><span className="card-title">Handicap Recommendations</span></div>
        <div className="flex items-center justify-center h-32">
          <span className="text-slate-600 text-sm animate-pulse">Loading…</span>
        </div>
      </div>
    );
  }

  if (!resultA && !resultB) {
    return (
      <div className="card min-w-0">
        <div className="card-header"><span className="card-title">Handicap Recommendations</span></div>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-slate-400 text-sm">No data for the selected filters.</p>
        </div>
      </div>
    );
  }

  const factionsA = resultA ? Object.keys(resultA.adjustments) : [];
  const factionsB = resultB ? Object.keys(resultB.adjustments) : [];
  const allFactions = [...new Set([...factionsA, ...factionsB])];

  const rows = allFactions.map((faction) => ({
    faction,
    a: resultA ? getRowData(resultA, faction) : null,
    b: resultB ? getRowData(resultB, faction) : null,
  }));

  const sortedRows = [...rows].sort((x, y) => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    if (sort.col === 'faction') return mul * x.faction.localeCompare(y.faction);
    let xVal: number | null, yVal: number | null;
    if (sort.src === 'diff') {
      xVal = (x.a && x.b) ? (x.b[sort.col] as number) - (x.a[sort.col] as number) : null;
      yVal = (y.a && y.b) ? (y.b[sort.col] as number) - (y.a[sort.col] as number) : null;
    } else {
      xVal = x[sort.src]?.[sort.col] ?? null;
      yVal = y[sort.src]?.[sort.col] ?? null;
    }
    if (xVal === null && yVal === null) return 0;
    if (xVal === null) return 1;
    if (yVal === null) return -1;
    const d = xVal - yVal;
    return d !== 0 ? mul * d : x.faction.localeCompare(y.faction);
  });

  const avgAbsDeltaA = resultA
    ? Object.entries(resultA.adjustments).reduce((s, [f]) => s + Math.abs(resultA.factionMeans[f] - resultA.rawMean), 0) / factionsA.length
    : null;
  const avgAbsDeltaB = resultB
    ? Object.entries(resultB.adjustments).reduce((s, [f]) => s + Math.abs(resultB.factionMeans[f] - resultB.rawMean), 0) / factionsB.length
    : null;
  const avgAbsAdjDeltaA = resultA
    ? Object.entries(resultA.adjustments).reduce((s, [f, adj]) => s + Math.abs(resultA.factionMeans[f] + adj - resultA.overallMean), 0) / factionsA.length
    : null;
  const avgAbsAdjDeltaB = resultB
    ? Object.entries(resultB.adjustments).reduce((s, [f, adj]) => s + Math.abs(resultB.factionMeans[f] + adj - resultB.overallMean), 0) / factionsB.length
    : null;


  const aData = rows.map(r => r.a).filter(Boolean) as RowData[];
  const bData = rows.map(r => r.b).filter(Boolean) as RowData[];
  const avg = (data: RowData[], fn: (r: RowData) => number) =>
    data.length > 0 ? data.reduce((s, r) => s + fn(r), 0) / data.length : null;
  const avgAppearancesA    = avg(aData, r => r.appearances);
  const avgAppearancesB    = avg(bData, r => r.appearances);
  const avgExpWinRateA     = avg(aData, r => r.winRate - r.winRateDelta);
  const avgExpWinRateB     = avg(bData, r => r.winRate - r.winRateDelta);
  const avgAbsWinDeltaA    = avg(aData, r => Math.abs(r.winRateDelta));
  const avgAbsWinDeltaB    = avg(bData, r => Math.abs(r.winRateDelta));
  const statsFor = (data: RowData[], key: keyof RowData) => computeStats(data.map(r => r[key]));
  const colStatsA = {
    adj: statsFor(aData, 'adj'), mean: statsFor(aData, 'mean'), delta: statsFor(aData, 'delta'),
    adjMean: statsFor(aData, 'adjMean'), adjDelta: statsFor(aData, 'adjDelta'), appearances: statsFor(aData, 'appearances'),
    winRate: statsFor(aData, 'winRate'), winRateDelta: statsFor(aData, 'winRateDelta'),
  };
  const colStatsB = {
    adj: statsFor(bData, 'adj'), mean: statsFor(bData, 'mean'), delta: statsFor(bData, 'delta'),
    adjMean: statsFor(bData, 'adjMean'), adjDelta: statsFor(bData, 'adjDelta'), appearances: statsFor(bData, 'appearances'),
    winRate: statsFor(bData, 'winRate'), winRateDelta: statsFor(bData, 'winRateDelta'),
  };

  const validDiffs = rows.filter(r => r.a && r.b);
  const diffStats = {
    adj:          computeStats(validDiffs.map(r => r.b!.adj - r.a!.adj)),
    mean:         computeStats(validDiffs.map(r => r.b!.mean - r.a!.mean)),
    delta:        computeStats(validDiffs.map(r => r.b!.delta - r.a!.delta)),
    adjMean:      computeStats(validDiffs.map(r => r.b!.adjMean - r.a!.adjMean)),
    adjDelta:     computeStats(validDiffs.map(r => r.b!.adjDelta - r.a!.adjDelta)),
    appearances:  computeStats(validDiffs.map(r => r.b!.appearances - r.a!.appearances)),
    winRate:      computeStats(validDiffs.map(r => r.b!.winRate - r.a!.winRate)),
    winRateDelta: computeStats(validDiffs.map(r => r.b!.winRateDelta - r.a!.winRateDelta)),
  };

  function diff<K extends keyof RowData>(a: RowData | null, b: RowData | null, key: K, stats: ColStats, fmt: (v: number) => string) {
    if (!showDiff || !a || !b) return undefined;
    return <DiffVal value={(b[key] as number) - (a[key] as number)} stats={stats} colorMode={colorMode} fmt={fmt} />;
  }

  return (
    <div className="card min-w-0 animate-fade-in">
      <div className="card-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="card-title">Handicap Recommendations</span>
            {activeFactionCount > 0 && (
              <span className="text-[10px] text-gold-500/70 tracking-wider uppercase">
                {activeFactionCount} faction{activeFactionCount !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-gold-500/60 tracking-wider">A</span>
            <span className="text-[10px] text-slate-600">{filterLabel(playerCountsA, pointsTargetsA)}</span>
            {resultA && (
              <span className="bg-gold-500/10 ring-1 ring-gold-600/30 text-gold-400 text-[11px] px-2 py-0.5 rounded-full font-medium">
                {resultA.confidence.toLocaleString()}
              </span>
            )}
            <span className="text-slate-700">·</span>
            <span className="text-[10px] text-sky-400/60 tracking-wider">B</span>
            <span className="text-[10px] text-slate-600">{filterLabel(playerCountsB, pointsTargetsB)}</span>
            {resultB && (
              <span className="bg-sky-500/10 ring-1 ring-sky-600/30 text-sky-400 text-[11px] px-2 py-0.5 rounded-full font-medium">
                {resultB.confidence.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-space-500">
              <th onClick={() => setSort(s => nextSort(s, 'faction', showDiff))} className={thClass('faction', 'left') + ' pl-5 w-full'}>
                Faction <SortIndicator col="faction" state={sort} />
              </th>
              <th onClick={() => setSort(s => nextSort(s, 'adj', showDiff))} className={thClass('adj')}>
                Handicap <SortIndicator col="adj" state={sort} />
              </th>
              <th onClick={() => setSort(s => nextSort(s, 'mean', showDiff))} className={thClass('mean')}>
                Mean VP <SortIndicator col="mean" state={sort} />
              </th>
              <th onClick={() => setSort(s => nextSort(s, 'delta', showDiff))} className={thClass('delta')}>
                Δ from mean <SortIndicator col="delta" state={sort} />
              </th>
              <th onClick={() => setSort(s => nextSort(s, 'adjMean', showDiff))} className={thClass('adjMean')}>
                Adj. mean <SortIndicator col="adjMean" state={sort} />
              </th>
              <th onClick={() => setSort(s => nextSort(s, 'adjDelta', showDiff))} className={thClass('adjDelta')}>
                Δ adj. <SortIndicator col="adjDelta" state={sort} />
              </th>
              <th onClick={() => setSort(s => nextSort(s, 'appearances', showDiff))} className={thClass('appearances', showWinRate ? 'center' : 'right') + (showWinRate ? '' : ' pr-5')}>
                Games <SortIndicator col="appearances" state={sort} />
              </th>
              {showWinRate && <>
                <th onClick={() => setSort(s => nextSort(s, 'winRate', showDiff))} className={thClass('winRate')}>
                  Win % <SortIndicator col="winRate" state={sort} />
                </th>
                <th onClick={() => setSort(s => nextSort(s, 'winRateDelta', showDiff))} className={thClass('winRateDelta', 'right') + ' pr-5'}>
                  Win Δ <SortIndicator col="winRateDelta" state={sort} />
                </th>
              </>}
            </tr>
            <tr className="border-b border-space-600/40 text-[10px] text-slate-600 font-mono">
              <td colSpan={2} />
              <td className="px-4 pb-2 text-center">
                <PairCell>
                  {resultA && <PairRow src="a"><span className="tabular-nums">{resultA.rawMean.toFixed(2)}</span></PairRow>}
                  {resultB && <PairRow src="b"><span className="tabular-nums">{resultB.rawMean.toFixed(2)}</span></PairRow>}
                </PairCell>
              </td>
              <td className="px-4 pb-2 text-center">
                <PairCell>
                  {avgAbsDeltaA != null && <PairRow src="a"><span className="tabular-nums">±{avgAbsDeltaA.toFixed(2)}</span></PairRow>}
                  {avgAbsDeltaB != null && <PairRow src="b"><span className="tabular-nums">±{avgAbsDeltaB.toFixed(2)}</span></PairRow>}
                </PairCell>
              </td>
              <td className="px-4 pb-2 text-center">
                <PairCell>
                  {resultA && <PairRow src="a"><span className="tabular-nums">{resultA.overallMean.toFixed(2)}</span></PairRow>}
                  {resultB && <PairRow src="b"><span className="tabular-nums">{resultB.overallMean.toFixed(2)}</span></PairRow>}
                </PairCell>
              </td>
              <td className="px-4 pb-2 text-center">
                <PairCell>
                  {avgAbsAdjDeltaA != null && <PairRow src="a"><span className="tabular-nums">±{avgAbsAdjDeltaA.toFixed(2)}</span></PairRow>}
                  {avgAbsAdjDeltaB != null && <PairRow src="b"><span className="tabular-nums">±{avgAbsAdjDeltaB.toFixed(2)}</span></PairRow>}
                </PairCell>
              </td>
              <td className={`pb-2 ${showWinRate ? 'px-4 text-center' : 'px-4 text-right pr-5'}`}>
                <PairCell>
                  {avgAppearancesA != null && <PairRow src="a"><span className="tabular-nums">{Math.round(avgAppearancesA)}</span></PairRow>}
                  {avgAppearancesB != null && <PairRow src="b"><span className="tabular-nums">{Math.round(avgAppearancesB)}</span></PairRow>}
                </PairCell>
              </td>
              {showWinRate && <>
                <td className="px-4 pb-2 text-center">
                  <PairCell>
                    {avgExpWinRateA != null && <PairRow src="a"><span className="tabular-nums">{(avgExpWinRateA * 100).toFixed(1)}%</span></PairRow>}
                    {avgExpWinRateB != null && <PairRow src="b"><span className="tabular-nums">{(avgExpWinRateB * 100).toFixed(1)}%</span></PairRow>}
                  </PairCell>
                </td>
                <td className="px-4 pb-2 text-center">
                  <PairCell>
                    {avgAbsWinDeltaA != null && <PairRow src="a"><span className="tabular-nums">±{(avgAbsWinDeltaA * 100).toFixed(1)}%</span></PairRow>}
                    {avgAbsWinDeltaB != null && <PairRow src="b"><span className="tabular-nums">±{(avgAbsWinDeltaB * 100).toFixed(1)}%</span></PairRow>}
                  </PairCell>
                </td>
              </>}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ faction, a, b }, idx) => {
              const ga = colorMode === 'gradient';
              return (
                <tr key={faction} className={`border-b border-space-600/40 transition-colors duration-100 ${idx % 2 === 0 ? 'hover:bg-space-700/25' : 'bg-space-800/25 hover:bg-space-700/25'}`}>
                  <td className="px-5 py-2 text-sm text-slate-300">{faction}</td>
                  <td className="px-4 py-2 text-center">
                    <Cell
                      aContent={a ? (ga ? <GradCell value={a.adj} stats={colStatsA.adj} fmt={fmtAdj} /> : <AdjBadge adj={a.adj} />) : <Nil />}
                      bContent={b ? (ga ? <GradCell value={b.adj} stats={colStatsB.adj} fmt={fmtAdj} /> : <AdjBadge adj={b.adj} />) : <Nil />}
                      diff={diff(a, b, 'adj', diffStats.adj, fmtAdj)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Cell
                      aContent={a ? (ga ? <GradCell value={a.mean} stats={colStatsA.mean} fmt={v => v.toFixed(2)} /> : <Num value={a.mean} />) : <Nil />}
                      bContent={b ? (ga ? <GradCell value={b.mean} stats={colStatsB.mean} fmt={v => v.toFixed(2)} /> : <Num value={b.mean} />) : <Nil />}
                      diff={diff(a, b, 'mean', diffStats.mean, fmtFixed)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Cell
                      aContent={a ? (ga ? <GradCell value={a.delta} stats={colStatsA.delta} fmt={fmtFixed} /> : <Delta value={a.delta} />) : <Nil />}
                      bContent={b ? (ga ? <GradCell value={b.delta} stats={colStatsB.delta} fmt={fmtFixed} /> : <Delta value={b.delta} />) : <Nil />}
                      diff={diff(a, b, 'delta', diffStats.delta, fmtFixed)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Cell
                      aContent={a ? (ga ? <GradCell value={a.adjMean} stats={colStatsA.adjMean} fmt={v => v.toFixed(2)} /> : <Num value={a.adjMean} />) : <Nil />}
                      bContent={b ? (ga ? <GradCell value={b.adjMean} stats={colStatsB.adjMean} fmt={v => v.toFixed(2)} /> : <Num value={b.adjMean} />) : <Nil />}
                      diff={diff(a, b, 'adjMean', diffStats.adjMean, fmtFixed)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Cell
                      aContent={a ? (ga ? <GradCell value={a.adjDelta} stats={colStatsA.adjDelta} fmt={fmtFixed} /> : <Delta value={a.adjDelta} />) : <Nil />}
                      bContent={b ? (ga ? <GradCell value={b.adjDelta} stats={colStatsB.adjDelta} fmt={fmtFixed} /> : <Delta value={b.adjDelta} />) : <Nil />}
                      diff={diff(a, b, 'adjDelta', diffStats.adjDelta, fmtFixed)}
                    />
                  </td>
                  <td className={`py-2 text-center ${showWinRate ? 'px-4' : 'px-5'}`}>
                    <Cell
                      aContent={a ? (ga ? <GradCell value={a.appearances} stats={colStatsA.appearances} fmt={v => String(v)} /> : <span className="text-xs text-slate-600 tabular-nums">{a.appearances}</span>) : <span className="text-xs text-slate-600 tabular-nums">—</span>}
                      bContent={b ? (ga ? <GradCell value={b.appearances} stats={colStatsB.appearances} fmt={v => String(v)} /> : <span className="text-xs text-slate-600 tabular-nums">{b.appearances}</span>) : <span className="text-xs text-slate-600 tabular-nums">—</span>}
                      diff={diff(a, b, 'appearances', diffStats.appearances, fmtInt)}
                    />
                  </td>
                  {showWinRate && <>
                    <td className="px-4 py-2 text-center">
                      <Cell
                        aContent={a ? (ga ? <GradCell value={a.winRate} stats={colStatsA.winRate} fmt={fmtPct} /> : <WinRate value={a.winRate} />) : <Nil />}
                        bContent={b ? (ga ? <GradCell value={b.winRate} stats={colStatsB.winRate} fmt={fmtPct} /> : <WinRate value={b.winRate} />) : <Nil />}
                        diff={diff(a, b, 'winRate', diffStats.winRate, fmtPctDiff)}
                      />
                    </td>
                    <td className="px-5 py-2 text-right">
                      <Cell
                        aContent={a ? (ga ? <GradCell value={a.winRateDelta} stats={colStatsA.winRateDelta} fmt={fmtPctDiff} /> : <WinDelta value={a.winRateDelta} />) : <Nil />}
                        bContent={b ? (ga ? <GradCell value={b.winRateDelta} stats={colStatsB.winRateDelta} fmt={fmtPctDiff} /> : <WinDelta value={b.winRateDelta} />) : <Nil />}
                        diff={diff(a, b, 'winRateDelta', diffStats.winRateDelta, fmtPctDiff)}
                      />
                    </td>
                  </>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-space-600/40 bg-space-900/40">
        <p className="text-[11px] text-slate-600 leading-relaxed">
          <span className="text-gold-500/80 font-semibold">A</span> and <span className="text-sky-400/80 font-semibold">B</span> show values for each setup respectively.{' '}
          Click a column to sort — cycles <span className="text-gold-500/70">▲A → ▼A</span> → <span className="text-sky-400/70">▲B → ▼B</span>.
          {showDiff && <> Diff shows B − A.</>}
          {activeFactionCount > 0 && <> Handicaps are calculated relative to your selected faction pool.</>}
        </p>
      </div>
    </div>
  );
}

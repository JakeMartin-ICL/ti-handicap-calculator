import { IncompleteMode, ExperienceLevel } from '../types';

const PLAYER_COUNTS = [3, 4, 5, 6, 7, 8];

interface Props {
  playerCounts: number[];
  pointsTargets: Array<10 | 14>;
  unit: 1 | 0.5;
  incomplete: IncompleteMode;
  experienceLevels: ExperienceLevel[];
  label?: string;
  showClose?: boolean;
  onClose?: () => void;
  onPlayerCountsChange: (counts: number[]) => void;
  onPointsTargetsChange: (targets: Array<10 | 14>) => void;
  onUnitChange: (u: 1 | 0.5) => void;
  onIncompleteModeChange: (mode: IncompleteMode) => void;
  onExperienceLevelsChange: (levels: ExperienceLevel[]) => void;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; title: string }[] = [
  { value: 'Beginner (Learning rules)',                          label: 'Beginner',     title: 'Beginner (Learning rules)' },
  { value: 'Intermediate (Understands rules)',                   label: 'Intermediate', title: 'Intermediate (Understands rules)' },
  { value: 'Advanced (Understands rules and can play most races)', label: 'Advanced',   title: 'Advanced (Understands rules and can play most races)' },
  { value: 'Expert (Can play any race with ease)',               label: 'Expert',       title: 'Expert (Can play any race with ease)' },
];

const INCOMPLETE_OPTIONS: { value: IncompleteMode; label: string; title: string }[] = [
  { value: 'allow',         label: 'Allow',         title: 'Use VP scores exactly as recorded, including games where the winner fell short of the target.' },
  { value: 'drop',          label: 'Drop',          title: 'Exclude any game where the winner did not reach the points target.' },
  { value: 'normalise',     label: 'Normalise',     title: 'In incomplete games, scale all VP scores up so the winner exactly reaches the points target.' },
  { value: 'normalise-all', label: 'Normalise all', title: 'Scale all VP scores in every game so the winner exactly equals the points target — including games that ran over.' },
];

export default function GameFilter({
  playerCounts,
  pointsTargets,
  unit,
  incomplete,
  experienceLevels,
  label,
  showClose,
  onClose,
  onPlayerCountsChange,
  onPointsTargetsChange,
  onUnitChange,
  onIncompleteModeChange,
  onExperienceLevelsChange,
}: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <span className="card-title">
            Game Setup
            {label && <span className="ml-2 text-gold-500/50">{label}</span>}
          </span>
          {showClose && (
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-300 transition-colors text-base leading-none px-1"
              aria-label="Remove comparison"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="card-body space-y-5">
        <div>
          <label className="block text-[10px] text-slate-500 font-medium tracking-[0.15em] uppercase mb-2.5">
            Player Count
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onPlayerCountsChange([])}
              className={`btn-option px-3 text-center ${playerCounts.length === 0 ? 'btn-active' : 'btn-inactive'}`}
            >
              Any
            </button>
            {PLAYER_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => onPlayerCountsChange(toggle(playerCounts, n))}
                className={`btn-option w-10 text-center ${playerCounts.includes(n) ? 'btn-active' : 'btn-inactive'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium tracking-[0.15em] uppercase mb-2.5">
            Victory Point Target
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onPointsTargetsChange([])}
              className={`btn-option px-3 text-center ${pointsTargets.length === 0 ? 'btn-active' : 'btn-inactive'}`}
            >
              Any
            </button>
            {([10, 14] as const).map((n) => (
              <button
                key={n}
                onClick={() => onPointsTargetsChange(toggle(pointsTargets, n))}
                className={`btn-option w-16 text-center ${pointsTargets.includes(n) ? 'btn-active' : 'btn-inactive'}`}
              >
                {n} VP
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium tracking-[0.15em] uppercase mb-2.5">
            Player Experience
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              title="Include all players regardless of experience, including games with no experience recorded."
              onClick={() => onExperienceLevelsChange([])}
              className={`btn-option px-3 text-center ${experienceLevels.length === 0 ? 'btn-active' : 'btn-inactive'}`}
            >
              All
            </button>
            {EXPERIENCE_OPTIONS.map(({ value, label: optLabel, title }) => (
              <button
                key={value}
                title={title}
                onClick={() => onExperienceLevelsChange(toggle(experienceLevels, value))}
                className={`btn-option px-3 text-center ${experienceLevels.includes(value) ? 'btn-active' : 'btn-inactive'}`}
              >
                {optLabel}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium tracking-[0.15em] uppercase mb-2.5">
            Handicap Unit
          </label>
          <div className="flex gap-2">
            {([1, 0.5] as const).map((u) => (
              <button
                key={u}
                onClick={() => onUnitChange(u)}
                className={`btn-option w-16 text-center ${u === unit ? 'btn-active' : 'btn-inactive'}`}
              >
                {u === 1 ? '1 VP' : '½ VP'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 font-medium tracking-[0.15em] uppercase mb-2.5">
            Incomplete Games
          </label>
          <div className="flex gap-2 flex-wrap">
            {INCOMPLETE_OPTIONS.map(({ value, label: optLabel, title }) => (
              <button
                key={value}
                title={title}
                onClick={() => onIncompleteModeChange(value)}
                className={`btn-option px-3 text-center ${value === incomplete ? 'btn-active' : 'btn-inactive'}`}
              >
                {optLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

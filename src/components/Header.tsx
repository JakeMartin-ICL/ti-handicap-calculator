interface Props {
  loading: boolean;
  error: string | null;
  gameCount: number;
}

export default function Header({ loading, error, gameCount }: Props) {
  return (
    <header className="text-center pt-12 pb-8 px-4">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-gold-500 opacity-70" />
        <span className="font-display text-gold-500 text-[10px] tracking-[0.35em] uppercase">
          Twilight Imperium IV
        </span>
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-gold-500 opacity-70" />
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-semibold text-slate-100 tracking-wide mb-3">
        Handicap Calculator
      </h1>

      <div className="mt-5 h-5 flex items-center justify-center">
        {loading && (
          <span className="text-xs text-slate-600 animate-pulse tracking-wide">
            Loading game data…
          </span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
        {!loading && !error && gameCount > 0 && (
          <span className="text-xs text-slate-600">
            {gameCount.toLocaleString()} qualifying games loaded
          </span>
        )}
      </div>
    </header>
  );
}

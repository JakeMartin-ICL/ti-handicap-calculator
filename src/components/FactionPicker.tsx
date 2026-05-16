interface Props {
  playerCount: number;
  factions: string[];
  selectedFactions: (string | null)[];
  onFactionChange: (seatIndex: number, faction: string | null) => void;
}

export default function FactionPicker({
  playerCount,
  factions,
  selectedFactions,
  onFactionChange,
}: Props) {
  const usedSet = new Set(selectedFactions.filter(Boolean) as string[]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <span className="card-title">Faction Filter</span>
          <span className="text-[10px] text-slate-600 tracking-wider uppercase">Optional</span>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i}>
              <label className="block text-[10px] text-slate-600 tracking-wider uppercase mb-1.5">
                Seat {i + 1}
              </label>
              <select
                value={selectedFactions[i] ?? ''}
                onChange={(e) => onFactionChange(i, e.target.value || null)}
                className="faction-select"
              >
                <option value="">— Any —</option>
                {factions.map((f) => (
                  <option
                    key={f}
                    value={f}
                    disabled={usedSet.has(f) && selectedFactions[i] !== f}
                  >
                    {f}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

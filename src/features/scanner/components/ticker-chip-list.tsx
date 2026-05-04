'use client';

export function TickerChipList({
  symbols,
  onRemove,
}: {
  symbols: string[];
  onRemove: (symbol: string) => void;
}) {
  if (symbols.length === 0)
    return <p className="text-sm text-slate-500">Add one or more tickers to scan.</p>;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Selected tickers">
      {symbols.map((symbol) => (
        <span
          key={symbol}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900"
        >
          {symbol}
          <button
            type="button"
            aria-label={`Remove ${symbol}`}
            className="text-slate-500 hover:text-slate-900"
            onClick={() => onRemove(symbol)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

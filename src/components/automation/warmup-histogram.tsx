/**
 * 24-bar hour-of-day histogram (UTC) of warmup runs. Single series, so no
 * legend; each bar carries a hover tooltip and an accessible label.
 */
export function WarmupHistogram({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((sum, value) => sum + value, 0);

  return (
    <figure className="space-y-1">
      <div
        className="flex h-24 items-end gap-[2px] border-b border-slate-700"
        role="img"
        aria-label={`Warmup runs by hour (UTC), ${total} total`}
      >
        {counts.map((count, hour) => (
          <div key={hour} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-[var(--accent)] transition-opacity group-hover:opacity-80"
              style={{ height: count ? `${Math.max(4, (count / max) * 100)}%` : "0%" }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 shadow group-hover:block">
              {String(hour).padStart(2, "0")}:00 · {count} run{count === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between text-[10px] text-slate-500">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23 UTC</span>
      </figcaption>
    </figure>
  );
}

import { cn } from "@/lib/utils";

export type BarListItem = { label: string; value: number; display: string; detail?: string };

/**
 * Horizontal single-series bars: label left, value at the bar tip. Identity is
 * carried by the row label, so one accent hue is enough and no legend is needed.
 */
export function BarList({ items, emptyText = "No data yet." }: { items: BarListItem[]; emptyText?: string }) {
  const max = Math.max(0, ...items.map((item) => item.value));
  if (!items.length) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(80px,140px)_1fr] items-center gap-3 text-sm" title={item.detail}>
          <span className="truncate text-slate-300">{item.label}</span>
          <span className="flex items-center gap-2">
            <span
              className={cn("h-3 rounded-r-[4px] bg-[var(--accent)]", item.value <= 0 && "bg-transparent")}
              style={{ width: max > 0 ? `${Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 80)}%` : "0%" }}
            />
            <span className="whitespace-nowrap tabular-nums text-slate-200">{item.display}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

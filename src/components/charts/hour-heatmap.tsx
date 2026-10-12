import { percent } from "@/components/charts/format";

type HourHeatmapProps = { rows: { label: string; values: (number | null)[] }[] };

/**
 * Rows × 24 UTC hours. Sequential single hue: brighter = higher engagement
 * rate; empty cells mean no posts at that hour.
 */
export function HourHeatmap({ rows }: HourHeatmapProps) {
  const max = Math.max(0, ...rows.flatMap((row) => row.values.filter((v): v is number => v !== null)));

  return (
    <figure className="space-y-2 overflow-x-auto">
      <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-[2px] text-[10px]">
        <thead>
          <tr>
            <th className="w-28" />
            {Array.from({ length: 24 }, (_, hour) => (
              <th key={hour} className="font-normal text-slate-500">
                {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="truncate pr-2 text-left text-xs font-normal text-slate-300">{row.label}</th>
              {row.values.map((value, hour) => {
                const text = `${row.label} · ${String(hour).padStart(2, "0")}:00 UTC · ${value === null ? "no posts" : percent(value)}`;
                return (
                  <td
                    key={hour}
                    title={text}
                    aria-label={text}
                    className="h-6 rounded-[3px]"
                    style={
                      value === null
                        ? { boxShadow: "inset 0 0 0 1px rgb(51 65 85 / 0.6)" }
                        : { background: `color-mix(in srgb, var(--accent) ${Math.round(20 + 80 * (max ? value / max : 0))}%, #0b1426)` }
                    }
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="flex items-center gap-2 text-[11px] text-slate-500">
        <span>Engagement rate</span>
        <span>0</span>
        <span className="h-2 w-24 rounded-sm" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--accent) 20%, #0b1426), var(--accent))" }} />
        <span>{max ? percent(max) : "—"}</span>
        <span className="ml-3 inline-block h-2 w-3 rounded-sm" style={{ boxShadow: "inset 0 0 0 1px rgb(51 65 85 / 0.6)" }} />
        <span>no posts</span>
      </figcaption>
    </figure>
  );
}

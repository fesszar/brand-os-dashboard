"use client";

import { useState } from "react";

import { compactNumber, percent } from "@/components/charts/format";

type Point = { x: string; y: number };

type TimeSeriesChartProps = {
  points: Point[];
  label: string;
  /** Named so server components can pass it (functions are not serializable). */
  format: "compact" | "percent";
  height?: number;
};

const FORMATTERS = {
  compact: compactNumber,
  percent: (value: number) => percent(value, 1),
};

const WIDTH = 600;
const PAD = { top: 12, right: 12, bottom: 22, left: 44 };

/**
 * Single-series line chart (2px line, hairline grid, crosshair + tooltip).
 * Uses a fixed viewBox and scales to its container width.
 */
export function TimeSeriesChart({ points, label, format, height = 180 }: TimeSeriesChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const formatValue = FORMATTERS[format];

  if (points.length === 0) {
    return <p className="text-sm text-slate-400">No {label.toLowerCase()} data yet.</p>;
  }

  const max = Math.max(...points.map((p) => p.y)) || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const xAt = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => max * f);
  const active = hover !== null ? points[hover] : null;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label}: ${points.length} points from ${points[0].x} to ${points[points.length - 1].x}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const ratio = (x - PAD.left) / innerW;
          setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yAt(tick)} y2={yAt(tick)} stroke="rgb(51 65 85 / 0.6)" strokeWidth={1} />
            <text x={PAD.left - 6} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[10px]">
              {formatValue(tick)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={height - 6} className="fill-slate-500 text-[10px]">
          {points[0].x}
        </text>
        <text x={WIDTH - PAD.right} y={height - 6} textAnchor="end" className="fill-slate-500 text-[10px]">
          {points[points.length - 1].x}
        </text>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.length === 1 ? <circle cx={xAt(0)} cy={yAt(points[0].y)} r={4} fill="var(--accent)" /> : null}
        {active && hover !== null ? (
          <g>
            <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgb(148 163 184 / 0.5)" strokeWidth={1} />
            <circle cx={xAt(hover)} cy={yAt(active.y)} r={4} fill="var(--accent)" stroke="#071021" strokeWidth={2} />
          </g>
        ) : null}
      </svg>
      {active && hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow"
          style={{ left: `${(xAt(hover) / WIDTH) * 100}%` }}
        >
          <span className="text-slate-400">{active.x}</span> · {formatValue(active.y)}
        </div>
      ) : null}
    </figure>
  );
}

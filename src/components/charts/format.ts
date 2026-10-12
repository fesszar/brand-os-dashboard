/**
 * Compact number formatting for axis ticks and stat values (1.2K, 3.4M).
 */
export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

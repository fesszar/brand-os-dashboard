"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PublishFilters } from "@/lib/types";

type PublishFiltersBarProps = {
  filters: PublishFilters;
  brandIds: string[];
  platforms: string[];
  contentTypes: string[];
  onChange: (next: PublishFilters) => void;
};

export function PublishFiltersBar({
  filters,
  brandIds,
  platforms,
  contentTypes,
  onChange,
}: PublishFiltersBarProps) {
  const set = (key: keyof PublishFilters, value: string) => onChange({ ...filters, [key]: value || undefined });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="space-y-1 text-xs text-slate-400">
        Brand
        <Select aria-label="Brand" value={filters.brandId ?? ""} onChange={(e) => set("brandId", e.target.value)}>
          <option value="">All brands</option>
          {brandIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-xs text-slate-400">
        Platform
        <Select aria-label="Platform" value={filters.platform ?? ""} onChange={(e) => set("platform", e.target.value)}>
          <option value="">All platforms</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-xs text-slate-400">
        Content type
        <Select
          aria-label="Content type"
          value={filters.contentType ?? ""}
          onChange={(e) => set("contentType", e.target.value)}
        >
          <option value="">All types</option>
          {contentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-xs text-slate-400">
        From
        <Input aria-label="From date" type="date" value={filters.from ?? ""} onChange={(e) => set("from", e.target.value)} />
      </label>
      <label className="space-y-1 text-xs text-slate-400">
        To
        <Input aria-label="To date" type="date" value={filters.to ?? ""} onChange={(e) => set("to", e.target.value)} />
      </label>
    </div>
  );
}

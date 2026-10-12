"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";

import { PublishEntryDetail } from "@/components/publishing/publish-entry-detail";
import { PublishFiltersBar } from "@/components/publishing/publish-filters-bar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filterPublishHistory } from "@/lib/publish-filters";
import type { PublishEntry, PublishFilters } from "@/lib/types";

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function toQuery(filters: PublishFilters) {
  const params = new URLSearchParams();
  const keys: [keyof PublishFilters, string][] = [
    ["brandId", "brand"],
    ["platform", "platform"],
    ["contentType", "contentType"],
    ["from", "from"],
    ["to", "to"],
  ];
  for (const [key, param] of keys) {
    if (filters[key]) {
      params.set(param, filters[key] as string);
    }
  }
  return params.toString();
}

export function PublishHistoryView({ entries, brandIds }: { entries: PublishEntry[]; brandIds: string[] }) {
  const [filters, setFilters] = useState<PublishFilters>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const platforms = useMemo(() => unique(entries.flatMap((e) => [...e.postedTargets, ...e.failedTargets])), [entries]);
  const contentTypes = useMemo(() => unique(entries.map((e) => e.contentType)), [entries]);
  const visible = useMemo(() => filterPublishHistory(entries, filters), [entries, filters]);
  const query = toQuery(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Published Posts</CardTitle>
          <CardDescription>
            {visible.length} of {entries.length} results
          </CardDescription>
        </div>
        <a
          href={`/api/publish-history/export${query ? `?${query}` : ""}`}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </CardHeader>
      <CardContent className="space-y-4">
        <PublishFiltersBar
          filters={filters}
          brandIds={brandIds}
          platforms={platforms}
          contentTypes={contentTypes}
          onChange={setFilters}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length ? (
                visible.map((entry) => {
                  const open = expanded === entry.id;
                  return (
                    <Fragment key={entry.id}>
                      <TableRow
                        className="cursor-pointer"
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : entry.id)}
                      >
                        <TableCell>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {entry.date} <span className="text-slate-400">{entry.time}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.brandId}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {entry.postedTargets.map((target) => (
                              <Badge key={target} variant="success">
                                {target}
                              </Badge>
                            ))}
                            {entry.failedTargets.map((target) => (
                              <Badge key={target} variant="destructive">
                                {target} ✕
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">{entry.contentType}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-xs text-slate-400">
                          {entry.captionPreview || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={entry.ok ? "published" : "failed"} />
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-slate-950/60">
                            <PublishEntryDetail entry={entry} />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400">
                    No publish results match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

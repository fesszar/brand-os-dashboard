"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/request-json";
import type { PublishEntry } from "@/lib/types";

/**
 * Expanded publish row: captions per platform, Postiz IDs and lazily loaded raw JSON.
 */
export function PublishEntryDetail({ entry }: { entry: PublishEntry }) {
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/publish-history/${entry.brandId}/${entry.slotDir}/${encodeURIComponent(entry.reportFile)}`;
      const payload = await requestJson<{ report: unknown }>(url);
      setReport(JSON.stringify(payload.report, null, 2));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const captions = Object.entries(entry.captions);

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-3 md:grid-cols-2">
        {captions.length ? (
          captions.map(([platform, text]) => (
            <div key={platform} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{platform}</p>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{text}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">No captions saved for this slot.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>Postiz post IDs:</span>
        {entry.postizPostIds.length ? (
          entry.postizPostIds.map((id) => (
            <Badge key={id} variant="outline" className="font-mono">
              {id}
            </Badge>
          ))
        ) : (
          <span>none</span>
        )}
        <span className="ml-auto font-mono text-slate-500">{entry.reportPath}</span>
      </div>

      {report ? (
        <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          {report}
        </pre>
      ) : (
        <Button variant="outline" size="sm" onClick={loadReport} disabled={loading}>
          {loading ? "Loading…" : "View publish result JSON"}
        </Button>
      )}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrandPlatformSettings, PostizStatus } from "@/lib/platform-settings";

type PostizConnectionCardProps = {
  postiz: { baseUrl: string; apiKeyMasked: string; configured: boolean; lastStatus: PostizStatus | null };
  brands: BrandPlatformSettings[];
  busy: boolean;
  onTest: () => void;
};

export function PostizConnectionCard({ postiz, brands, busy, onTest }: PostizConnectionCardProps) {
  const rows = brands.flatMap((brand) =>
    Object.entries(brand.integrations).map(([platform, id]) => ({ brandId: brand.brandId, platform, id })),
  );
  const status = postiz.lastStatus;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Postiz Connection</CardTitle>
          <CardDescription className="font-mono">{postiz.baseUrl}</CardDescription>
        </div>
        <Button onClick={onTest} disabled={busy}>
          Test Connection
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs text-slate-400">API key</dt>
            <dd className="mt-1 font-mono text-slate-100">{postiz.configured ? postiz.apiKeyMasked : "Not configured"}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs text-slate-400">Last check</dt>
            <dd className="mt-1 text-slate-100">{status ? new Date(status.checkedAt).toLocaleString() : "Never"}</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <dt className="text-xs text-slate-400">Sync status</dt>
            <dd className="mt-1 flex items-center gap-2">
              {status ? (
                <Badge variant={status.ok ? "success" : "destructive"}>{status.ok ? "Connected" : "Error"}</Badge>
              ) : (
                <Badge variant="outline">Unknown</Badge>
              )}
              <span className="text-xs text-slate-400">{status?.message}</span>
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Integration ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={`${row.brandId}-${row.platform}`}>
                    <TableCell>{row.brandId}</TableCell>
                    <TableCell className="capitalize">{row.platform}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{row.id}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-400">
                    No Postiz integrations mapped in brand-marketing/config.json.
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

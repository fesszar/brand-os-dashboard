import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BrandOverviewTabProps = {
  brandName: string;
  category?: string;
  status: string;
  draftCount: number;
  scriptCount: number;
  publishedCount: number;
  integrations: Record<string, string>;
};

export function BrandOverviewTab({
  brandName,
  category,
  status,
  draftCount,
  scriptCount,
  publishedCount,
  integrations,
}: BrandOverviewTabProps) {
  const integrationEntries = Object.entries(integrations || {});

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Brand</CardDescription>
            <CardTitle>{brandName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <StatusBadge status={status} />
            {category ? <Badge variant="outline">{category}</Badge> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Drafts Queued</CardDescription>
            <CardTitle>{draftCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Scripts</CardDescription>
            <CardTitle>{scriptCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Published</CardDescription>
            <CardTitle>{publishedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Postiz integration mapping for this brand</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {integrationEntries.length ? (
            integrationEntries.map(([platform, integrationId]) => (
              <Badge key={platform} variant="outline">
                {platform}: {integrationId}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-400">No integrations mapped.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

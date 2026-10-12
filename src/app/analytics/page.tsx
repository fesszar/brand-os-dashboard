import { AnalyticsNav } from "@/components/analytics/analytics-nav";
import { BrandPerformanceSection } from "@/components/analytics/brand-performance-section";
import { BrandPicker } from "@/components/analytics/brand-picker";
import { CrossBrandSection } from "@/components/analytics/cross-brand-section";
import { PageHeader } from "@/components/page-header";
import { getBrandPerformance, getCrossBrandAnalytics } from "@/lib/analytics-data";
import { getBrandIds } from "@/lib/brand-os";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const [{ brand }, brandIds, crossBrand] = await Promise.all([searchParams, getBrandIds(), getCrossBrandAnalytics()]);
  const selected = brand && brandIds.includes(brand) ? brand : (crossBrand.brands[0]?.brandId ?? brandIds[0]);
  const performance = selected ? await getBrandPerformance(selected) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Cross-Brand Performance"
        description="Engagement across brands, platforms, formats and posting times, from each brand's experiments.jsonl."
        actions={<AnalyticsNav active="/analytics" />}
      />
      <CrossBrandSection data={crossBrand} />

      {performance ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-100">Brand performance</h2>
            <BrandPicker brandIds={brandIds} value={performance.brandId} basePath="/analytics" />
          </div>
          <BrandPerformanceSection data={performance} />
        </section>
      ) : null}
    </div>
  );
}

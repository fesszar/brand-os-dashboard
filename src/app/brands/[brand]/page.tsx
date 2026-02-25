import { notFound } from "next/navigation";

import { BrandWorkspaceTabs } from "@/components/brand/brand-workspace-tabs";
import {
  getBrandDetail,
  getBrandIds,
  getBrandList,
  getCalendarItems,
  listPublishHistory,
  listScripts,
  listUploads,
} from "@/lib/brand-os";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const brandIds = await getBrandIds();

  if (!brandIds.includes(brand)) {
    notFound();
  }

  const [brands, detail, calendarItems, scripts, uploads, publishHistory] =
    await Promise.all([
      getBrandList(),
      getBrandDetail(brand),
      getCalendarItems(),
      listScripts(brand),
      listUploads(brand),
      listPublishHistory(),
    ]);

  const brandCard = brands.find((entry) => entry.id === brand);
  const storybookBrand =
    detail.storybook && typeof detail.storybook.brand === "object"
      ? (detail.storybook.brand as Record<string, unknown>)
      : null;

  const brandName =
    (storybookBrand && typeof storybookBrand.name === "string" && storybookBrand.name) ||
    brandCard?.name ||
    brand;

  const category =
    (storybookBrand && typeof storybookBrand.category === "string"
      ? storybookBrand.category
      : undefined) || brandCard?.category;

  const tagline =
    (storybookBrand && typeof storybookBrand.tagline === "string"
      ? storybookBrand.tagline
      : undefined) || brandCard?.tagline;

  const brandCalendar = calendarItems.filter((item) => item.brandId === brand);
  const brandPublishHistory = publishHistory.filter((entry) => entry.brandId === brand);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Brand Workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">{brandName}</h1>
        <p className="mt-2 text-sm text-slate-400">{tagline || "Brand detail command view"}</p>
      </section>

      <BrandWorkspaceTabs
        brandId={brand}
        brandName={brandName}
        category={category}
        status={brandCard?.status || "inactive"}
        drafts={detail.drafts}
        scripts={scripts}
        uploads={uploads}
        calendarItems={brandCalendar}
        publishHistory={brandPublishHistory}
        integrations={detail.integrations}
      />
    </div>
  );
}

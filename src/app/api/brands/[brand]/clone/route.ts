import { badRequest, ok } from "@/lib/api";
import { cloneBrand } from "@/lib/brand-management";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

export async function POST(request: Request, context: { params: Promise<{ brand: string }> }) {
  const source = decodeSegment((await context.params).brand);
  if (!isValidBrandId(source)) {
    return badRequest("invalid brand id");
  }
  const body = (await request.json().catch(() => ({}))) as { brandId?: unknown; name?: unknown };
  try {
    return ok(await cloneBrand({ sourceBrandId: source, brandId: body.brandId, name: body.name }), { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "could not clone brand");
  }
}

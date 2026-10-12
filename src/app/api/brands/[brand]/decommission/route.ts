import { badRequest, ok } from "@/lib/api";
import { decommissionBrand } from "@/lib/brand-management";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

export async function POST(_request: Request, context: { params: Promise<{ brand: string }> }) {
  const brand = decodeSegment((await context.params).brand);
  if (!isValidBrandId(brand)) {
    return badRequest("invalid brand id");
  }
  try {
    return ok(await decommissionBrand(brand));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "could not decommission brand", 404);
  }
}

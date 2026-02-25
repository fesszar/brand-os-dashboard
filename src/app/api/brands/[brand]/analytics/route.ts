import { badRequest, ok, serverError } from "@/lib/api";
import { getBrandPerformance } from "@/lib/brand-os";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brand: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);

    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const experiments = await getBrandPerformance(brand);
    return ok({ brandId: brand, experiments });
  } catch (error) {
    return serverError(error);
  }
}

import { badRequest, ok, serverError } from "@/lib/api";
import { getBrandPerformance } from "@/lib/analytics-data";
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

    return ok({ brandId: brand, performance: await getBrandPerformance(brand) });
  } catch (error) {
    return serverError(error);
  }
}

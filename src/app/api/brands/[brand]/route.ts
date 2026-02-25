import { badRequest, ok, serverError } from "@/lib/api";
import { getBrandDetail, getBrandIds } from "@/lib/brand-os";
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

    const brandIds = await getBrandIds();
    if (!brandIds.includes(brand)) {
      return badRequest(`brand '${brand}' not found`, 404);
    }

    const detail = await getBrandDetail(brand);
    return ok({ brand: detail });
  } catch (error) {
    return serverError(error);
  }
}

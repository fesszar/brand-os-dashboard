import { badRequest, ok, serverError } from "@/lib/api";
import { getPublishReport } from "@/lib/publishing";
import { decodeSegment, isValidBrandId, isValidFileName, isValidSlotDir } from "@/lib/route-validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brand: string; slot: string; file: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);
    const slot = decodeSegment(params.slot);
    const file = decodeSegment(params.file);

    if (!isValidBrandId(brand) || !isValidSlotDir(slot) || !isValidFileName(file)) {
      return badRequest("invalid report path");
    }

    const report = await getPublishReport(brand, slot, file);
    if (!report) {
      return badRequest("report not found", 404);
    }
    return ok({ report });
  } catch (error) {
    return serverError(error);
  }
}

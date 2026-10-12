import { badRequest, ok, serverError } from "@/lib/api";
import { runCron } from "@/lib/crons";
import { getWarmupStatus } from "@/lib/pipeline";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

/**
 * Manually triggers the warmup cron job mapped to a brand.
 */
export async function POST(_request: Request, context: { params: Promise<{ brand: string }> }) {
  try {
    const brand = decodeSegment((await context.params).brand);
    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const status = (await getWarmupStatus()).find((entry) => entry.brandId === brand);
    if (!status?.cronId) {
      return badRequest(`no warmup cron job found for ${brand}`, 404);
    }

    const result = await runCron(status.cronId);
    return ok(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return serverError(error);
  }
}

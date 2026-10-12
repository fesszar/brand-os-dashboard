import { badRequest, ok } from "@/lib/api";
import { setExperimentStatus } from "@/lib/analytics-data";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ brand: string; id: string }> },
) {
  const params = await context.params;
  const brand = decodeSegment(params.brand);
  const id = decodeSegment(params.id);
  if (!isValidBrandId(brand) || !isValidBrandId(id)) {
    return badRequest("invalid brand or experiment id");
  }

  const body = (await request.json().catch(() => ({}))) as { status?: unknown };
  if (body.status !== "active" && body.status !== "archived") {
    return badRequest("status must be 'active' or 'archived'");
  }

  try {
    return ok(await setExperimentStatus(brand, id, body.status));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "update failed", 404);
  }
}

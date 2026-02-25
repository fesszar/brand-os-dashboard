import { badRequest, ok, serverError } from "@/lib/api";
import { triggerDraftGeneration } from "@/lib/brand-os";

export async function POST(
  request: Request,
  context: { params: Promise<{ brand: string }> },
) {
  try {
    const { brand } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { slot?: string };

    if (!body.slot) {
      return badRequest("slot is required");
    }

    const result = await triggerDraftGeneration(brand, body.slot);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}

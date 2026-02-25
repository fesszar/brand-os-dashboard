import { badRequest, ok, serverError } from "@/lib/api";
import { triggerDraftPublish } from "@/lib/brand-os";

export async function POST(
  request: Request,
  context: { params: Promise<{ brand: string }> },
) {
  try {
    const { brand } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { slotDir?: string };

    if (!body.slotDir) {
      return badRequest("slotDir is required");
    }

    const result = await triggerDraftPublish(brand, body.slotDir);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}

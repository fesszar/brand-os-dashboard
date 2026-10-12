import { badRequest, ok, serverError } from "@/lib/api";
import { toggleCron } from "@/lib/crons";
import { decodeSegment, isValidCronId } from "@/lib/route-validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeSegment((await context.params).id);
    if (!isValidCronId(id)) {
      return badRequest("invalid cron id");
    }

    const body = (await request.json().catch(() => ({}))) as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") {
      return badRequest("enabled must be a boolean");
    }

    return ok(await toggleCron(id, body.enabled));
  } catch (error) {
    return serverError(error);
  }
}

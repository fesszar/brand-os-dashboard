import { badRequest, ok, serverError } from "@/lib/api";
import { runCron } from "@/lib/crons";
import { decodeSegment, isValidCronId } from "@/lib/route-validation";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = decodeSegment((await context.params).id);
    if (!isValidCronId(id)) {
      return badRequest("invalid cron id");
    }

    const result = await runCron(id);
    return ok(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return serverError(error);
  }
}

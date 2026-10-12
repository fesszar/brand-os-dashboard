import { ok, serverError } from "@/lib/api";
import { listCrons } from "@/lib/crons";

export async function GET() {
  try {
    return ok(await listCrons());
  } catch (error) {
    return serverError(error);
  }
}

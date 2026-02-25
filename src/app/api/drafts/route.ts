import { listDrafts } from "@/lib/brand-os";
import { ok, serverError } from "@/lib/api";

export async function GET() {
  try {
    const drafts = await listDrafts();
    return ok({ drafts });
  } catch (error) {
    return serverError(error);
  }
}

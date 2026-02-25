import { getHealthSummary } from "@/lib/brand-os";
import { ok, serverError } from "@/lib/api";

export async function GET() {
  try {
    const health = await getHealthSummary();
    return ok({ health });
  } catch (error) {
    return serverError(error);
  }
}

import { ok, serverError } from "@/lib/api";
import { getPipelineMonitor } from "@/lib/pipeline";

export async function GET() {
  try {
    return ok({ brands: await getPipelineMonitor() });
  } catch (error) {
    return serverError(error);
  }
}

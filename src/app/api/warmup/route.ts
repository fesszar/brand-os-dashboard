import { ok, serverError } from "@/lib/api";
import { getWarmupStatus } from "@/lib/pipeline";

export async function GET() {
  try {
    return ok({ brands: await getWarmupStatus() });
  } catch (error) {
    return serverError(error);
  }
}

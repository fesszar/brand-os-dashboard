import { ok, serverError } from "@/lib/api";
import { getCrossBrandAnalytics } from "@/lib/analytics-data";

export async function GET() {
  try {
    return ok(await getCrossBrandAnalytics());
  } catch (error) {
    return serverError(error);
  }
}

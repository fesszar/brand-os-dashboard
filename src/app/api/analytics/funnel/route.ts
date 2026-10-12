import { ok, serverError } from "@/lib/api";
import { getFunnelAnalytics } from "@/lib/analytics-data";

export async function GET() {
  try {
    return ok(await getFunnelAnalytics());
  } catch (error) {
    return serverError(error);
  }
}

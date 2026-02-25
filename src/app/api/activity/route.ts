import { getActivityFeed } from "@/lib/brand-os";
import { ok, serverError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "50");
    const activity = await getActivityFeed(limit);
    return ok({ activity });
  } catch (error) {
    return serverError(error);
  }
}

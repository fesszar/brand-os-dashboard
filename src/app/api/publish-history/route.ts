import { ok, serverError } from "@/lib/api";
import { filterPublishHistory, listPublishHistory, parsePublishFilters } from "@/lib/publishing";

export async function GET(request: Request) {
  try {
    const filters = parsePublishFilters(new URL(request.url).searchParams);
    const entries = filterPublishHistory(await listPublishHistory(), filters);
    return ok({ entries, filters });
  } catch (error) {
    return serverError(error);
  }
}

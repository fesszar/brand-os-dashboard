import { format } from "date-fns";

import { serverError } from "@/lib/api";
import {
  filterPublishHistory,
  listPublishHistory,
  parsePublishFilters,
  publishHistoryToCsv,
} from "@/lib/publishing";

export async function GET(request: Request) {
  try {
    const filters = parsePublishFilters(new URL(request.url).searchParams);
    const csv = publishHistoryToCsv(filterPublishHistory(await listPublishHistory(), filters));
    const fileName = `publish-history-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

import { badRequest, ok, serverError } from "@/lib/api";
import { createExperiment, listAllExperiments } from "@/lib/analytics-data";

export async function GET() {
  try {
    return ok({ experiments: await listAllExperiments() });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return badRequest("JSON body required");
  }
  try {
    return ok({ experiment: await createExperiment(body) }, { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "invalid experiment");
  }
}

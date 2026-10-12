import { badRequest, ok, serverError } from "@/lib/api";
import { getGlobalSettings, updateGlobalSettings } from "@/lib/global-settings";

export async function GET() {
  try {
    return ok(await getGlobalSettings());
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return badRequest("JSON body required");
  }
  try {
    return ok(await updateGlobalSettings(body));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "invalid settings");
  }
}

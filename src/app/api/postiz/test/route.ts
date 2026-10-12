import { ok, serverError } from "@/lib/api";
import { testPostizConnection } from "@/lib/platform-settings";

export async function POST() {
  try {
    return ok(await testPostizConnection());
  } catch (error) {
    return serverError(error);
  }
}

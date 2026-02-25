import { badRequest, ok, serverError } from "@/lib/api";
import { listScripts } from "@/lib/brand-os";
import { isValidBrandId } from "@/lib/route-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");

    if (brand && !isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const scripts = await listScripts(brand ?? undefined);
    return ok({ scripts });
  } catch (error) {
    return serverError(error);
  }
}

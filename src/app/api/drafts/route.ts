import { listDrafts } from "@/lib/brand-os";
import { badRequest, ok, serverError } from "@/lib/api";
import { isValidBrandId } from "@/lib/route-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const date = searchParams.get("date");

    if (brand && !isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest("date must be YYYY-MM-DD");
    }

    const drafts = await listDrafts({
      brandId: brand ?? undefined,
      date: date ?? undefined,
    });

    return ok({ drafts });
  } catch (error) {
    return serverError(error);
  }
}

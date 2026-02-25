import { badRequest, ok, serverError } from "@/lib/api";
import { getCalendarItems } from "@/lib/brand-os";
import { isValidBrandId } from "@/lib/route-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");

    if (brand && !isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const items = await getCalendarItems();
    const filtered = brand ? items.filter((item) => item.brandId === brand) : items;

    return ok({ items: filtered });
  } catch (error) {
    return serverError(error);
  }
}

import { badRequest, ok, serverError } from "@/lib/api";
import { getStorybook, updateStorybook } from "@/lib/brand-os";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ brand: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);

    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const storybook = await getStorybook(brand);
    if (!storybook) {
      return badRequest(`brand '${brand}' not found`, 404);
    }

    return ok({ brandId: brand, storybook });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ brand: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);

    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const body = (await request.json().catch(() => ({}))) as { storybook?: unknown };
    if (!body.storybook || typeof body.storybook !== "object" || Array.isArray(body.storybook)) {
      return badRequest("storybook must be a JSON object");
    }

    await updateStorybook(brand, body.storybook);
    const updated = await getStorybook(brand);
    return ok({ brandId: brand, storybook: updated });
  } catch (error) {
    return serverError(error);
  }
}

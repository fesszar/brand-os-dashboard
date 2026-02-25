import { badRequest, ok, serverError } from "@/lib/api";
import { getScreenshots, saveScreenshot } from "@/lib/brand-os";
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

    const screenshots = await getScreenshots(brand);
    return ok({ brandId: brand, screenshots });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ brand: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);

    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return badRequest("file is required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = await saveScreenshot(brand, file.name || "screenshot.png", buffer);

    return ok({
      ok: true,
      brandId: brand,
      file: {
        name: file.name,
        path,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

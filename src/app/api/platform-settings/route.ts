import { badRequest, ok, serverError } from "@/lib/api";
import { getBrandIds } from "@/lib/brand-os";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform-settings";
import { isValidBrandId } from "@/lib/route-validation";

export async function GET() {
  try {
    return ok(await getPlatformSettings(await getBrandIds()));
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    defaults?: unknown;
    brandId?: unknown;
    overrides?: unknown;
  } | null;

  if (!body || (body.defaults === undefined && body.brandId === undefined)) {
    return badRequest("provide defaults and/or brandId with overrides");
  }
  if (body.brandId !== undefined && (typeof body.brandId !== "string" || !isValidBrandId(body.brandId))) {
    return badRequest("invalid brand id");
  }

  try {
    await updatePlatformSettings({
      defaults: body.defaults,
      brandId: body.brandId as string | undefined,
      overrides: body.overrides,
    });
    return ok(await getPlatformSettings(await getBrandIds()));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "invalid settings");
  }
}

import { badRequest, ok, serverError } from "@/lib/api";
import { addHookAngle, getHookRotation, updateHookRotation } from "@/lib/brand-os";
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

    const hookRotation = await getHookRotation(brand);
    return ok({ brandId: brand, angles: hookRotation });
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

    const body = (await request.json().catch(() => ({}))) as { angles?: unknown };
    if (!body.angles || typeof body.angles !== "object" || Array.isArray(body.angles)) {
      return badRequest("angles payload must be a JSON object");
    }

    await updateHookRotation(brand, body.angles);
    const updated = await getHookRotation(brand);
    return ok({ brandId: brand, angles: updated });
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

    const body = (await request.json().catch(() => ({}))) as {
      angle?: Record<string, unknown>;
    };

    if (!body.angle || typeof body.angle !== "object" || Array.isArray(body.angle)) {
      return badRequest("angle must be a JSON object");
    }

    const updated = await addHookAngle(brand, body.angle);
    return ok({ brandId: brand, angles: updated });
  } catch (error) {
    return serverError(error);
  }
}

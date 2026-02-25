import { badRequest, ok, serverError } from "@/lib/api";
import { deleteScript, getScript, updateScript } from "@/lib/brand-os";
import { decodeSegment, isValidBrandId, isValidSlotDir } from "@/lib/route-validation";

function parseScriptParams(rawBrand: string, rawSlot: string) {
  const brand = decodeSegment(rawBrand);
  const slot = decodeSegment(rawSlot);

  if (!isValidBrandId(brand)) {
    throw new Error("invalid brand id");
  }

  if (!isValidSlotDir(slot)) {
    throw new Error("invalid slot directory");
  }

  return { brand, slot };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ brand: string; slot: string }> },
) {
  try {
    const params = await context.params;
    const { brand, slot } = parseScriptParams(params.brand, params.slot);
    const script = await getScript(brand, slot);
    return ok({ script });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ brand: string; slot: string }> },
) {
  try {
    const params = await context.params;
    const { brand, slot } = parseScriptParams(params.brand, params.slot);

    const body = (await request.json().catch(() => ({}))) as {
      json?: unknown;
      markdown?: unknown;
    };

    const hasChanges = body.json !== undefined || body.markdown !== undefined;
    if (!hasChanges) {
      return badRequest("provide at least one of: json, markdown");
    }

    if (body.json !== undefined && (typeof body.json !== "object" || Array.isArray(body.json))) {
      return badRequest("json must be a JSON object");
    }

    if (body.markdown !== undefined && typeof body.markdown !== "string") {
      return badRequest("markdown must be a string");
    }

    const script = await updateScript(brand, slot, {
      json: body.json as Record<string, unknown> | undefined,
      markdown: body.markdown as string | undefined,
    });

    return ok({ script });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ brand: string; slot: string }> },
) {
  try {
    const params = await context.params;
    const { brand, slot } = parseScriptParams(params.brand, params.slot);
    const result = await deleteScript(brand, slot);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

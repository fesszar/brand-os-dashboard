import { badRequest, ok, serverError } from "@/lib/api";
import { deleteDraft, getDraft, updateDraft } from "@/lib/brand-os";
import { decodeSegment, isValidBrandId, isValidSlotDir } from "@/lib/route-validation";

function parseDraftParams(rawBrand: string, rawSlot: string) {
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
    const { brand, slot } = parseDraftParams(params.brand, params.slot);
    const draft = await getDraft(brand, slot);
    return ok({ draft });
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
    const { brand, slot } = parseDraftParams(params.brand, params.slot);

    const body = (await request.json().catch(() => ({}))) as {
      meta?: Record<string, unknown>;
      captions?: Record<string, unknown>;
      texts?: unknown[];
    };

    const captions = body.captions
      ? Object.entries(body.captions).reduce<Record<string, string>>((acc, [key, value]) => {
          if (typeof value === "string") {
            acc[key] = value;
          }
          return acc;
        }, {})
      : undefined;

    const hasChanges =
      body.meta !== undefined ||
      captions !== undefined ||
      body.texts !== undefined;

    if (!hasChanges) {
      return badRequest("provide at least one of: meta, captions, texts");
    }

    const draft = await updateDraft(brand, slot, {
      meta: body.meta,
      captions,
      texts: body.texts,
    });

    return ok({ draft });
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
    const { brand, slot } = parseDraftParams(params.brand, params.slot);
    const result = await deleteDraft(brand, slot);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

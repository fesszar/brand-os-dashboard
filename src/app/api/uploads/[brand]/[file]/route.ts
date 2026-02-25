import { badRequest, ok, serverError } from "@/lib/api";
import { deleteUpload, updateUploadStatus } from "@/lib/brand-os";
import {
  decodeSegment,
  isValidBrandId,
  isValidFileName,
} from "@/lib/route-validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ brand: string; file: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);
    const file = decodeSegment(params.file);

    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    if (!isValidFileName(file)) {
      return badRequest("invalid file name");
    }

    const body = (await request.json().catch(() => ({}))) as { status?: string };

    if (!body.status || !["pending", "posted", "published"].includes(body.status)) {
      return badRequest("status must be one of: pending, posted, published");
    }

    const result = await updateUploadStatus(
      brand,
      file,
      body.status as "pending" | "posted" | "published",
    );

    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ brand: string; file: string }> },
) {
  try {
    const params = await context.params;
    const brand = decodeSegment(params.brand);
    const file = decodeSegment(params.file);

    if (!isValidBrandId(brand)) {
      return badRequest("invalid brand id");
    }

    if (!isValidFileName(file)) {
      return badRequest("invalid file name");
    }

    const result = await deleteUpload(brand, file);
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}

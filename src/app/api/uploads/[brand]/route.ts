import { badRequest, ok, serverError } from "@/lib/api";
import { listUploads, saveUpload } from "@/lib/brand-os";
import { decodeSegment, isValidBrandId } from "@/lib/route-validation";

const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm"]);

function isAllowedMediaFile(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(extension);
}

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

    const uploads = await listUploads(brand);
    return ok({ brandId: brand, uploads });
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
    const directFile = formData.get("file");
    const listFiles = formData.getAll("files");

    const files = [directFile, ...listFiles].filter((value): value is File => value instanceof File);

    if (!files.length) {
      return badRequest("at least one file is required");
    }

    const saved = [] as Array<{ name: string; path: string; size: number; type: string }>;

    for (const file of files) {
      if (!isAllowedMediaFile(file.name)) {
        return badRequest(`unsupported file extension for '${file.name}'`);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const path = await saveUpload(brand, file.name, buffer);

      saved.push({
        name: file.name,
        path,
        size: file.size,
        type: file.type,
      });
    }

    return ok({
      ok: true,
      brandId: brand,
      uploaded: saved,
    });
  } catch (error) {
    return serverError(error);
  }
}

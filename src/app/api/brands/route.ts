import { badRequest, ok, serverError } from "@/lib/api";
import { createBrand } from "@/lib/brand-management";
import { getBrandList } from "@/lib/brand-os";

export async function GET() {
  try {
    const brands = await getBrandList();
    return ok({ brands });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return badRequest("JSON body required");
  }
  try {
    return ok(await createBrand(body), { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "could not create brand");
  }
}

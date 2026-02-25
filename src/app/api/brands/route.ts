import { getBrandList } from "@/lib/brand-os";
import { ok, serverError } from "@/lib/api";

export async function GET() {
  try {
    const brands = await getBrandList();
    return ok({ brands });
  } catch (error) {
    return serverError(error);
  }
}

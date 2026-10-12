/**
 * Client-side fetch wrapper: sends JSON (or FormData) and throws with the
 * API's `message` when the response is not ok.
 */
export async function requestJson<T = Record<string, unknown>>(url: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
  }

  return payload as T;
}

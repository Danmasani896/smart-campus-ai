export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(
  /\/+$/,
  "",
);
let sessionToken: string | null = null;
export const setToken = (token: string | null) => {
  sessionToken = token;
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error(
      "Cannot reach the campus server. Check your connection and that the backend is running.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(" ")
        : data.message || `Request failed (${response.status}).`,
    );
  return data as T;
}

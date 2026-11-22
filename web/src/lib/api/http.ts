/** 浏览器走 Next 同源代理，避免直连 :3001 被 CORS / 防火墙拦截 */
// All browser requests stay same-origin and are forwarded by Next.js.
// This avoids browser-side CORS/IPv6 failures when the API only listens on IPv4.
export const API_BASE = "/szr3-api";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("szr3_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("szr3_token", token);
  } else {
    localStorage.removeItem("szr3_token");
  }
}

export async function http<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "网络请求失败";
    const message =
      raw === "Failed to fetch" || raw === "fetch failed"
        ? "无法连接线上服务，请刷新页面后重试"
        : raw;
    throw new ApiError(message, 0);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const raw = body.message ?? body.error;
    const message = Array.isArray(raw)
      ? raw.join("; ")
      : (raw ?? `请求失败 (${res.status})`);
    throw new ApiError(message, res.status);
  }

  return body as T;
}

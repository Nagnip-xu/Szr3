import { API_BASE, getToken } from "./http";

const PROTECTED_PATH_MARKERS = [
  "/assets/files/",
  "/assets/presets/",
] as const;

const mediaSessionVersion =
  typeof window === "undefined" ? "0" : Date.now().toString(36);

function isProtectedAssetUrl(url: string) {
  return PROTECTED_PATH_MARKERS.some((marker) => url.includes(marker));
}

/** 将服务端返回的绝对/相对资源 URL 统一为同源 /szr3-api 代理路径 */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();

  if (trimmed.startsWith(`${API_BASE}/`)) {
    return trimmed;
  }

  if (trimmed.startsWith("/api/assets/")) {
    return `${API_BASE}${trimmed.slice("/api".length)}`;
  }

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/\/api\/assets\/(.+)$/);
    if (match) {
      return `${API_BASE}/assets/${match[1]}${parsed.search}`;
    }
  } catch {
    // 外部 CDN 链接等非 API 资源保持原样。
  }

  return trimmed;
}

/** 为需 JWT 的本地资源 URL 附加 access_token，供 audio/video/img 标签加载 */
export function withAuthToken(url: string | null | undefined): string | undefined {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return undefined;

  const token = getToken();
  if (!isProtectedAssetUrl(resolved)) return resolved;
  if (!token) return undefined;

  if (/[?&]access_token=/.test(resolved)) return resolved;
  const sep = resolved.includes("?") ? "&" : "?";
  return `${resolved}${sep}access_token=${encodeURIComponent(token)}&media_session=${mediaSessionVersion}`;
}

/** 判断 URL 是否应使用 video 标签（含无扩展名的预设样片 API） */
export function isVideoMediaUrl(url: string) {
  return (
    /\.(mp4|webm|mov)(\?|$)/i.test(url) ||
    /\/assets\/presets\/avatars\//i.test(url)
  );
}

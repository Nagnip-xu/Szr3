import { API_BASE, getToken } from "./http";

export interface UploadResult {
  filename: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
): Promise<UploadResult> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/assets/projects/${projectId}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = body.message ?? body.error;
    const message = Array.isArray(raw)
      ? raw.join("; ")
      : (raw ?? `上传失败 (${res.status})`);
    throw new Error(message);
  }

  return body as UploadResult;
}

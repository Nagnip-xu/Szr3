import { API_BASE, getToken } from "./http";

export interface RenderJobStatus {
  jobId: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  outputFile?: string;
  videoUrl?: string;
  downloadUrl?: string;
  segmentCount?: number;
  model?: string;
  duration?: number;
  coverUrl?: string;
}

export async function pollRenderJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onProgress?: (job: RenderJobStatus) => void;
  },
): Promise<RenderJobStatus> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 300000;
  const started = Date.now();
  let connectionFailures = 0;

  while (Date.now() - started < timeoutMs) {
    const token = getToken();
    let res: Response | undefined;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        res = await fetch(`${API_BASE}/workflow/jobs/${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        connectionFailures = 0;
        break;
      } catch {
        connectionFailures += 1;
        if (false) {
          throw new Error(
            "无法连接 API 服务，请确认后端已启动（localhost:3001）",
          );
        }
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    if (!res) {
      if (connectionFailures >= 24) {
        throw new Error("API service unavailable after repeated retries");
      }
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
      throw new Error("无法连接 API 服务，请确认后端已启动（localhost:3001）");
    }
    const body = (await res.json()) as RenderJobStatus & { message?: string };
    if (!res.ok) {
      throw new Error(body.message ?? "查询任务失败");
    }
    options?.onProgress?.(body);
    if (body.status === "completed" || body.status === "failed") {
      return body;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("渲染超时，请稍后在创作空间重试");
}

export async function downloadProjectFinal(projectId: string, filename = "成片.mp4") {
  const token = getToken();
  const res = await fetch(`${API_BASE}/assets/projects/${projectId}/download/final`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "下载失败");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

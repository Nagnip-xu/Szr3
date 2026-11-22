/**
 * 真实后端 API 客户端 — 对接 NestJS (localhost:3001)
 */
import type { SubtitleSegment } from "@/lib/types/subtitle";
import type { AdminOverview, LoginResponse, ProfileResponse, RegistrationCodeRecord, WorkspaceResponse } from "@/lib/types/auth";
import type { PipConfig } from "@/lib/types/pip";
import { http } from "./http";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function ok<T>(data: T, message = "操作成功"): ApiResponse<T> {
  return { success: true, data, message };
}

function fail(message: string): ApiResponse<never> {
  return { success: false, message };
}

async function wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return fail("解析超时，请稍后重试（1 分钟视频通常 30 秒–2 分钟）");
    }
    const message = err instanceof Error ? err.message : "请求失败";
    return fail(message);
  }
}

export const authApi = {
  login(email: string, password: string) {
    return http<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  adminLogin(email: string, password: string) {
    return http<LoginResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register(params: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
    registrationCode: string;
  }) {
    return http<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  me() {
    return http<ProfileResponse>("/auth/me");
  },
};

export const adminApi = {
  overview() { return http<AdminOverview>("/admin/overview"); },
  registrationCodes() { return http<RegistrationCodeRecord[]>("/admin/registration-codes"); },
  createRegistrationCodes(params: { count: number; note?: string; expiresAt?: string }) {
    return http<{ code: string; note: string | null; expiresAt: string | null }[]>("/admin/registration-codes", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};

export const workspaceApi = {
  get() {
    return http<WorkspaceResponse>("/organizations/workspace");
  },

  updateOrganization(name: string) {
    return http<{ id: string; name: string }>("/organizations/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },
};

export const complianceApi = {
  status() { return http<{ consentVersion: string; retentionDays: number; duixLicenseAcknowledgedAt: string | null }>("/compliance/status"); },
  createConsent(params: { projectId: string; type: "voice_clone" | "avatar_clone"; subjectName?: string }) {
    return http<{ id: string }>("/compliance/consents", { method: "POST", body: JSON.stringify(params) });
  },
  acknowledgeDuixLicense() { return http<{ duixLicenseAcknowledgedAt: string }>("/compliance/duix-license", { method: "POST" }); },
};

export const projectsApi = {
  list() {
    return http<
      { id: string; name: string; status: string; updatedAt: string }[]
    >("/projects");
  },

  get(id: string) {
    return http<{ id: string; name: string; state: Record<string, unknown> }>(
      `/projects/${id}`,
    );
  },

  create(name?: string, stateJson?: string) {
    return http<{ id: string; name: string }>("/projects", {
      method: "POST",
      body: JSON.stringify({ name, stateJson }),
    });
  },

  update(
    id: string,
    data: { name?: string; status?: string; stateJson?: string },
  ) {
    return http<{ id: string }>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  remove(id: string) {
    return http<{ success: boolean }>(`/projects/${id}`, {
      method: "DELETE",
    });
  },
};

export const api = {
  async extractScript(
    url: string,
    projectId?: string,
  ): Promise<
    ApiResponse<{
      script: string;
      title?: string;
      cover?: string;
      videoUrl?: string;
      scriptPending?: boolean;
      scriptHint?: string;
      subtitleSegments?: SubtitleSegment[];
      durationMs?: number;
      asrModel?: string;
      hasWordTimestamps?: boolean;
    }>
  > {
    return wrap(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 360_000);
      try {
        return await http<{
          script: string;
          title?: string;
          cover?: string;
          videoUrl?: string;
          scriptPending?: boolean;
          scriptHint?: string;
          subtitleSegments?: SubtitleSegment[];
          durationMs?: number;
          asrModel?: string;
          hasWordTimestamps?: boolean;
        }>("/workflow/extract-script", {
          method: "POST",
          body: JSON.stringify({ url, projectId }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    });
  },

  async rewriteScript(params: {
    script: string;
    mode: "auto" | "custom";
    customPrompt?: string;
  }): Promise<ApiResponse<{ script: string }>> {
    return wrap(() =>
      http<{ script: string }>("/workflow/rewrite-script", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    );
  },

  async reviewScript(script: string): Promise<ApiResponse<{
    safe: boolean;
    riskLevel: string;
    summary: string;
    optimized: string;
    findings: { term: string; replacement: string; reason: string; count: number }[];
  }>> {
    return wrap(() => http('/workflow/review-script', {
      method: 'POST',
      body: JSON.stringify({ script }),
    }));
  },

  async generateAudio(params: {
    text: string;
    voiceId: string;
    rate: number;
    projectId?: string | null;
  }): Promise<
    ApiResponse<{
      audioUrl: string;
      duration: number;
      durationMs?: number;
      subtitleSegments?: SubtitleSegment[];
      model?: string;
      voice?: string;
    }>
  > {
    return wrap(() =>
      http<{
        audioUrl: string;
        duration: number;
        durationMs?: number;
        subtitleSegments?: SubtitleSegment[];
        model?: string;
        voice?: string;
      }>(
        "/workflow/generate-audio",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      ),
    );
  },

  async generateDigitalHuman(params: {
    projectId?: string | null;
    avatarId: string;
    audioUrl: string;
    referenceVideoUrl?: string | null;
  }): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return wrap(() =>
      http<{ jobId: string; status: string }>(
        "/workflow/generate-digital-human",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      ),
    );
  },

  async generateSubtitles(params: {
    projectId?: string | null;
    videoUrl: string;
    script: string;
    style: Record<string, unknown>;
    subtitleSegments?: SubtitleSegment[];
    audioUrl?: string | null;
  }): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return wrap(() =>
      http<{ jobId: string; status: string }>("/workflow/generate-subtitles", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    );
  },

  async generateBgm(params: {
    projectId?: string | null;
    videoUrl: string;
    volume: number;
    bgmUrl?: string | null;
  }): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return wrap(() =>
      http<{ jobId: string; status: string }>("/workflow/generate-bgm", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    );
  },

  async renderFinal(params: {
    projectId?: string | null;
    videoUrl: string;
    subtitleSegments?: SubtitleSegment[];
    style?: Record<string, unknown>;
    bgmUrl?: string | null;
    bgmVolume?: number;
    useBgm?: boolean;
    addAiWatermark?: boolean;
    audioUrl?: string | null;
    script?: string;
    title?: string;
    pip?: PipConfig;
    coverUrl?: string | null;
    publishWithCover?: boolean;
  }): Promise<
    ApiResponse<{
      jobId: string;
      status: string;
    }>
  > {
    return wrap(() =>
      http<{ jobId: string; status: string }>("/workflow/render-final", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    );
  },

  async generateTitle(params: {
    script: string;
  }): Promise<ApiResponse<{ title: string; hashtags: string }>> {
    return wrap(() =>
      http<{ title: string; hashtags: string }>(
        "/workflow/generate-title",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      ),
    );
  },

  async generateCover(params: {
    projectId?: string | null;
    text: string;
    style: Record<string, unknown>;
    videoUrl?: string | null;
    baseImageUrl?: string | null;
  }): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return wrap(() =>
      http<{ jobId: string; status: string }>("/workflow/generate-cover", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    );
  },

  async applyPip(params: {
    projectId?: string | null;
    videoUrl: string;
    pip: PipConfig;
  }): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return wrap(() =>
      http<{ jobId: string; status: string }>("/workflow/apply-pip", {
        method: "POST",
        body: JSON.stringify({
          projectId: params.projectId,
          videoUrl: params.videoUrl,
          enabled: params.pip.enabled,
          assetUrl: params.pip.assetUrl,
          assetTag: params.pip.assetTag,
          position: params.pip.position,
          scale: params.pip.scale,
          opacity: params.pip.opacity,
          startSec: params.pip.startSec,
          durationSec: params.pip.durationSec,
          borderRadius: params.pip.borderRadius,
        }),
      }),
    );
  },

  async trainCustomVoice(params: {
    projectId: string;
    audioUrl: string;
    name?: string;
    consentId: string;
  }): Promise<
    ApiResponse<{ id: string; name: string; tag: string }>
  > {
    return wrap(() =>
      http<{ id: string; name: string; tag: string }>(
        "/workflow/train-custom-voice",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      ),
    );
  },

  async saveCustomAvatar(params: {
    projectId: string;
    videoUrl: string;
    name?: string;
    consentId: string;
  }): Promise<
    ApiResponse<{
      id: string;
      name: string;
      preview: string;
      referenceVideo: string;
      tag: string;
    }>
  > {
    return wrap(() =>
      http<{
        id: string;
        name: string;
        preview: string;
        referenceVideo: string;
        tag: string;
      }>("/workflow/save-custom-avatar", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    );
  },

  async deleteCustomAvatar(
    avatarId: string,
  ): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    return wrap(() =>
      http<{ id: string; deleted: boolean }>(
        `/workflow/custom-avatars/${encodeURIComponent(avatarId)}`,
        {
          method: "DELETE",
        },
      ),
    );
  },

  async getWorkflowOptions(): Promise<
    ApiResponse<{
      avatars: {
        id: string;
        name: string;
        preview: string;
        previewVideo?: string;
        referenceVideo?: string;
        tag?: string;
      }[];
      voices: { id: string; name: string; tag: string }[];
    }>
  > {
    return wrap(() =>
      http("/workflow/options"),
    );
  },
};

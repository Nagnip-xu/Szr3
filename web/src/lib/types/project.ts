export type TabId = "studio" | "workspace" | "profile";

export type WorkflowStepId =
  | "script"
  | "voice"
  | "avatar"
  | "polish"
  | "export";

import type { PipConfig } from "./pip";
import { defaultPipConfig } from "./pip";
import type { SubtitleSegment } from "./subtitle";

export type RewriteMode = "auto" | "custom";

export interface ProjectState {
  sourceUrl: string;
  parsedTitle: string;
  parsedCover: string;
  parsedVideoUrl: string | null;
  originalScript: string;
  subtitleSegments: SubtitleSegment[];
  durationMs: number;
  asrModel: string;
  hasWordTimestamps: boolean;
  rewrittenScript: string;
  rewriteMode: RewriteMode;
  customPrompt: string;
  voiceId: string;
  speechRate: number;
  audioUrl: string | null;
  audioDuration: number;
  avatarId: string;
  referenceVideoUrl: string | null;
  digitalHumanVideoUrl: string | null;
  /** 当前 digitalHumanVideoUrl 对应的 avatarId，用于预览与换数字人时判重 */
  digitalHumanAvatarId: string | null;
  subtitleFont: string;
  subtitleSize: number;
  subtitleBottom: number;
  subtitleColor: string;
  subtitleStrokeColor: string;
  bgmVolume: number;
  useBgm: boolean;
  customBgm: boolean;
  title: string;
  hashtags: string;
  coverText: string;
  coverFont: string;
  coverFontSize: number;
  coverColor: string;
  coverHighlightColor: string;
  coverPosition: "top" | "center" | "bottom";
  useCustomCover: boolean;
  noCover: boolean;
  aiCoverText: boolean;
  addAiWatermark: boolean;
  publishWithCover: boolean;
  pip: PipConfig;
  projectId: string | null;
  projectName: string;
  finalVideoUrl: string | null;
  bgmUrl: string | null;
  processedVideoUrl: string | null;
  coverUrl: string | null;
  videoTemplateId: string;
}

export const defaultProjectState: ProjectState = {
  sourceUrl: "",
  parsedTitle: "",
  parsedCover: "",
  parsedVideoUrl: null,
  originalScript: "",
  subtitleSegments: [],
  durationMs: 0,
  asrModel: "",
  hasWordTimestamps: false,
  rewrittenScript: "",
  rewriteMode: "auto",
  customPrompt: "",
  voiceId: "voice-001",
  speechRate: 1.1,
  audioUrl: null,
  audioDuration: 0,
  avatarId: "",
  referenceVideoUrl: null,
  digitalHumanVideoUrl: null,
  digitalHumanAvatarId: null,
  subtitleFont: "AlibabaPuHuiTi_2_105_Heavy",
  subtitleSize: 8,
  subtitleBottom: 60,
  subtitleColor: "#FFFFFF",
  subtitleStrokeColor: "#000000",
  bgmVolume: 0.2,
  useBgm: true,
  customBgm: false,
  title: "",
  hashtags: "",
  coverText: "把口播视频做成一条产线",
  coverFont: "AlibabaPuHuiTi_2_105_Heavy",
  coverFontSize: 280,
  coverColor: "#FFFFFF",
  coverHighlightColor: "#7aa2ff",
  coverPosition: "bottom",
  useCustomCover: true,
  noCover: false,
  aiCoverText: true,
  addAiWatermark: false,
  publishWithCover: true,
  pip: defaultPipConfig,
  projectId: null,
  projectName: "",
  finalVideoUrl: null,
  bgmUrl: null,
  processedVideoUrl: null,
  coverUrl: null,
  videoTemplateId: "none",
};

export interface VoiceOption {
  id: string;
  name: string;
  tag: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  preview: string;
  /** 内置数字人口播参考样片（mp4），可播放预览 */
  previewVideo?: string;
  tag?: string;
  referenceVideo?: string;
}

export function hasDigitalHumanOutput(
  project: Pick<
    ProjectState,
    "digitalHumanVideoUrl" | "digitalHumanAvatarId" | "avatarId"
  >,
) {
  return (
    !!project.digitalHumanVideoUrl &&
    !!project.avatarId &&
    project.digitalHumanAvatarId === project.avatarId
  );
}

export const WORKFLOW_STEPS: {
  id: WorkflowStepId;
  label: string;
  hint: string;
}[] = [
  { id: "script", label: "文案", hint: "解析链接或撰写口播" },
  { id: "voice", label: "配音", hint: "选择音色生成音频" },
  { id: "avatar", label: "数字人", hint: "Duix-Avatar 对口型" },
  { id: "polish", label: "包装", hint: "字幕、配乐与封面" },
  { id: "export", label: "导出", hint: "合成并下载成片" },
];

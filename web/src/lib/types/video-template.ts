import type { ProjectState } from "./project";
import type { PipConfig } from "./pip";

export interface VideoTemplate {
  id: string;
  name: string;
  tag: string;
  description: string;
  accent: string;
  previewClass: string;
  requiresPipAsset?: boolean;
  subtitle: Pick<ProjectState, "subtitleFont" | "subtitleSize" | "subtitleBottom" | "subtitleColor" | "subtitleStrokeColor">;
  bgm: Pick<ProjectState, "useBgm" | "bgmVolume">;
  pip: PipConfig;
}

const noPip: PipConfig = {
  enabled: false,
  assetUrl: null,
  assetTag: "产品展示",
  position: "bottom-right",
  scale: 0.32,
  opacity: 0.95,
  startSec: 0,
  durationSec: 8,
  borderRadius: 14,
};

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "none",
    name: "不用模板",
    tag: "自由编辑",
    description: "保留当前字幕、BGM 与画中画设置",
    accent: "#64748b",
    previewClass: "bg-[#283448]",
    subtitle: { subtitleFont: "AlibabaPuHuiTi_2_105_Heavy", subtitleSize: 8, subtitleBottom: 60, subtitleColor: "#FFFFFF", subtitleStrokeColor: "#000000" },
    bgm: { useBgm: true, bgmVolume: 0.2 },
    pip: noPip,
  },
  {
    id: "clean-caption",
    name: "经典白字 T1",
    tag: "清晰耐看",
    description: "白字黑描边，适合知识口播与日常分享",
    accent: "#76a5ff",
    previewClass: "bg-[#17375e]",
    subtitle: { subtitleFont: "AlibabaPuHuiTi_2_105_Heavy", subtitleSize: 9, subtitleBottom: 72, subtitleColor: "#FFFFFF", subtitleStrokeColor: "#101827" },
    bgm: { useBgm: true, bgmVolume: 0.16 },
    pip: noPip,
  },
  {
    id: "warm-highlight",
    name: "暖色强调 T2",
    tag: "情绪表达",
    description: "暖黄字幕配轻音乐，突出观点与情绪转折",
    accent: "#f3b562",
    previewClass: "bg-[#5b3020]",
    subtitle: { subtitleFont: "AlimamaShuHeiTi", subtitleSize: 10, subtitleBottom: 66, subtitleColor: "#FFE7A3", subtitleStrokeColor: "#552B18" },
    bgm: { useBgm: true, bgmVolume: 0.24 },
    pip: noPip,
  },
  {
    id: "product-pip",
    name: "产品画中画 T3",
    tag: "带素材编排",
    description: "主画面叠加 B-roll，适合商品、门店和案例介绍",
    accent: "#d47aff",
    previewClass: "bg-[#3d245c]",
    requiresPipAsset: true,
    subtitle: { subtitleFont: "SourceHanSans", subtitleSize: 8, subtitleBottom: 58, subtitleColor: "#FFFFFF", subtitleStrokeColor: "#25143d" },
    bgm: { useBgm: true, bgmVolume: 0.18 },
    pip: { ...noPip, enabled: true, position: "bottom-right", scale: 0.34, durationSec: 10 },
  },
  {
    id: "minimal",
    name: "极简原声 T4",
    tag: "突出人声",
    description: "干净字幕与原声，适合访谈、教程和专业内容",
    accent: "#61d7b2",
    previewClass: "bg-[#17473f]",
    subtitle: { subtitleFont: "SourceHanSans", subtitleSize: 8, subtitleBottom: 64, subtitleColor: "#E8FFF7", subtitleStrokeColor: "#0B3029" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "blue-tech",
    name: "科技蓝字 T5",
    tag: "产品讲解",
    description: "高对比蓝白字幕，适合软件、工具与知识讲解",
    accent: "#86b7ff",
    previewClass: "bg-[#18376d]",
    subtitle: { subtitleFont: "AlibabaPuHuiTi_2_105_Heavy", subtitleSize: 10, subtitleBottom: 74, subtitleColor: "#DDEBFF", subtitleStrokeColor: "#0B1B36" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "rose-story",
    name: "叙事粉字 T6",
    tag: "故事分享",
    description: "柔和粉白字幕，适合个人经历、情绪与生活内容",
    accent: "#ff9fb9",
    previewClass: "bg-[#5b263c]",
    subtitle: { subtitleFont: "AlimamaShuHeiTi", subtitleSize: 9, subtitleBottom: 62, subtitleColor: "#FFE1EA", subtitleStrokeColor: "#4A1930" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "yellow-hook",
    name: "开场黄字 T7",
    tag: "强开场",
    description: "醒目黄字黑描边，适合促销、观点和前三秒钩子",
    accent: "#ffd56a",
    previewClass: "bg-[#514018]",
    subtitle: { subtitleFont: "AlibabaPuHuiTi_2_105_Heavy", subtitleSize: 11, subtitleBottom: 76, subtitleColor: "#FFE270", subtitleStrokeColor: "#201A0A" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "professional",
    name: "专业灰白 T8",
    tag: "访谈教程",
    description: "低干扰灰白字幕，适合访谈、课程与专业解读",
    accent: "#c3d0e1",
    previewClass: "bg-[#314052]",
    subtitle: { subtitleFont: "SourceHanSans", subtitleSize: 8, subtitleBottom: 64, subtitleColor: "#F2F6FA", subtitleStrokeColor: "#1D2937" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "green-service",
    name: "门店绿字 T9",
    tag: "本地服务",
    description: "稳重绿色字幕，适合门店、服务流程和案例介绍",
    accent: "#90e4b8",
    previewClass: "bg-[#1c4d3a]",
    subtitle: { subtitleFont: "SourceHanSans", subtitleSize: 9, subtitleBottom: 68, subtitleColor: "#D9FFE9", subtitleStrokeColor: "#123427" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "corner-pip",
    name: "角落素材 T10",
    tag: "需要 B-roll",
    description: "右上角展示素材，适合演示、案例和产品细节",
    accent: "#a8a5ff",
    previewClass: "bg-[#2f2d63]",
    requiresPipAsset: true,
    subtitle: { subtitleFont: "AlibabaPuHuiTi_2_105_Heavy", subtitleSize: 8, subtitleBottom: 62, subtitleColor: "#FFFFFF", subtitleStrokeColor: "#171538" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: { ...noPip, enabled: true, position: "top-right", scale: 0.28, durationSec: 12 },
  },
  {
    id: "large-caption",
    name: "大字口播 T11",
    tag: "易读优先",
    description: "大字号近底字幕，适合移动端阅读与长辈受众",
    accent: "#ffffff",
    previewClass: "bg-[#3a3030]",
    subtitle: { subtitleFont: "AlibabaPuHuiTi_2_105_Heavy", subtitleSize: 12, subtitleBottom: 84, subtitleColor: "#FFFFFF", subtitleStrokeColor: "#111111" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
  {
    id: "orange-sale",
    name: "橙色促销 T12",
    tag: "活动推广",
    description: "橙黄高亮字幕，适合优惠活动、上新和限时信息",
    accent: "#ffb262",
    previewClass: "bg-[#623417]",
    subtitle: { subtitleFont: "AlimamaShuHeiTi", subtitleSize: 10, subtitleBottom: 70, subtitleColor: "#FFD09A", subtitleStrokeColor: "#4B210F" },
    bgm: { useBgm: false, bgmVolume: 0 },
    pip: noPip,
  },
];

export function findVideoTemplate(id?: string | null) {
  return VIDEO_TEMPLATES.find((template) => template.id === id) ?? VIDEO_TEMPLATES[0];
}

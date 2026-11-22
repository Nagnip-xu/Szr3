export type PipPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export interface PipConfig {
  enabled: boolean;
  assetUrl: string | null;
  assetTag: string;
  position: PipPosition;
  scale: number;
  opacity: number;
  startSec: number;
  durationSec: number;
  borderRadius: number;
}

export const defaultPipConfig: PipConfig = {
  enabled: true,
  assetUrl: null,
  assetTag: "产品特写",
  position: "bottom-right",
  scale: 0.35,
  opacity: 1,
  startSec: 3,
  durationSec: 8,
  borderRadius: 12,
};

export const PIP_ASSET_TAGS = [
  "产品特写",
  "工厂车间",
  "门店环境",
  "客户见证",
  "操作演示",
  "数据图表",
];

export const PIP_POSITIONS: { value: PipPosition; label: string }[] = [
  { value: "top-left", label: "左上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
  { value: "center", label: "居中" },
];

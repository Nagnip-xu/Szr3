import type { AvatarOption, VoiceOption } from "@/lib/types/project";

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "voice-001", name: "默认男声", tag: "HeyGem 克隆音" },
  { id: "voice-002", name: "默认女声", tag: "HeyGem 克隆音" },
  { id: "voice-003", name: "阳光男声", tag: "HeyGem 克隆音" },
  { id: "voice-004", name: "元气女声", tag: "HeyGem 克隆音" },
];

/** 系统预设已移除，数字人请通过上传保存 */
export const AVATAR_OPTIONS: AvatarOption[] = [];

export const SAMPLE_ORIGINAL_SCRIPT = `相信很多实体商家都非常需要这样一个工具。

每天刷抖音、视频号，看到别人的口播视频爆火，自己却不知道怎么写文案、怎么拍、怎么说。

今天我就来给大家分享一个完整的解决方案——从链接解析到数字人成片，全流程自动化。

第一，复制爆款视频链接，一键提取口播文案；
第二，AI 分析爆火逻辑，自动改写成你行业的版本；
第三，选择数字人形象和音色，生成自然口播视频；
第四，自动加字幕、配乐、封面，直接发布各平台。

如果你也是实体商家，评论区扣 1，我把详细方案发给你。`;

export const SAMPLE_REWRITTEN_SCRIPT = `做实体店的老板们，是不是每天都在为短视频发愁？

同行一条视频几十万播放，自己的却没人看——不是你不努力，是缺一套可复制的产线。

今天分享一套从「抄爆款」到「出成片」的全流程工具：

链接一贴，口播文案自动提取；
AI 按你的行业改写，不用自己憋词；
上传你的正脸口播参考视频，选音色，一键生成对口型数字人；
字幕、配乐、封面全自动，下载就能发。

实体老板想试的，评论区扣 1，我把方案发你。`;

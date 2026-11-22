# 星轨数字人

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

中文短视频与口播内容创作者。官网面向希望了解产品、访问 GitHub 项目的访客；用户已将官网主要行动改为打开 GitHub 仓库。

## Product Purpose

把文案提取、文案改写、配音、数字人生成和字幕后期连接到一个工作台，帮助创作者完成口播视频制作。官网让访客看懂这条流程并前往 GitHub 查看源码与运行指南。

## Operating Context

现有产品为 Next.js 工作台、NestJS API、数据库与远程 GPU 服务，另有 Windows Electron 客户端。官网是独立静态站点，目标为 GitHub Pages；用户已审阅官网并授权上传整个项目、发布 GitHub Pages。现有后端运行故障的修复不是本轮官网建设的范围。

## Capabilities and Constraints

仓库记录已接入：授权链接文案提取、文案改写、标题生成、配音与授权音色克隆、数字人、字幕、BGM、画中画及 MP4 导出。多平台自动发布尚未接入，官网不能宣传自动发布。精确价格、性能指标、客户数量和案例未经用户提供，不能编造。官网互动演示不能冒充在线 GPU 生成，官网不包含申请表，主要按钮直接跳转 GitHub。

## Brand Commitments

沿用“星轨数字人”中文产品名称。面向中文读者，用清楚、具体的表达介绍创作过程。官网本轮可建立独立的营销视觉语言。

## Evidence on Hand

README.md 及 docs 中有产品能力说明；web/src 中有真实工作台组件；api/storage/presets/defaults 下有三个现有预设数字人 MP4。产品现有联系入口为 1626814667@qq.com。没有用户提供的品牌手册、客户证言、实测效率指标或定价。

## Product Principles

- 让访客能理解从文案到成片的完整过程。
- 展示真实能力，明确演示和实际生成的边界。
- 动效用于解释流程、状态和作品的变化。
- 官网无需登录或依赖后端即可浏览。
- 移动设备、键盘和减少动态效果模式均可使用。

## Open Decisions

GitHub 仓库为 Nagnip-xu/Szr3，官网发布到 https://nagnip-xu.github.io/Szr3/。公开内容不包含真实环境变量、数据库与用户媒体。

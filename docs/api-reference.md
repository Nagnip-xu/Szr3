# API 接口参考

[返回项目首页](../README.md)

以下路径省略全局前缀 `/api`。接口以 `api/src` 中的 Controller 和 DTO 为准。

## API 基本信息

API 全局前缀为 `/api`，默认地址为 `http://127.0.0.1:3001/api`。浏览器请求通常通过 Next.js 同源代理转发。除健康检查和登录/注册外，接口需要 `Authorization: Bearer <JWT_TOKEN>`。

### 健康检查

| 方法 | 路径            | 权限 | 用途                                |
| ---- | --------------- | ---- | ----------------------------------- |
| GET  | `/health`       | 无   | 检查 API 进程和数据库查询           |
| GET  | `/health/ready` | 无   | 检查数据库、GPU 视频服务和 TTS 服务 |

### 认证接口

| 方法 | 路径                | 权限 | 用途                       |
| ---- | ------------------- | ---- | -------------------------- |
| POST | `/auth/register`    | 无   | 使用邮箱、密码和注册码注册 |
| POST | `/auth/login`       | 无   | 普通用户登录并获取 JWT     |
| POST | `/auth/admin/login` | 无   | 唯一管理员账号登录         |
| GET  | `/auth/me`          | JWT  | 获取当前用户资料           |

### 管理员接口

管理员接口同时要求 JWT 和平台管理员权限。

| 方法 | 路径                        | 用途                               |
| ---- | --------------------------- | ---------------------------------- |
| GET  | `/admin/overview`           | 用户、组织、项目、任务和使用量统计 |
| GET  | `/admin/registration-codes` | 查看注册码和使用状态               |
| POST | `/admin/registration-codes` | 批量创建注册码、备注和有效期       |

### 工作流接口

| 方法   | 路径                                 | 用途                                 |
| ------ | ------------------------------------ | ------------------------------------ |
| POST   | `/workflow/extract-script`           | 解析链接，提取文案、字幕、时长和封面 |
| POST   | `/workflow/rewrite-script`           | 自动或自定义提示词改写文案           |
| POST   | `/workflow/review-script`            | 审查文案并返回风险建议               |
| POST   | `/workflow/generate-audio`           | HeyGem TTS 生成音频任务              |
| POST   | `/workflow/generate-digital-human`   | Duix-Avatar 生成数字人视频           |
| POST   | `/workflow/generate-subtitles`       | 创建字幕烧录任务                     |
| POST   | `/workflow/generate-bgm`             | 创建 BGM 混音任务                    |
| POST   | `/workflow/render-final`             | 创建最终成片渲染任务                 |
| GET    | `/workflow/jobs/:jobId`              | 查询异步任务状态和结果               |
| POST   | `/workflow/generate-title`           | 生成标题和话题                       |
| GET    | `/workflow/options`                  | 获取数字人、音色和工作流配置         |
| POST   | `/workflow/generate-cover`           | 生成/保存项目封面任务                |
| POST   | `/workflow/apply-pip`                | 应用画中画合成任务                   |
| POST   | `/workflow/train-voice`              | 预置音色参考音频预处理               |
| POST   | `/workflow/train-custom-voice`       | 训练用户授权的自定义音色             |
| POST   | `/workflow/save-custom-avatar`       | 保存授权的自定义数字人视频           |
| DELETE | `/workflow/custom-avatars/:avatarId` | 删除自定义数字人                     |

工作流接口通常返回 `jobId`，前端通过 `/workflow/jobs/:jobId` 轮询；提交成功不等于成片已经完成。

### 项目、组织和合规接口

| 方法   | 路径                       | 用途                         |
| ------ | -------------------------- | ---------------------------- |
| GET    | `/projects`                | 获取当前组织项目列表         |
| GET    | `/projects/:id`            | 获取项目和状态 JSON          |
| POST   | `/projects`                | 创建项目                     |
| PATCH  | `/projects/:id`            | 更新项目名称和状态           |
| DELETE | `/projects/:id`            | 删除项目                     |
| GET    | `/organizations/workspace` | 获取工作台和额度信息         |
| PATCH  | `/organizations/me`        | 更新组织信息                 |
| GET    | `/compliance/status`       | 获取授权及条款状态           |
| POST   | `/compliance/consents`     | 创建声音/肖像/数字人授权记录 |
| POST   | `/compliance/duix-license` | 确认 Duix 使用条款           |

### 素材和下载接口

| 方法 | 路径                                          | 用途                            |
| ---- | --------------------------------------------- | ------------------------------- |
| POST | `/assets/projects/:projectId/upload`          | 上传项目素材，单文件上限 200 MB |
| GET  | `/assets/files/:orgId/:projectId/:filename`   | 受保护素材流，视频支持 Range    |
| GET  | `/assets/presets/avatars/:avatarId/poster`    | 获取预设数字人海报              |
| GET  | `/assets/presets/avatars/:avatarId`           | 获取预设数字人参考视频          |
| GET  | `/assets/projects/:projectId/download/final`  | 下载 `final.mp4`                |
| GET  | `/assets/projects/:projectId/download/latest` | 下载最新视频                    |

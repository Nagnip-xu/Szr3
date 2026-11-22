# 2026-11-22 运行故障排查与修复记录

## 已确认的线上故障

| 检查项 | 实测结果 | 影响 |
| --- | --- | --- |
| 域名解析 | `xinggui.xin` 正常解析至 ECS | DNS 不是此次故障原因 |
| HTTPS | `CERT_HAS_EXPIRED`；证书于北京时间 2026-11-19 15:15:04 过期 | 桌面端拒绝连接，登录、素材和工作流请求均受影响 |
| 正在运行的旧桌面代理 `/health` | HTTP 502，提示“无法连接线上服务，请检查网络后重试” | 完整复现截图问题，原提示没有区分证书问题 |
| 线上 `/api/health` | HTTP 200，`database: ready` | API 进程和数据库仍正常 |
| 线上 `/api/health/ready` | HTTP 503，`Duix services are not ready` | 视频/TTS 服务未就绪，续期证书后仍需修复 GPU 连接 |
| ECS SSH | 未配置可用凭据，认证失败 | 无法更新线上证书或部署后端修复 |
| 本机 `.env` 中的 GPU SSH 配置 | 认证失败 | 需要核对当前 GPU 实例、端口和凭据；线上具体 SSH 配置尚未读取 |

线上公共健康状态通过一次不携带认证信息的诊断请求确认。只有该次诊断临时跳过过期证书校验；应用请求和新诊断脚本继续严格校验证书。

## 已修复的源码问题

- 桌面端：抽出可测试的 HTTPS 转发模块，明确区分证书过期、证书验证失败、DNS 和超时错误，返回可诊断的错误码；保留 TLS 校验及系统代理支持。
- GPU 隧道：首次连接失败后自动重试；重试失败后继续安排下一次重试；恢复 SSH 时补建本地转发端口，避免仅 SSH 连接恢复却没有可用隧道。
- GPU 健康检查：要求视频和 TTS 服务同时可达，避免只恢复一个服务就返回就绪。
- 视频预览：通过媒体地址作为组件 key 重置播放和失败状态，修正同步 effect 状态更新导致的 lint 错误。
- 运维：新增 `api/scripts/repair-https.sh` 和 SSH 执行入口 `repair-https.mjs`，提供证书续期、nginx 重载、自动续期定时器和续期演练；新增桌面端 `check:connection` 命令。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `api`: `npm.cmd test` | 10 项通过，包含 GPU 多次重连、端口重绑和视频/TTS 故障组合 |
| `desktop-exe`: `npm.cmd test` | 4 项 HTTPS 集成测试通过，覆盖正常转发、过期证书、不受信任证书和域名不匹配；无效证书时未向服务发送登录信息 |
| `web`: `npm.cmd run build` | 通过 |
| `web`: `npm.cmd run lint` | 通过 |
| 证书修复脚本 | Bash 语法及 Node 入口语法检查通过；尚未在线上执行 |
| 新桌面代理直连线上 | 返回明确的 `CERT_HAS_EXPIRED` 和证书续期提示，验证问题定位正确 |

## 待完成的线上恢复

1. 在 `api/.env` 配置有效的 `ECS_HOST`、`ECS_USER`、`ECS_PASSWORD`，或 `ECS_PRIVATE_KEY_PATH`。
2. 执行 `cd api`、`npm.cmd run repair:https`，续期证书并验证自动续期。
3. 核对 GPU 实例运行状态和当前 SSH 配置，恢复视频、TTS、ASR 容器及隧道；部署后端重连和健康检查修复。
4. 执行 `cd desktop-exe`、`npm.cmd run check:connection`，要求两个接口均返回 200，再实际验收登录及音视频生成。

目前未修改正在运行的已安装 EXE，未部署线上代码，未执行证书续期。证书在服务器更新后，原客户端即可恢复正常 TLS 连接，无需为证书续期重装客户端。完整登录和生成流程尚未验收。

具体证书恢复操作见 `operations.md` 的“HTTPS 证书过期导致桌面端无法登录”。

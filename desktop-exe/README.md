# 星轨数字人 Windows 桌面版

`desktop-exe` 是完全独立的 Electron 桌面工程。构建时只读取上一级 `web` 作为基础，并将副本写入本目录的 `build`；不会改动网站前端、网站 API 或线上部署。

## 当前版本

- 当前发布版本：`1.0.7`。
- 客户交付物：仅发送 `dist/Szr3-Setup-<版本>.exe` 安装包。
- 客户无需安装 Node.js、MySQL、FFmpeg 或开发环境；需要 Windows 10/11 x64 和可用网络。
- 下载文件默认保存到“下载/星轨数字人”。
- 登录、账号、注册码、项目与 AI/GPU 服务继续使用 `https://xinggui.xin/api`，与线上系统保持同一套权限和数据。

## 连接故障排查

运行 `npm.cmd run check:connection` 检查线上 HTTPS 和 API 健康状态。`CERT_HAS_EXPIRED` 表示线上证书过期，需要按 `../docs/operations.md` 的步骤修复服务器证书；客户端保留严格 TLS 校验。新的桌面代理会分别提示证书过期、证书验证失败、DNS 错误和连接超时。

运行 `npm.cmd test` 验证桌面代理的 HTTPS 转发，以及过期、不受信任、域名不匹配的证书会在发送登录信息前被拒绝。

## 桌面端差异

- `overrides/` 保存只属于 EXE 的界面覆盖层。它在复制网站前端后才覆盖到构建副本，网站页面不会受影响。
- 登录页不含演示账号或密码。可选“记住密码”，凭据使用 Windows 的加密存储保存，只在此电脑可读取；取消勾选会立即清除。
- 注册页要求填写“确认密码”，本机先校验两次密码一致再提交。
- 数字人面板最多展示三个卡片；超过三个时可通过“查看所有数字人”弹窗选择。单击选择，双击打开详情与预览视频。
- 三个系统预设数字人由服务端的 `avatar-001`、`avatar-002`、`avatar-003` 提供，预览素材仍由服务器缓存和权限接口控制。

## 构建新安装包

```powershell
cd E:\Project\Szr3\desktop-exe
npm.cmd install
npm.cmd run dist
```

构建产物位于 `dist/Szr3-Setup-<版本>.exe`。构建后只交付该安装包，不交付 `web`、`api`、`desktop-exe` 源码、`.env`、密钥或 `win-unpacked` 文件夹。

## 安全边界

第三方 API Key、JWT 密钥、GPU SSH 凭据和服务器环境变量绝不写入 EXE。客户端可被提取，敏感能力必须继续由服务器代理；因此桌面版保留现有功能和账号限制，同时不会泄露密钥。

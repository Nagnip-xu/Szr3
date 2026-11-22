# 运行与部署

## MySQL

本项目已使用 MySQL。开发机安装 Docker 后，在项目根目录运行：

```powershell
docker compose -f docker-compose.mysql.yml up -d mysql
cd api
npx prisma db push
npm run db:seed
```

`api/.env` 的 `DATABASE_URL` 是唯一的数据库连接来源。部署环境必须使用独立的强密码，不得将密码写入 README、脚本或前端变量。

## 病毒扫描

生产环境运行 `docker compose -f docker-compose.mysql.yml --profile security up -d clamav`，并设置：

```env
VIRUS_SCAN_ENABLED=true
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
```

启用后，ClamAV 不可用时上传会被拒绝。

## Duix GPU

新 GPU 主机需要 Ubuntu 22.04、NVIDIA 驱动、NVIDIA Container Toolkit、Docker Compose 和 Duix 的三个容器。不要将 `8383`、`18180`、`10095` 开放到公网；仅开放 SSH，并通过 `DUIX_USE_SSH_TUNNEL=true` 访问。

更新 `api/.env` 中的 `GPU_SSH_HOST`、`GPU_SSH_PORT`、`GPU_SSH_USER`、`GPU_SSH_PASSWORD`、`DUIX_GPU_HOST` 后启动 API，检查 `GET /api/health/ready`。该检查同时验证 MySQL、隧道状态和 Duix 视频/TTS 服务可达性。

## 生产 ECS（桌面版 + 后台）

线上域名 `https://xinggui.xin` 指向 ECS `8.141.117.254`。桌面 EXE 只依赖 `https://xinggui.xin/api`；公开网页工作台（`:3000`）可下线。

**保留：**

- `szr3-api`（NestJS `:3001`）
- MariaDB / 业务数据、`/var/lib/szr3/storage`
- `szr3-admin`（Next.js 管理后台 `:3002`，浏览器访问 `/admin`）

**下线公开网页端：**

```powershell
cd E:\Project\Szr3\api
$env:ECS_HOST='8.141.117.254'
$env:ECS_PASSWORD='<root-password>'
node scripts/ecs-undeploy-web.mjs
node scripts/ecs-cleanup.mjs
```

脚本会停止 `szr3-web`、把 `/` 重定向到 `/admin`，并删除用户端 `.next` 构建产物（保留 `.next-admin`）。

## HTTPS 证书过期导致桌面端无法登录

桌面端使用 Node HTTPS 校验证书。证书过期会使所有登录、素材和工作流请求失败，即使服务器上的 API 进程仍在运行。2026-11-22 排查确认线上证书已于北京时间 2026-11-19 15:15:04 过期，错误码为 `CERT_HAS_EXPIRED`。

先在开发机检查线上 TLS 和健康检查：

```powershell
cd E:\Project\Szr3\desktop-exe
npm.cmd run check:connection
```

在 `api/.env` 配置运维 SSH 凭据（这些变量只供修复脚本使用，不打包进客户端）：

```text
ECS_HOST=8.141.117.254
ECS_USER=root
ECS_PORT=22
ECS_PASSWORD=<服务器密码>
# 或使用 ECS_PRIVATE_KEY_PATH=<本机私钥绝对路径>
# 加密私钥可配置 ECS_KEY_PASSPHRASE
```

运行证书修复：

```powershell
cd E:\Project\Szr3\api
npm.cmd run repair:https
```

也可把 `api/scripts/repair-https.sh` 放到服务器，以 root 执行 `bash repair-https.sh`。脚本要求现有 Certbot 及 nginx 插件；保留原有证书名称和业务配置，通过 nginx ACME 验证续期，检查证书至少还有七天有效期，再重载 nginx。随后安装续期后的 nginx 重载钩子，启用现有 Certbot 定时器（没有时创建每日两次的定时器），并执行续期演练验证 ACME。任一步失败会返回非零状态，需要查看对应错误后处理。

修复后重新执行连接检查，要求 `/api/health` 和 `/api/health/ready` 都返回 200，再验证客户端登录。现有客户端恢复连接无需重装。不要关闭 TLS 证书校验或将登录流量切换到明文 HTTP。

# Duix-Avatar（HeyGem）部署说明

> 项目地址：[duixcom/Duix-Avatar](https://github.com/duixcom/Duix-Avatar)  
> 原名 HeyGem，**不是** 商业产品 HeyGen。

## 和 duix.ai 怎么选？

| 对比 | **Duix-Avatar**（推荐） | **duix.ai / Duix-Mobile** |
|------|-------------------------|---------------------------|
| 用途 | **离线口播视频生成**（图/视频 + 音频 → MP4） | **实时互动**（Android/iOS SDK） |
| 和星轨工作流 | ✅ 可替换 wan2.2-s2v 数字人步骤 | ❌ 不能直接出成片 |
| 部署 | Docker 服务端 + 可选桌面客户端 | 嵌入 App |
| 开源模型商用 | 社区版可商用（超大规模需签协议） | **免费形象不可商用** |
| API | `8383` 视频、`18180` TTS | RTC 实时流 |

**结论：做口播 SaaS 选 Duix-Avatar，不做 duix.ai 移动端 SDK。**

---

## GPU 服务器配置

| 项 | 值 |
|----|-----|
| 主机 | `223.109.239.11` |
| SSH | `ssh root@223.109.239.11 -p 11236` |
| GPU | RTX 4090 24G |
| 系统 | Ubuntu 22.04 + CUDA 12.4 |
| 代码 | `/opt/duix/Duix-Avatar` |
| 日志 | `/root/duix-deploy.log` |

---

## 服务端口

Docker 默认（本机）：

| 服务 | 端口 | 说明 |
|------|------|------|
| 视频合成 | `8383` | `POST /easy/submit`、`GET /easy/query` |
| TTS/声音克隆 | `18180` | Fish-Speech |
| ASR | `10095` | FunASR |

智星云外网预留端口映射（需在 compose 里绑到 8800–8802 才能外网访问）：

| 外网 | 内网 | 建议用途 |
|------|------|----------|
| 11294 | 8800 | 视频合成 API |
| 11295 | 8801 | TTS API |
| 11296 | 8802 | ASR |

---

## 部署命令（已在服务器执行）

```bash
cd /opt/duix/Duix-Avatar/deploy
docker-compose -f docker-compose-linux.yml pull   # ~70GB，约 1–2 小时
docker-compose -f docker-compose-linux.yml up -d
docker-compose -f docker-compose-linux.yml ps
```

---

## 开放 API 示例

### 视频合成

```bash
# 提交
curl -X POST http://127.0.0.1:8383/easy/submit \
  -H 'Content-Type: application/json' \
  -d '{
    "audio_url": "/path/to/audio.wav",
    "video_url": "/path/to/reference.mp4",
    "code": "task-001",
    "chaofen": 0,
    "watermark_switch": 0,
    "pn": 1
  }'

# 查询进度
curl "http://127.0.0.1:8383/easy/query?code=task-001"
```

### TTS（需先完成模特训练）

见官方文档：[README_zh.md](https://github.com/duixcom/Duix-Avatar/blob/main/README_zh.md#开放-api)

---

## 注意事项

1. 镜像合计约 **70GB**，32Mbps 带宽下首次拉取需 **1–2 小时**，请 **续租** 避免中途到期。
2. 磁盘至少保留 **100GB** 空闲（当前约 134GB 可用，足够）。
3. 三个容器均为 `Running` 才算成功：`duix-avatar-gen-video`、`duix-avatar-tts`、`duix-avatar-asr`。
4. Szr3 后端已完整接入 HeyGem，并通过 **SSH 隧道**访问 GPU 内网端口（无需映射 8383 外网）。

---

## Szr3 后端配置（api/.env）

```env
DUIX_USE_SSH_TUNNEL=true
DUIX_GPU_HOST=223.109.239.11
DUIX_VIDEO_API=http://223.109.239.11:8383
DUIX_TTS_API=http://223.109.239.11:18180
DUIX_ASR_WS=ws://223.109.239.11:10095
GPU_SSH_HOST=223.109.239.11
GPU_SSH_PORT=11236
GPU_SSH_USER=root
GPU_SSH_PASSWORD=***
```

`DUIX_USE_SSH_TUNNEL=true` 时，API 启动后自动在本地 `18383/18181/10096` 建立转发，解决智星云不开放 8383 等端口的问题。

### 克隆音预置

在 GPU 上把参考音频放到 `~/duix_avatar_data/voice/data/origin_audio/`，调用：

```bash
curl -X POST http://127.0.0.1:18180/v1/preprocess_and_tran \
  -H 'Content-Type: application/json' \
  -d '{"format":".wav","reference_audio":"origin_audio/your.wav","lang":"zh"}'
```

将返回的 `asr_format_audio_url` 和 `reference_audio_text` 写入 `DUIX_VOICE_001_REFERENCE_*` 环境变量。

---

## 部署状态

**2026-08-15：部署成功 ✅**

三个容器均已启动：

| 容器 | 端口 | 状态 |
|------|------|------|
| duix-avatar-gen-video | 8383 | Running |
| duix-avatar-tts | 18180 | Running |
| duix-avatar-asr | 10095 | Running |

镜像合计约 110GB，磁盘已用 142GB / 196GB。

首次部署脚本：`scripts/deploy-duix-avatar.sh`

import { Injectable } from '@nestjs/common';
import SftpClient from 'ssh2-sftp-client';
import { basename, join } from 'node:path';
import { DuixApiError } from './duix.types';

@Injectable()
export class DuixGpuTransferService {
  private get sshHost() {
    return (
      process.env.GPU_SSH_HOST?.trim() ??
      process.env.DUIX_GPU_HOST?.trim() ??
      ''
    );
  }

  private get sshPort() {
    return Number(process.env.GPU_SSH_PORT?.trim() ?? '22');
  }

  private get sshUser() {
    return process.env.GPU_SSH_USER?.trim() ?? 'root';
  }

  private get sshPassword() {
    return process.env.GPU_SSH_PASSWORD?.trim() ?? '';
  }

  private get face2faceRemoteDir() {
    return (
      process.env.DUIX_FACE2FACE_REMOTE_DIR?.trim() ??
      '/root/duix_avatar_data/face2face'
    );
  }

  private get voiceRemoteDir() {
    return (
      process.env.DUIX_VOICE_REMOTE_DIR?.trim() ??
      '/root/duix_avatar_data/voice/data'
    );
  }

  /** HeyGem 容器内 face2face 挂载点（对应宿主机 face2faceRemoteDir） */
  private get face2faceContainerDir() {
    return process.env.DUIX_FACE2FACE_CONTAINER_DIR?.trim() ?? '/code/data';
  }

  /** 转为 HeyGem API 可用的容器内绝对路径 */
  toContainerPath(relativeOrAbsolute: string) {
    const normalized = relativeOrAbsolute.replace(/\\/g, '/');
    if (normalized.startsWith('/')) return normalized;
    return `${this.face2faceContainerDir}/${normalized}`.replace(/\/+/g, '/');
  }

  isConfigured() {
    return !!this.sshHost && !!this.sshPassword;
  }

  face2faceDir() {
    return this.face2faceRemoteDir;
  }

  voiceDataDir() {
    return this.voiceRemoteDir;
  }

  /** 上传本地文件到 GPU voice/data 目录，返回容器内相对路径 */
  async uploadToVoiceData(localPath: string, remoteRelativePath: string) {
    const normalized = remoteRelativePath.replace(/\\/g, '/');
    const remotePath = `${this.voiceRemoteDir}/${normalized}`.replace(/\/+/g, '/');
    await this.upload(localPath, remotePath);
    return normalized;
  }

  /** 上传本地文件到 GPU face2face 目录，返回容器内相对路径（文件名） */
  async uploadToFace2face(localPath: string, remoteName?: string) {
    const name = remoteName ?? basename(localPath);
    await this.upload(localPath, join(this.face2faceRemoteDir, name));
    return name;
  }

  /**
   * Duix-Avatar 返回的结果路径可能是：
   * - `taskCode-r.mp4`
   * - `/taskCode-r.mp4`
   * - `/code/data/temp/taskCode-r.mp4`
   * 实际文件通常在 face2face/temp/ 下。
   */
  normalizeResultRelativePath(resultPath: string) {
    let normalized = resultPath.replace(/\\/g, '/').trim();
    const containerDir = this.face2faceContainerDir.replace(/\/+$/, '');
    if (normalized.startsWith(`${containerDir}/`)) {
      normalized = normalized.slice(containerDir.length + 1);
    }
    if (normalized.startsWith('/')) {
      normalized = normalized.slice(1);
    }
    return normalized;
  }

  /** 解析 HeyGem 结果在 face2face 下的相对路径 */
  async resolveResultOnFace2face(resultPath: string) {
    const normalized = this.normalizeResultRelativePath(resultPath);
    const fileName = normalized.split('/').pop() ?? normalized;
    const candidates = [
      normalized,
      `temp/${fileName}`,
      fileName,
    ].filter((value, index, list) => value && list.indexOf(value) === index);

    for (const relative of candidates) {
      if (await this.existsOnFace2face(relative)) {
        return relative;
      }
    }

    throw new DuixApiError(
      `GPU 上找不到生成结果「${resultPath}」（已尝试 ${candidates.join(', ')}）`,
    );
  }

  /** 从 GPU face2face 目录下载结果视频 */
  async downloadFromFace2face(relativePath: string, localPath: string) {
    const resolved = await this.resolveResultOnFace2face(relativePath);
    const remotePath = `${this.face2faceRemoteDir}/${resolved}`.replace(
      /\\/g,
      '/',
    );
    await this.download(remotePath, localPath);
  }

  /** 检查 GPU face2face 目录下相对路径是否存在 */
  async existsOnFace2face(relativePath: string) {
    const remotePath = `${this.face2faceRemoteDir}/${relativePath}`.replace(
      /\\/g,
      '/',
    );
    return this.withSftp(async (sftp) => {
      try {
        await sftp.stat(remotePath);
        return true;
      } catch {
        return false;
      }
    });
  }

  /** 若 reference 已是 GPU 相对路径则跳过上传 */
  async ensureReferenceOnGpu(
    source: string,
    localPath: string | null,
    remoteName: string,
  ) {
    if (!source.includes('://') && !source.startsWith('/')) {
      return source.replace(/\\/g, '/');
    }

    if (!localPath) {
      throw new DuixApiError('参考视频不可访问，且无法定位本地文件');
    }

    return this.uploadToFace2face(localPath, remoteName);
  }

  private async withSftp<T>(fn: (sftp: SftpClient) => Promise<T>) {
    if (!this.isConfigured()) {
      throw new DuixApiError(
        '未配置 GPU SSH（GPU_SSH_HOST / GPU_SSH_PASSWORD）',
      );
    }

    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: this.sshHost,
        port: this.sshPort,
        username: this.sshUser,
        password: this.sshPassword,
        readyTimeout: 30_000,
      });
      return await fn(sftp);
    } finally {
      await sftp.end().catch(() => undefined);
    }
  }

  private async upload(localPath: string, remotePath: string) {
    const normalizedRemote = remotePath.replace(/\\/g, '/');
    await this.withSftp(async (sftp) => {
      const remoteDir = normalizedRemote.slice(
        0,
        normalizedRemote.lastIndexOf('/'),
      );
      await sftp.mkdir(remoteDir, true).catch(() => undefined);
      await sftp.fastPut(localPath, normalizedRemote);
    });
  }

  private async download(remotePath: string, localPath: string) {
    const normalizedRemote = remotePath.replace(/\\/g, '/');
    await this.withSftp(async (sftp) => {
      await sftp.fastGet(normalizedRemote, localPath);
    });
  }
}

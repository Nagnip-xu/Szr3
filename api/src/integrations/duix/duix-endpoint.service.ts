import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'ssh2';
import { createServer, type Server, type Socket } from 'node:net';

/**
 * 智星云等环境通常不对外开放 8383/18180/10095，
 * 通过 SSH forwardOut 在本地建立隧道，Duix 服务走 127.0.0.1 访问。
 */
@Injectable()
export class DuixEndpointService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DuixEndpointService.name);
  private conn: Client | null = null;
  private servers: Server[] = [];
  private tunnelReady = false;
  private reconnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private get useTunnel() {
    return process.env.DUIX_USE_SSH_TUNNEL?.trim() !== 'false';
  }

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

  private get tunnelVideoPort() {
    return Number(process.env.DUIX_TUNNEL_VIDEO_PORT?.trim() ?? '18383');
  }

  private get tunnelTtsPort() {
    return Number(process.env.DUIX_TUNNEL_TTS_PORT?.trim() ?? '18181');
  }

  private get tunnelAsrPort() {
    return Number(process.env.DUIX_TUNNEL_ASR_PORT?.trim() ?? '10096');
  }

  async onModuleInit() {
    if (!this.useTunnel || !this.sshHost || !this.sshPassword) return;
    try {
      await this.ensureSshConnection();
      await this.ensureLocalServers();
      this.tunnelReady = true;
      this.logger.log(
        `Duix SSH 隧道已就绪: video=${this.tunnelVideoPort}, tts=${this.tunnelTtsPort}, asr=${this.tunnelAsrPort}`,
      );
    } catch (err) {
      this.logger.warn(
        `Duix SSH 隧道启动失败，将尝试直连: ${err instanceof Error ? err.message : err}`,
      );
      this.scheduleReconnect(5_000);
    }
  }

  async onModuleDestroy() {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const server of this.servers) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    this.servers = [];
    if (this.conn) {
      this.conn.removeAllListeners();
      this.conn.end();
      this.conn = null;
    }
  }

  isTunnelReady() {
    return this.tunnelReady;
  }

  videoBaseUrl() {
    if (this.tunnelReady) {
      return `http://127.0.0.1:${this.tunnelVideoPort}`;
    }
    const raw =
      process.env.DUIX_VIDEO_API?.trim() ??
      (process.env.DUIX_GPU_HOST
        ? `http://${process.env.DUIX_GPU_HOST.trim()}:8383`
        : '');
    return raw.replace(/\/$/, '');
  }

  ttsBaseUrl() {
    if (this.tunnelReady) {
      return `http://127.0.0.1:${this.tunnelTtsPort}`;
    }
    const raw =
      process.env.DUIX_TTS_API?.trim() ??
      (process.env.DUIX_GPU_HOST
        ? `http://${process.env.DUIX_GPU_HOST.trim()}:18180`
        : '');
    return raw.replace(/\/$/, '');
  }

  asrWsUrl() {
    if (this.tunnelReady) {
      return `ws://127.0.0.1:${this.tunnelAsrPort}`;
    }
    const explicit = process.env.DUIX_ASR_WS?.trim();
    if (explicit) return explicit;
    const host =
      process.env.DUIX_GPU_HOST?.trim() ??
      process.env.GPU_SSH_HOST?.trim() ??
      '';
    return host ? `ws://${host}:10095` : '';
  }

  private connectSsh() {
    return new Promise<Client>((resolve, reject) => {
      const conn = new Client();
      const onError = (error: Error) => {
        conn.destroy();
        reject(error);
      };
      conn
        .once('ready', () => {
          conn.removeListener('error', onError);
          resolve(conn);
        })
        .on('error', onError)
        .connect({
          host: this.sshHost,
          port: this.sshPort,
          username: this.sshUser,
          password: this.sshPassword,
          readyTimeout: 30_000,
          keepaliveInterval: 15_000,
          keepaliveCountMax: 4,
        });
    });
  }

  private attachConnHandlers(conn: Client) {
    conn.on('close', () => this.handleDisconnect('close'));
    conn.on('end', () => this.handleDisconnect('end'));
    conn.on('error', (err) => {
      this.logger.warn(`Duix SSH 连接异常: ${err.message}`);
      this.handleDisconnect('error');
    });
  }

  private handleDisconnect(reason: string) {
    if (this.destroyed || !this.useTunnel) return;
    this.tunnelReady = false;
    if (this.conn) {
      const conn = this.conn;
      this.conn = null;
      conn.removeAllListeners('close');
      conn.removeAllListeners('end');
      conn.destroy();
    }

    this.logger.warn(`Duix SSH 连接断开 (${reason})，将自动重连…`);
    this.scheduleReconnect(2_000);
  }

  private scheduleReconnect(delayMs: number) {
    if (this.destroyed || this.reconnectTimer || this.reconnecting) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.reconnectSsh();
    }, delayMs);
  }

  private async ensureSshConnection() {
    if (this.conn && this.tunnelReady) return;
    if (this.conn) {
      this.conn.removeAllListeners();
      this.conn.end();
      this.conn = null;
    }
    this.conn = await this.connectSsh();
    this.attachConnHandlers(this.conn);
  }

  private async reconnectSsh() {
    if (this.destroyed || this.reconnecting) return;
    this.reconnecting = true;
    this.tunnelReady = false;

    try {
      await this.ensureSshConnection();
      await this.ensureLocalServers();
      this.tunnelReady = true;
      this.logger.log(
        `Duix SSH 隧道已重连: video=${this.tunnelVideoPort}, tts=${this.tunnelTtsPort}, asr=${this.tunnelAsrPort}`,
      );
    } catch (err) {
      this.logger.warn(
        `Duix SSH 重连失败: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      this.reconnecting = false;
      if (!this.tunnelReady) this.scheduleReconnect(5_000);
    }
  }

  private forwardToRemote(socket: Socket, remotePort: number) {
    const doForward = (conn: Client) => {
      try {
        conn.forwardOut(
          '127.0.0.1',
          0,
          '127.0.0.1',
          remotePort,
          (err, stream) => {
            if (err) {
              socket.destroy();
              this.handleDisconnect('forwardOut-callback');
              return;
            }
            socket.pipe(stream).pipe(socket);
          },
        );
      } catch (err) {
        this.logger.warn(
          `forwardOut 失败: ${err instanceof Error ? err.message : err}`,
        );
        socket.destroy();
        this.handleDisconnect('forwardOut-throw');
      }
    };

    if (this.conn && this.tunnelReady) {
      doForward(this.conn);
      return;
    }

    void this.reconnectSsh().then(() => {
      if (this.conn && this.tunnelReady) {
        doForward(this.conn);
      } else {
        socket.destroy();
      }
    });
  }

  private bindForward(localPort: number, remotePort: number) {
    return new Promise<void>((resolve, reject) => {
      const server = createServer((socket) => {
        this.forwardToRemote(socket, remotePort);
      });
      server.on('error', reject);
      server.listen(localPort, '127.0.0.1', () => {
        this.servers.push(server);
        resolve();
      });
    });
  }

  private async ensureLocalServers() {
    for (const [localPort, remotePort] of [
      [this.tunnelVideoPort, 8383],
      [this.tunnelTtsPort, 18180],
      [this.tunnelAsrPort, 10095],
    ]) {
      if (this.servers.some((server) => {
        const address = server.address();
        return address && typeof address !== 'string' && address.port === localPort;
      })) continue;
      await this.bindForward(localPort, remotePort);
    }
  }
}

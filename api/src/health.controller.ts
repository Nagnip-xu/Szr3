import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { DuixEndpointService } from './integrations/duix/duix-endpoint.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly duix: DuixEndpointService) {}

  @Get()
  async ping() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: 'szr3-api', database: 'ready' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const videoApi = this.duix.videoBaseUrl();
      const ttsApi = this.duix.ttsBaseUrl();
      const [video, tts] = await Promise.all([this.probe(videoApi), this.probe(ttsApi)]);
      const ready = video.configured && tts.configured && video.reachable && tts.reachable;
      if (!ready) throw new Error('Duix services are not ready');
      return { ok: true, database: 'ready', duix: { tunnel: this.duix.isTunnelReady(), video, tts } };
    } catch (error) {
      throw new ServiceUnavailableException({ ok: false, message: error instanceof Error ? error.message : 'Service is not ready' });
    }
  }

  private async probe(url: string) {
    if (!url) return { configured: false, reachable: false };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      return { configured: true, reachable: response.status < 500 };
    } catch {
      return { configured: true, reachable: false };
    } finally { clearTimeout(timer); }
  }
}

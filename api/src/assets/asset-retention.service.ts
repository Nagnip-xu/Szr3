import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AssetRetentionService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  onModuleInit() { void this.purgeExpired(); this.timer = setInterval(() => void this.purgeExpired(), 6 * 60 * 60 * 1000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async purgeExpired() {
    const assets = await this.prisma.mediaAsset.findMany({ where: { expiresAt: { lte: new Date() }, deletedAt: null }, take: 100 });
    for (const asset of assets) {
      await rm(this.storage.projectFilePath(asset.organizationId, asset.projectId, asset.filename), { force: true }).catch(() => undefined);
      await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
    }
  }
}

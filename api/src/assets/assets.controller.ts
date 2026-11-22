import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Request } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PresetAvatarService } from './preset-avatar.service';
import { FileInspectionService } from './file-inspection.service';

const UPLOAD_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly presetAvatars: PresetAvatarService,
    private readonly inspector: FileInspectionService,
  ) {}

  @Post('projects/:projectId/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }),
  )
  async uploadProjectFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.organizationId !== user.organizationId) {
      throw new NotFoundException('项目不存在');
    }

    const inspection = await this.inspector.inspect(file.originalname, file.buffer);
    const ext = inspection.extension;
    const safeBase = file.originalname
      .replace(/[^\w.\-+\u4e00-\u9fff]/g, '_')
      .slice(0, 80);
    const filename = `${Date.now()}-${safeBase}${ext.includes('.') ? '' : ext}`;

    const saved = await this.storage.saveBuffer(
      user.organizationId,
      projectId,
      filename,
      file.buffer,
    );
    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { retentionDays: true },
    });
    const retentionDays = Math.max(1, Number(process.env.MEDIA_RETENTION_DAYS ?? organization?.retentionDays ?? 30));
    await this.prisma.mediaAsset.create({
      data: {
        organizationId: user.organizationId,
        projectId,
        filename,
        purpose: 'upload',
        expiresAt: new Date(Date.now() + retentionDays * 86_400_000),
      },
    });

    return {
      filename,
      publicUrl: saved.publicUrl,
      sizeBytes: saved.sizeBytes,
      mimeType: inspection.mimeType,
    };
  }

  @Get('files/:orgId/:projectId/:filename')
  serveFile(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('filename') filename: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (user.organizationId !== orgId) {
      throw new NotFoundException('文件不存在');
    }

    const filePath = this.storage.projectFilePath(orgId, projectId, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('文件不存在');
    }

    const lower = filename.toLowerCase();
    if (lower.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
    else if (lower.endsWith('.wav')) res.setHeader('Content-Type', 'audio/wav');
    else if (lower.endsWith('.mp4')) res.setHeader('Content-Type', 'video/mp4');
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (lower.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (lower.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    else if (lower.endsWith('.ass')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }

    const { size: fileSize } = statSync(filePath);
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    if (/\.(mp4|webm|mov)$/i.test(lower)) {
      res.setHeader('Cache-Control', 'private, max-age=3600');
    }

    // Generated voice tracks are short. Returning one complete response avoids
    // a Chromium media metadata issue observed with authenticated 206 audio
    // responses, while video keeps byte-range seeking support.
    if (/\.(mp3|wav)$/i.test(lower)) {
      res.setHeader('Accept-Ranges', 'none');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Length', String(fileSize));
      createReadStream(filePath).pipe(res);
      return;
    }

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          res.end();
          return;
        }
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', String(chunkSize));
        createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.setHeader('Content-Length', String(fileSize));
    createReadStream(filePath).pipe(res);
  }

  /** 内置数字人口播参考样片（首次访问时从 GPU 同步到本地缓存） */
  @Get('presets/avatars/:avatarId/poster')
  async servePresetAvatarPoster(
    @Param('avatarId') avatarId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.presetAvatars.ensureLocalPoster(avatarId);
    const { size: fileSize } = statSync(filePath);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(fileSize));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    createReadStream(filePath).pipe(res);
  }

  @Get('presets/avatars/:avatarId')
  async servePresetAvatarPreview(
    @Param('avatarId') avatarId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const filePath = await this.presetAvatars.ensureLocalPreview(avatarId);
    const { size: fileSize } = statSync(filePath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          res.end();
          return;
        }
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', String(chunkSize));
        createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.setHeader('Content-Length', String(fileSize));
    createReadStream(filePath).pipe(res);
  }

  @Get('projects/:projectId/download/final')
  async downloadFinal(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.organizationId !== user.organizationId) {
      throw new NotFoundException('项目不存在');
    }

    const filePath = this.storage.projectFilePath(
      user.organizationId,
      projectId,
      'final.mp4',
    );
    if (!existsSync(filePath)) {
      throw new NotFoundException('成片尚未生成，请先点击「生成并下载成片」');
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(project.name || '成片')}.mp4"`,
    );
    return new StreamableFile(createReadStream(filePath));
  }

  @Get('projects/:projectId/download/latest')
  async downloadLatest(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const candidates = [
      'final-with-cover.mp4',
      'final.mp4',
      'with-bgm.mp4',
      'subtitled.mp4',
      'normalized.mp4',
    ];
    for (const name of candidates) {
      const filePath = this.storage.projectFilePath(
        user.organizationId,
        projectId,
        name,
      );
      if (existsSync(filePath)) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(name)}"`,
        );
        return new StreamableFile(createReadStream(filePath));
      }
    }
    throw new NotFoundException('暂无可下载的视频文件');
  }
}

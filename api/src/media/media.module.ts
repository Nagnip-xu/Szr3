import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { DuixModule } from '../integrations/duix/duix.module';
import { DigitalHumanService } from '../media/digital-human.service';
import { FfmpegService } from '../media/ffmpeg.service';
import { SubtitleAlignmentService } from '../media/subtitle-alignment.service';
import { VideoRenderService } from '../media/video-render.service';
import { RenderQueueService } from '../queue/render-queue.service';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [AssetsModule, DuixModule],
  providers: [
    FfmpegService,
    SubtitleAlignmentService,
    VideoRenderService,
    DigitalHumanService,
    RenderQueueService,
    StorageService,
  ],
  exports: [
    VideoRenderService,
    SubtitleAlignmentService,
    DigitalHumanService,
    RenderQueueService,
    StorageService,
  ],
})
export class MediaModule {}

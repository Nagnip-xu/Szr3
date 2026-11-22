import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { PresetAvatarService } from './preset-avatar.service';
import { DuixModule } from '../integrations/duix/duix.module';
import { StorageService } from '../storage/storage.service';
import { FileInspectionService } from './file-inspection.service';
import { AssetRetentionService } from './asset-retention.service';
import { FfmpegService } from '../media/ffmpeg.service';

@Module({
  imports: [DuixModule],
  controllers: [AssetsController],
  providers: [StorageService, FfmpegService, PresetAvatarService, FileInspectionService, AssetRetentionService],
  exports: [StorageService, PresetAvatarService],
})
export class AssetsModule {}

import { Module } from '@nestjs/common';
import { FfmpegService } from '../../media/ffmpeg.service';
import { CustomAvatarService } from './custom-avatar.service';
import { CustomVoiceService } from './custom-voice.service';
import { DuixAsrService } from './duix-asr.service';
import { DuixEndpointService } from './duix-endpoint.service';
import { DuixGpuTransferService } from './duix-gpu-transfer.service';
import { DuixTtsService } from './duix-tts.service';
import { DuixVideoService } from './duix-video.service';

@Module({
  providers: [
    FfmpegService,
    DuixEndpointService,
    CustomAvatarService,
    CustomVoiceService,
    DuixGpuTransferService,
    DuixVideoService,
    DuixTtsService,
    DuixAsrService,
  ],
  exports: [
    DuixEndpointService,
    CustomAvatarService,
    CustomVoiceService,
    DuixGpuTransferService,
    DuixVideoService,
    DuixTtsService,
    DuixAsrService,
    FfmpegService,
  ],
})
export class DuixModule {}

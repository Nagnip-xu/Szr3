import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/types';
import {
  ApplyPipDto,
  ExtractScriptDto,
  GenerateAudioDto,
  GenerateBgmDto,
  GenerateCoverDto,
  GenerateDigitalHumanDto,
  GenerateSubtitlesDto,
  GenerateTitleDto,
  RenderFinalDto,
  RewriteScriptDto,
  TrainCustomVoiceDto,
  SaveCustomAvatarDto,
} from './workflow.dto';

@Controller('workflow')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Post('extract-script')
  extractScript(@CurrentUser() user: AuthUser, @Body() dto: ExtractScriptDto) {
    return this.workflowService.extractScript(user, dto);
  }

  @Post('rewrite-script')
  rewriteScript(@Body() dto: RewriteScriptDto) {
    return this.workflowService.rewriteScript(dto);
  }

  @Post('review-script')
  reviewScript(@Body() dto: { script: string }) {
    return this.workflowService.reviewScript(dto.script);
  }

  @Post('generate-audio')
  generateAudio(@CurrentUser() user: AuthUser, @Body() dto: GenerateAudioDto) {
    return this.workflowService.generateAudio(user, dto);
  }

  @Post('generate-digital-human')
  generateDigitalHuman(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateDigitalHumanDto,
  ) {
    return this.workflowService.generateDigitalHuman(user, dto);
  }

  @Post('generate-subtitles')
  generateSubtitles(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateSubtitlesDto,
  ) {
    return this.workflowService.generateSubtitles(user, {
      ...dto,
      subtitleSegments: dto.subtitleSegments as never,
    });
  }

  @Post('generate-bgm')
  generateBgm(@CurrentUser() user: AuthUser, @Body() dto: GenerateBgmDto) {
    return this.workflowService.generateBgm(user, dto);
  }

  @Post('render-final')
  renderFinal(@CurrentUser() user: AuthUser, @Body() dto: RenderFinalDto) {
    return this.workflowService.renderFinalVideo(user, {
      ...dto,
      subtitleSegments: dto.subtitleSegments as never,
    });
  }

  @Get('jobs/:jobId')
  getJob(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.workflowService.getRenderJob(user, jobId);
  }

  @Post('generate-title')
  generateTitle(@Body() dto: GenerateTitleDto) {
    return this.workflowService.generateTitle(dto);
  }

  @Get('options')
  getOptions(@CurrentUser() user: AuthUser) {
    return this.workflowService.getWorkflowOptions(user);
  }

  @Post('generate-cover')
  generateCover(@CurrentUser() user: AuthUser, @Body() dto: GenerateCoverDto) {
    return this.workflowService.generateCover(user, dto);
  }

  @Post('apply-pip')
  applyPip(@CurrentUser() user: AuthUser, @Body() dto: ApplyPipDto) {
    return this.workflowService.applyPip(user, dto);
  }

  @Post('train-voice')
  trainVoice(
    @Body()
    dto: { voiceId: string; referenceAudioPath: string; lang?: string },
  ) {
    return this.workflowService.trainVoice(dto);
  }

  @Post('train-custom-voice')
  trainCustomVoice(
    @CurrentUser() user: AuthUser,
    @Body() dto: TrainCustomVoiceDto,
  ) {
    return this.workflowService.trainCustomVoice(user, dto);
  }

  @Post('save-custom-avatar')
  saveCustomAvatar(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveCustomAvatarDto,
  ) {
    return this.workflowService.saveCustomAvatar(user, dto);
  }

  @Delete('custom-avatars/:avatarId')
  deleteCustomAvatar(
    @CurrentUser() user: AuthUser,
    @Param('avatarId') avatarId: string,
  ) {
    return this.workflowService.deleteCustomAvatar(user, avatarId);
  }
}

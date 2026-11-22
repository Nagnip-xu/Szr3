import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/types';
import { ComplianceService } from './compliance.service';

class CreateConsentDto { @IsString() projectId: string; @IsIn(['voice_clone', 'avatar_clone']) type: 'voice_clone' | 'avatar_clone'; @IsOptional() @IsString() subjectName?: string; }

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}
  @Get('status') status(@CurrentUser() user: AuthUser) { return this.compliance.status(user); }
  @Post('consents') create(@CurrentUser() user: AuthUser, @Body() dto: CreateConsentDto) { return this.compliance.createConsent(user, dto); }
  @Post('duix-license') acknowledge(@CurrentUser() user: AuthUser) { return this.compliance.acknowledgeDuixLicense(user); }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AdminService } from './admin.service';
import { CreateRegistrationCodesDto } from './admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() { return this.admin.overview(); }

  @Get('registration-codes')
  listRegistrationCodes() { return this.admin.listRegistrationCodes(); }

  @Post('registration-codes')
  createRegistrationCodes(@Body() input: CreateRegistrationCodesDto) {
    return this.admin.createRegistrationCodes(input);
  }
}

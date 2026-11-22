import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/types';
import { UpdateOrganizationDto } from '../auth/auth.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgService: OrganizationsService) {}

  @Get('workspace')
  getWorkspace(@CurrentUser() user: AuthUser) {
    return this.orgService.getWorkspace(user.organizationId);
  }

  @Patch('me')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.update(user.organizationId, dto);
  }
}

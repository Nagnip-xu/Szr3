import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, CurrentUser } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/types';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findOne(id, user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(id, user);
  }
}

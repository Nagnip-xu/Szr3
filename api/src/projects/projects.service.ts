import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';
import { AuthUser } from '../common/types';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  findAll(user: AuthUser) {
    return this.prisma.project.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.organizationId !== user.organizationId) {
      throw new ForbiddenException('无权访问该项目');
    }
    return {
      ...project,
      state: JSON.parse(project.stateJson || '{}'),
    };
  }

  create(user: AuthUser, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name ?? '未命名项目',
        stateJson: dto.stateJson ?? '{}',
        organizationId: user.organizationId,
        userId: user.id,
      },
    });
  }

  async update(id: string, user: AuthUser, dto: UpdateProjectDto) {
    await this.findOne(id, user);
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.project.delete({ where: { id } });
    await this.storage.removeProjectDir(user.organizationId, id);
    return { success: true };
  }
}

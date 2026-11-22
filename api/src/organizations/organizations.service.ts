import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationDto } from '../auth/auth.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async getWorkspace(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        projects: {
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            status: true,
            updatedAt: true,
          },
        },
        _count: { select: { projects: true, users: true } },
      },
    });

    if (!org) return null;

    return {
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        quotaMinutes: org.quotaMinutes,
        usedMinutes: org.usedMinutes,
        quotaStorage: org.quotaStorage,
        projectCount: org._count.projects,
        memberCount: org._count.users,
      },
      members: org.users,
      recentProjects: org.projects,
    };
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }
}

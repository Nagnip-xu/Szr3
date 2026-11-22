import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [users, organizationCount, projectCount, jobs, codes] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: { organization: true, _count: { select: { projects: true } } },
      }),
      this.prisma.organization.count(),
      this.prisma.project.count(),
      this.prisma.renderJob.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.registrationCode.count({ where: { usedAt: null } }),
    ]);
    const usage = users.reduce((total, user) => total + user.organization.usedMinutes, 0);
    return {
      metrics: {
        userCount: users.length,
        organizationCount,
        projectCount,
        usedMinutes: usage,
        availableCodes: codes,
        completedJobs: jobs.find((job) => job.status === 'completed')?._count._all ?? 0,
        pendingJobs: jobs.filter((job) => ['pending', 'processing'].includes(job.status)).reduce((sum, job) => sum + job._count._all, 0),
      },
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        organization: user.organization.name,
        usedMinutes: user.organization.usedMinutes,
        quotaMinutes: user.organization.quotaMinutes,
        projectCount: user._count.projects,
      })),
    };
  }

  async listRegistrationCodes() {
    return this.prisma.registrationCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { usedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async createRegistrationCodes(input: { count?: number; note?: string; expiresAt?: string }) {
    const count = input.count ?? 1;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new BadRequestException('过期时间格式不正确');
    if (expiresAt && expiresAt <= new Date()) throw new BadRequestException('过期时间必须晚于当前时间');

    const rows = Array.from({ length: count }, () => ({
      code: this.newCode(),
      note: input.note?.trim() || null,
      expiresAt,
    }));
    await this.prisma.registrationCode.createMany({ data: rows });
    return rows;
  }

  private newCode() {
    return `SZR3-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}

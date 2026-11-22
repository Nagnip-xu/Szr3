import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types';

export const CONSENT_VERSION = '2026-08-16';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async createConsent(user: AuthUser, params: { projectId: string; type: 'voice_clone' | 'avatar_clone'; subjectName?: string }) {
    await this.projectForUser(user, params.projectId);
    return this.prisma.consentRecord.create({ data: { organizationId: user.organizationId, projectId: params.projectId, userId: user.id, type: params.type, version: CONSENT_VERSION, subjectName: params.subjectName?.trim() || null } });
  }

  async requireConsent(user: AuthUser, projectId: string, consentId: string | undefined, type: 'voice_clone' | 'avatar_clone') {
    if (!consentId) throw new ForbiddenException('请先确认您拥有声音或肖像的合法授权');
    const consent = await this.prisma.consentRecord.findUnique({ where: { id: consentId } });
    if (!consent || consent.organizationId !== user.organizationId || consent.projectId !== projectId || consent.type !== type || consent.revokedAt) throw new ForbiddenException('授权记录无效或已撤回');
    return consent;
  }

  async status(user: AuthUser) {
    const organization = await this.prisma.organization.findUnique({ where: { id: user.organizationId }, select: { retentionDays: true, duixLicenseAcknowledgedAt: true } });
    return { consentVersion: CONSENT_VERSION, retentionDays: organization?.retentionDays ?? 30, duixLicenseAcknowledgedAt: organization?.duixLicenseAcknowledgedAt ?? null };
  }

  acknowledgeDuixLicense(user: AuthUser) {
    return this.prisma.organization.update({ where: { id: user.organizationId }, data: { duixLicenseAcknowledgedAt: new Date() }, select: { duixLicenseAcknowledgedAt: true } });
  }

  private async projectForUser(user: AuthUser, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.organizationId !== user.organizationId) throw new ForbiddenException('无权访问该项目');
    return project;
  }
}

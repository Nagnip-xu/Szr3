import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthUser } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }

    const registrationCode = dto.registrationCode.trim().toUpperCase();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const code = await tx.registrationCode.findFirst({
        where: {
          code: registrationCode,
          usedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!code) {
        throw new BadRequestException('注册码无效、已使用或已过期');
      }

      const org = await tx.organization.create({
        data: { name: dto.organizationName },
      });
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: 'member',
          organizationId: org.id,
        },
      });
      const redeemed = await tx.registrationCode.updateMany({
        where: { id: code.id, usedAt: null },
        data: { usedAt: new Date(), usedById: createdUser.id },
      });
      if (redeemed.count !== 1) {
        throw new BadRequestException('注册码已被使用，请联系管理员获取新的注册码');
      }
      return createdUser;
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (user.role === 'super_admin') {
      throw new UnauthorizedException('管理员账号请从管理员端口登录');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return this.buildAuthResponse(user);
  }

  async adminLogin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role !== 'super_admin') {
      throw new UnauthorizedException('管理员账号或密码错误');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('管理员账号或密码错误');
    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        plan: user.organization.plan,
        quotaMinutes: user.organization.quotaMinutes,
        usedMinutes: user.organization.usedMinutes,
        quotaStorage: user.organization.quotaStorage,
      },
    };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  }) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };

    return { token, user: authUser };
  }
}

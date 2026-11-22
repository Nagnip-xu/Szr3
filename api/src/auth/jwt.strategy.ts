import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, AuthUser } from '../common/types';

function jwtFromRequest(req: Request) {
  const header = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (header) return header;

  const queryToken = req.query?.access_token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'szr3-dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}

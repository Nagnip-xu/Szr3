import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (user?.role === 'super_admin') return true;
    throw new ForbiddenException('仅管理员可访问管理后台');
  }
}

import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser } from '../common/types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

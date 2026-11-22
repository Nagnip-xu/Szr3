import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({ imports: [PrismaModule], controllers: [AdminController], providers: [AdminService, PlatformAdminGuard] })
export class AdminModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AssetsModule } from './assets/assets.module';
import { HealthController } from './health.controller';
import { ComplianceModule } from './compliance/compliance.module';
import { DuixModule } from './integrations/duix/duix.module';
import { AdminModule } from './admin/admin.module';

@Module({
  controllers: [HealthController],
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'szr3-dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    WorkflowModule,
    AssetsModule,
    ComplianceModule,
    DuixModule,
    AdminModule,
  ],
})
export class AppModule {}

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org' },
    update: {},
    create: {
      id: 'seed-org',
      name: '星轨演示企业',
      plan: 'enterprise',
      quotaMinutes: 500,
      usedMinutes: 42,
      quotaStorage: 10240,
    },
  });

  const passwordHash = await bcrypt.hash('demo123456', 10);

  await prisma.user.upsert({
    where: { email: 'demo@szr3.com' },
    update: { role: 'admin' },
    create: {
      email: 'demo@szr3.com',
      passwordHash,
      name: '演示管理员',
      role: 'admin',
      organizationId: org.id,
    },
  });

  console.log('Seed complete: demo@szr3.com / demo123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

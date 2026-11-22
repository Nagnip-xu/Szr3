import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');

const prisma = new PrismaClient();
const organization = await prisma.organization.upsert({
  where: { id: 'szr3-platform-org' },
  update: {},
  create: { id: 'szr3-platform-org', name: 'Szr3 Platform', plan: 'enterprise' },
});
const passwordHash = await bcrypt.hash(password, 12);
await prisma.user.upsert({
  where: { email },
  update: { passwordHash, role: 'super_admin', organizationId: organization.id },
  create: { email, name: 'Platform Administrator', passwordHash, role: 'super_admin', organizationId: organization.id },
});
await prisma.$disconnect();
console.log('Production administrator is ready.');

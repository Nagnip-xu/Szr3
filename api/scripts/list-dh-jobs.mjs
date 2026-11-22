import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const jobs = await p.renderJob.findMany({
  where: { type: 'digital-human' },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
for (const j of jobs) {
  console.log(
    JSON.stringify({
      id: j.id,
      status: j.status,
      progress: j.progress,
      error: j.error,
      outputFile: j.outputFile,
      projectId: j.projectId,
      createdAt: j.createdAt,
    }),
  );
}
await p.$disconnect();

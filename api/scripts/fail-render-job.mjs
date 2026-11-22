import { PrismaClient } from '@prisma/client';

const jobId = process.argv[2] ?? 'cmsuh0nuu0001tgr0drfhb8ja';
const p = new PrismaClient();
const updated = await p.renderJob.update({
  where: { id: jobId },
  data: {
    status: 'failed',
    progress: 100,
    error: 'HeyGem GPU 工作进程卡死（进度停在 5%），已重启容器，请重新生成',
  },
});
console.log(JSON.stringify(updated, null, 2));
await p.$disconnect();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const fields = await prisma.fieldDefinition.findMany({ where: { name: 'subject_ocm' } });
  console.log(fields);
}
check().catch(console.error).finally(() => prisma.$disconnect());

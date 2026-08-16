import { prisma } from '../src/config/database.js';

async function main() {
  const dummyUser = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      id: 'user-test-123',
      email: 'dev@example.com',
      name: 'Thắng Đậu',
    },
  });

  console.log('✅ Created Dummy User:', dummyUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
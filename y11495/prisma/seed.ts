import { PrismaClient } from '@prisma/client';
import { UserRole } from '../src/types';

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      username: 'clerk01',
      name: '张三',
      role: UserRole.CLERK,
    },
    {
      username: 'reviewer01',
      name: '李四',
      role: UserRole.REVIEWER,
    },
    {
      username: 'manager01',
      name: '王五',
      role: UserRole.FINANCE_MANAGER,
    },
    {
      username: 'admin01',
      name: '赵六',
      role: UserRole.ADMIN,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }

  console.log('数据库初始化完成，创建了以下用户:');
  console.log('--------------------------------------------------');
  console.log('用户名\t\t角色\t\t姓名');
  console.log('--------------------------------------------------');
  for (const user of users) {
    console.log(`${user.username}\t${user.role}\t${user.name}`);
  }
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

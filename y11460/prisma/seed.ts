import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

enum UserRole {
  DATA_ENTRY = 'DATA_ENTRY',
  REVIEWER = 'REVIEWER',
  SUPERVISOR = 'SUPERVISOR',
  READ_ONLY = 'READ_ONLY'
}

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10)

  const clinic1 = await prisma.clinic.upsert({
    where: { id: 'clinic-001' },
    update: {},
    create: {
      id: 'clinic-001',
      name: '口腔总院',
      address: '北京市朝阳区口腔路1号'
    }
  })

  const clinic2 = await prisma.clinic.upsert({
    where: { id: 'clinic-002' },
    update: {},
    create: {
      id: 'clinic-002',
      name: '海淀分院',
      address: '北京市海淀区中关村大街100号'
    }
  })

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: UserRole.SUPERVISOR,
      clinicId: clinic1.id
    }
  })

  await prisma.user.upsert({
    where: { username: 'entry' },
    update: {},
    create: {
      username: 'entry',
      password: hashedPassword,
      name: '录入员张三',
      role: UserRole.DATA_ENTRY,
      clinicId: clinic1.id
    }
  })

  await prisma.user.upsert({
    where: { username: 'reviewer' },
    update: {},
    create: {
      username: 'reviewer',
      password: hashedPassword,
      name: '复核员李四',
      role: UserRole.REVIEWER,
      clinicId: clinic1.id
    }
  })

  await prisma.user.upsert({
    where: { username: 'director' },
    update: {},
    create: {
      username: 'director',
      password: hashedPassword,
      name: '院区主任王五',
      role: UserRole.SUPERVISOR,
      clinicId: clinic1.id
    }
  })

  await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      password: hashedPassword,
      name: '只读用户赵六',
      role: UserRole.READ_ONLY,
      clinicId: clinic1.id
    }
  })

  console.log('种子数据初始化完成')
  console.log('测试账号:')
  console.log('  主管/admin:   admin / 123456')
  console.log('  录入员:       entry / 123456')
  console.log('  复核员:       reviewer / 123456')
  console.log('  院区主任:     director / 123456')
  console.log('  只读用户:     viewer / 123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

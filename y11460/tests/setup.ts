import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.dirtyRecord.deleteMany()
  await prisma.changeLog.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.materialReceipt.deleteMany()
  await prisma.user.deleteMany()
  await prisma.clinic.deleteMany()

  const hashedPassword = await bcrypt.hash('123456', 10)

  const clinic = await prisma.clinic.create({
    data: {
      id: 'test-clinic-001',
      name: '测试口腔医院'
    }
  })

  await prisma.user.createMany({
    data: [
      {
        id: 'user-entry',
        username: 'entry',
        password: hashedPassword,
        name: '录入员',
        role: 'DATA_ENTRY',
        clinicId: clinic.id
      },
      {
        id: 'user-reviewer',
        username: 'reviewer',
        password: hashedPassword,
        name: '复核员',
        role: 'REVIEWER',
        clinicId: clinic.id
      },
      {
        id: 'user-supervisor',
        username: 'supervisor',
        password: hashedPassword,
        name: '主管',
        role: 'SUPERVISOR',
        clinicId: clinic.id
      },
      {
        id: 'user-viewer',
        username: 'viewer',
        password: hashedPassword,
        name: '只读用户',
        role: 'READ_ONLY',
        clinicId: clinic.id
      }
    ]
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

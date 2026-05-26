import prisma from './prisma.js'

const tiers = [
  { id: 'tier1', name: '早鸟档', price: 199, giftValue: 50, description: '限量早鸟优惠' },
  { id: 'tier2', name: '标准档', price: 299, giftValue: 80, description: '标准档位' },
  { id: 'tier3', name: '豪华档', price: 599, giftValue: 150, description: '豪华档位含周边' },
  { id: 'tier4', name: '尊享档', price: 999, giftValue: 300, description: '尊享档位含签名' },
]

const participants = [
  {
    userId: 'u001',
    userName: '张三',
    userPhone: '13800138001',
    orderNo: 'ORD20240001',
    tierId: 'tier1',
    tierName: '早鸟档',
    payChannel: 'alipay',
    payAmount: 199,
    earlyBirdDiscount: 50,
    giftValue: 50,
    giftShipped: false,
  },
  {
    userId: 'u001',
    userName: '张三',
    userPhone: '13800138001',
    orderNo: 'ORD20240002',
    tierId: 'tier3',
    tierName: '豪华档',
    payChannel: 'alipay',
    payAmount: 599,
    earlyBirdDiscount: 0,
    giftValue: 150,
    giftShipped: true,
  },
  {
    userId: 'u002',
    userName: '李四',
    userPhone: '13800138002',
    orderNo: 'ORD20240003',
    tierId: 'tier2',
    tierName: '标准档',
    payChannel: 'wechat',
    payAmount: 299,
    earlyBirdDiscount: 0,
    giftValue: 80,
    giftShipped: false,
  },
  {
    userId: 'u003',
    userName: '王五',
    userPhone: '13800138003',
    orderNo: 'ORD20240004',
    tierId: 'tier4',
    tierName: '尊享档',
    payChannel: 'card',
    payAmount: 999,
    earlyBirdDiscount: 0,
    giftValue: 300,
    giftShipped: true,
  },
  {
    userId: 'u004',
    userName: '赵六',
    userPhone: '13800138004',
    orderNo: 'ORD20240005',
    tierId: 'tier1',
    tierName: '早鸟档',
    payChannel: 'alipay',
    payAmount: 199,
    earlyBirdDiscount: 50,
    giftValue: 50,
    giftShipped: false,
  },
  {
    userId: 'u005',
    userName: '钱七',
    userPhone: '13800138005',
    orderNo: 'ORD20240006',
    tierId: 'tier2',
    tierName: '标准档',
    payChannel: 'wechat',
    payAmount: 299,
    earlyBirdDiscount: 0,
    giftValue: 80,
    giftShipped: false,
  },
  {
    userId: 'u006',
    userName: '孙八',
    userPhone: '13800138006',
    orderNo: 'ORD20240007',
    tierId: 'tier3',
    tierName: '豪华档',
    payChannel: 'alipay',
    payAmount: 599,
    earlyBirdDiscount: 0,
    giftValue: 150,
    giftShipped: false,
  },
  {
    userId: 'u007',
    userName: '周九',
    userPhone: '13800138007',
    orderNo: 'ORD20240008',
    tierId: 'tier2',
    tierName: '标准档',
    payChannel: 'card',
    payAmount: 299,
    earlyBirdDiscount: 0,
    giftValue: 80,
    giftShipped: true,
  },
  {
    userId: 'u008',
    userName: '吴十',
    userPhone: '13800138008',
    orderNo: 'ORD20240009',
    tierId: 'tier1',
    tierName: '早鸟档',
    payChannel: 'wechat',
    payAmount: 199,
    earlyBirdDiscount: 50,
    giftValue: 50,
    giftShipped: false,
  },
  {
    userId: 'u009',
    userName: '郑十一',
    userPhone: '13800138009',
    orderNo: 'ORD20240010',
    tierId: 'tier4',
    tierName: '尊享档',
    payChannel: 'alipay',
    payAmount: 999,
    earlyBirdDiscount: 0,
    giftValue: 300,
    giftShipped: false,
  },
  {
    userId: 'u010',
    userName: '王十二',
    userPhone: '13800138010',
    orderNo: 'ORD20240011',
    tierId: 'tier2',
    tierName: '标准档',
    payChannel: 'alipay',
    payAmount: 299,
    earlyBirdDiscount: 0,
    giftValue: 80,
    giftShipped: false,
  },
  {
    userId: 'u011',
    userName: '李十三',
    userPhone: '13800138011',
    orderNo: 'ORD20240012',
    tierId: 'tier3',
    tierName: '豪华档',
    payChannel: 'wechat',
    payAmount: 599,
    earlyBirdDiscount: 0,
    giftValue: 150,
    giftShipped: true,
  },
]

async function seed() {
  console.log('开始种子数据...')

  const existingCount = await prisma.participant.count()
  if (existingCount > 0) {
    console.log('数据库已有数据，跳过种子数据')
    return
  }

  for (const tier of tiers) {
    await prisma.tier.create({ data: tier })
  }
  console.log('档位数据已创建')

  for (const participant of participants) {
    await prisma.participant.create({ data: participant })
  }
  console.log('参与人数据已创建')

  console.log('种子数据完成！')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

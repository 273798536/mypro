import { PrismaClient } from '@prisma/client';
import { toJson } from '../utils/json.js';

const prisma = new PrismaClient();

async function main() {
  console.log('开始播种数据...');

  const sampleOrders = [
    {
      orderNo: 'DD20240520001',
      storeName: '丰收农资店',
      orderDate: '2024-05-20',
      items: [
        { productName: '尿素46%', quantity: 50, unit: '袋', price: 120, amount: 6000 },
        { productName: '复合肥15-15-15', quantity: 30, unit: '袋', price: 180, amount: 5400 },
      ],
      totalAmount: 11400,
      salesman: '张三',
    },
    {
      orderNo: 'DD20240521001',
      storeName: '利民农资站',
      orderDate: '2024-05-21',
      items: [
        { productName: '磷酸二铵', quantity: 40, unit: '袋', price: 200, amount: 8000 },
        { productName: '钾肥', quantity: 25, unit: '袋', price: 150, amount: 3750 },
      ],
      totalAmount: 11750,
      salesman: '李四',
    },
  ];

  const sampleIous = [
    {
      iouNo: 'QT20240520001',
      storeName: '丰收农资店',
      signDate: '2024-05-21',
      driver: '王师傅',
      truckNo: '鲁A12345',
      items: [
        { productName: '尿素', quantity: 50, unit: '袋', price: 120, amount: 6000 },
        { productName: '二铵', quantity: 30, unit: '袋', price: 180, amount: 5400 },
      ],
      totalAmount: 11400,
      signature: '王丰收',
      remark: '农忙赊销，麦收后结清',
    },
    {
      iouNo: 'QT20240521001',
      storeName: '利民农资站',
      signDate: '2024-05-21',
      driver: '李师傅',
      truckNo: '鲁A67890',
      items: [
        { productName: '磷酸二铵', quantity: 40, unit: '袋', price: 200, amount: 8000 },
        { productName: '钾肥', quantity: 25, unit: '袋', price: 150, amount: 3750 },
      ],
      totalAmount: 11750,
      signature: '赵利民',
      remark: '现货现款',
    },
  ];

  const sampleTracks = [
    {
      trackNo: 'GJ20240520001',
      driver: '王师傅',
      truckNo: '鲁A12345',
      startTime: '2024-05-20T08:00:00',
      endTime: '2024-05-20T18:00:00',
      points: [
        { timestamp: '2024-05-20T08:00:00', latitude: 36.67, longitude: 117.12, location: '农资仓库' },
        { timestamp: '2024-05-20T10:30:00', latitude: 36.75, longitude: 117.25, location: '丰收农资店' },
        { timestamp: '2024-05-20T14:00:00', latitude: 36.80, longitude: 117.30, location: '卸货点' },
      ],
    },
  ];

  const sampleStatements = [
    {
      statementNo: 'DZD20240520001',
      supplierName: '鲁西化工',
      statementDate: '2024-05-20',
      items: [
        { productName: '尿素46%', quantity: 50, unit: '袋', price: 120, amount: 6000 },
        { productName: '复合肥15-15-15', quantity: 30, unit: '袋', price: 180, amount: 5400 },
      ],
      totalAmount: 11400,
    },
  ];

  for (const order of sampleOrders) {
    await prisma.material.create({
      data: {
        type: 'ORDER',
        sourceFile: `${order.orderNo}.json`,
        rawContent: toJson(order),
        parsedData: toJson(order),
        batchKey: `ORDER:${order.storeName}:${order.orderDate}:${order.orderNo}`,
        version: 1,
        isLatest: true,
        createdBy: 'system',
      },
    });
    console.log(`✓ 导入订单: ${order.orderNo}`);
  }

  for (const iou of sampleIous) {
    await prisma.material.create({
      data: {
        type: 'IOU',
        sourceFile: `${iou.iouNo}.json`,
        rawContent: toJson(iou),
        parsedData: toJson(iou),
        batchKey: `IOU:${iou.storeName}:${iou.signDate}:${iou.iouNo}`,
        version: 1,
        isLatest: true,
        createdBy: 'system',
      },
    });
    console.log(`✓ 导入欠条: ${iou.iouNo}`);
  }

  for (const track of sampleTracks) {
    await prisma.material.create({
      data: {
        type: 'TRACK',
        sourceFile: `${track.trackNo}.json`,
        rawContent: toJson(track),
        parsedData: toJson(track),
        batchKey: `TRACK:${track.truckNo}:${track.startTime.split('T')[0]}:${track.trackNo}`,
        version: 1,
        isLatest: true,
        createdBy: 'system',
      },
    });
    console.log(`✓ 导入轨迹: ${track.trackNo}`);
  }

  for (const statement of sampleStatements) {
    await prisma.material.create({
      data: {
        type: 'STATEMENT',
        sourceFile: `${statement.statementNo}.json`,
        rawContent: toJson(statement),
        parsedData: toJson(statement),
        batchKey: `STATEMENT:${statement.supplierName}:${statement.statementDate}:${statement.statementNo}`,
        version: 1,
        isLatest: true,
        createdBy: 'system',
      },
    });
    console.log(`✓ 导入对账单: ${statement.statementNo}`);
  }

  const allMaterials = await prisma.material.findMany();
  const chain1Materials = allMaterials.filter(m => {
    const parsed = JSON.parse(m.parsedData);
    return parsed.storeName === '丰收农资店' || parsed.supplierName === '鲁西化工';
  });

  if (chain1Materials.length > 0) {
    const chain = await prisma.chain.create({
      data: {
        chainNo: 'CL-FS-20240520-ABCD',
        storeId: 'store-丰收农资店',
        storeName: '丰收农资店',
        businessDate: new Date('2024-05-20'),
        status: 'PROCESSING',
        totalAmount: 11400,
        summaryData: toJson({
          materialCount: chain1Materials.length,
          materialTypes: [...new Set(chain1Materials.map(m => m.type))],
        }),
        createdBy: 'system',
        materials: {
          connect: chain1Materials.map(m => ({ id: m.id })),
        },
      },
    });
    console.log(`✓ 创建链路: ${chain.chainNo}`);

    await prisma.statusHistory.create({
      data: {
        chainId: chain.id,
        toStatus: 'PROCESSING',
        reason: '系统自动创建配送验收链路',
        operatorId: 'system',
        operatorName: '系统',
      },
    });
  }

  console.log('\n数据播种完成!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

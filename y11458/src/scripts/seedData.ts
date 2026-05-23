import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { getDatabase } from '../database';
import { AfterSalesStatus, OperatorRole, IssueType } from '../types';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './data/aftersales.db';

interface SeedData {
  leaderRefunds: any[];
  warehouseReviews: any[];
  userRemarks: any[];
  refundFlows: any[];
  orders: any[];
  statusLogs: any[];
}

function generateOrderNo(index: number): string {
  return `AS${moment().format('YYYYMMDD')}${String(index).padStart(6, '0')}`;
}

function generateSeedData(): SeedData {
  const data: SeedData = {
    leaderRefunds: [],
    warehouseReviews: [],
    userRemarks: [],
    refundFlows: [],
    orders: [],
    statusLogs: []
  };

  const cities = ['北京', '上海', '广州', '深圳', '杭州'];
  const skus = [
    { id: 'SKU001', name: '新鲜草莓' },
    { id: 'SKU002', name: '有机牛奶' },
    { id: 'SKU003', name: '进口牛肉' },
    { id: 'SKU004', name: '精品水果礼盒' },
    { id: 'SKU005', name: '土鸡蛋' }
  ];

  for (let i = 1; i <= 20; i++) {
    const orderNo = generateOrderNo(i);
    const city = cities[Math.floor(Math.random() * cities.length)];
    const sku = skus[Math.floor(Math.random() * skus.length)];
    const leaderId = `L${String(Math.floor(Math.random() * 100)).padStart(4, '0')}`;
    const leaderName = `团长${i}`;
    const baseTime = moment().subtract(Math.floor(Math.random() * 7), 'days');

    const refundAmount = Math.floor(Math.random() * 200) + 50;
    const refundQuantity = Math.floor(Math.random() * 5) + 1;

    data.orders.push({
      order_no: orderNo,
      city,
      leader_id: leaderId,
      leader_name: leaderName,
      sku_id: sku.id,
      sku_name: sku.name,
      status: AfterSalesStatus.CREATED,
      current_handler: null,
      create_time: baseTime.toISOString(),
      update_time: baseTime.toISOString()
    });

    data.leaderRefunds.push({
      id: uuidv4(),
      order_no: orderNo,
      leader_id: leaderId,
      leader_name: leaderName,
      city,
      sku_id: sku.id,
      sku_name: sku.name,
      refund_quantity: refundQuantity,
      refund_amount: refundAmount,
      reason: ['商品坏了', '少发了', '质量不好', '过期了'][Math.floor(Math.random() * 4)],
      submit_time: baseTime.add(1, 'hour').toISOString(),
      images: JSON.stringify([`/images/${orderNo}_1.jpg`]),
      raw_data: null
    });

    data.statusLogs.push({
      id: uuidv4(),
      order_no: orderNo,
      from_status: null,
      to_status: AfterSalesStatus.CREATED,
      operator_id: 'SYS001',
      operator_name: '系统',
      operator_role: OperatorRole.SYSTEM,
      reason: '售后单创建',
      operate_time: baseTime.toISOString(),
      extra: null
    });

    data.statusLogs.push({
      id: uuidv4(),
      order_no: orderNo,
      from_status: AfterSalesStatus.CREATED,
      to_status: AfterSalesStatus.LEADER_SUBMITTED,
      operator_id: leaderId,
      operator_name: leaderName,
      operator_role: OperatorRole.LEADER,
      reason: '团长提交退款申请',
      operate_time: baseTime.add(1, 'hour').toISOString(),
      extra: null
    });

    if (i <= 15) {
      const actualAmount = i % 5 === 0 ? refundAmount - 20 : refundAmount;
      const actualQuantity = i % 4 === 0 ? refundQuantity - 1 : refundQuantity;
      const isDamaged = i % 3 === 0;
      const isMissing = i % 6 === 0;
      const reviewResult = i % 7 === 0 ? 'REJECTED' : 'APPROVED';

      data.warehouseReviews.push({
        id: uuidv4(),
        order_no: orderNo,
        reviewer_id: `W${String(Math.floor(Math.random() * 50)).padStart(3, '0')}`,
        reviewer_name: `仓管员${Math.floor(Math.random() * 20) + 1}`,
        sku_id: sku.id,
        sku_name: sku.name,
        actual_quantity: actualQuantity,
        actual_amount: actualAmount,
        is_damaged: isDamaged ? 1 : 0,
        is_missing: isMissing ? 1 : 0,
        review_result: reviewResult,
        review_remark: reviewResult === 'REJECTED' ? '商品完好，不予退款' : '核实通过',
        review_time: baseTime.add(3, 'hours').toISOString(),
        raw_data: null
      });

      data.statusLogs.push({
        id: uuidv4(),
        order_no: orderNo,
        from_status: AfterSalesStatus.LEADER_SUBMITTED,
        to_status: reviewResult === 'APPROVED' ? AfterSalesStatus.WAREHOUSE_APPROVED : AfterSalesStatus.WAREHOUSE_REJECTED,
        operator_id: `W${String(Math.floor(Math.random() * 50)).padStart(3, '0')}`,
        operator_name: `仓管员${Math.floor(Math.random() * 20) + 1}`,
        operator_role: OperatorRole.WAREHOUSE,
        reason: reviewResult === 'APPROVED' ? '仓库复核通过' : '仓库复核驳回',
        operate_time: baseTime.add(3, 'hours').toISOString(),
        extra: JSON.stringify({ isDamaged, isMissing })
      });

      if (reviewResult === 'APPROVED' && i <= 10) {
        data.refundFlows.push({
          id: uuidv4(),
          order_no: orderNo,
          flow_no: `RF${moment().format('YYYYMMDDHHmmss')}${i}`,
          refund_amount: i % 8 === 0 ? actualAmount - 10 : actualAmount,
          refund_method: ['微信支付', '支付宝', '原路退回'][Math.floor(Math.random() * 3)],
          refund_status: i % 9 === 0 ? 'FAILED' : 'SUCCESS',
          operator_id: `F${String(Math.floor(Math.random() * 20)).padStart(3, '0')}`,
          operator_name: `财务${Math.floor(Math.random() * 10) + 1}`,
          operate_time: baseTime.add(5, 'hours').toISOString(),
          raw_data: null
        });

        data.statusLogs.push({
          id: uuidv4(),
          order_no: orderNo,
          from_status: AfterSalesStatus.WAREHOUSE_APPROVED,
          to_status: i % 9 === 0 ? AfterSalesStatus.REFUND_FAILED : AfterSalesStatus.REFUND_SUCCESS,
          operator_id: `F${String(Math.floor(Math.random() * 20)).padStart(3, '0')}`,
          operator_name: `财务${Math.floor(Math.random() * 10) + 1}`,
          operator_role: OperatorRole.FINANCE,
          reason: i % 9 === 0 ? '退款失败，账户异常' : '退款成功',
          operate_time: baseTime.add(5, 'hours').toISOString(),
          extra: null
        });
      }
    }

    if (Math.random() > 0.5) {
      data.userRemarks.push({
        id: uuidv4(),
        order_no: orderNo,
        user_id: `U${String(Math.floor(Math.random() * 1000)).padStart(5, '0')}`,
        user_name: `用户${Math.floor(Math.random() * 100) + 1}`,
        content: ['希望尽快处理', '东西都坏了', '包装破损了', '少了一件'][Math.floor(Math.random() * 4)],
        images: JSON.stringify([`/images/remark_${orderNo}.jpg`]),
        create_time: baseTime.add(2, 'hours').toISOString(),
        raw_data: null
      });
    }
  }

  return data;
}

function generateDirtyData(): {
  dirtyLeaderRefunds: any[];
  dirtyWarehouseReviews: any[];
  dirtyRefundFlows: any[];
} {
  const result = {
    dirtyLeaderRefunds: [] as any[],
    dirtyWarehouseReviews: [] as any[],
    dirtyRefundFlows: [] as any[]
  };

  result.dirtyLeaderRefunds.push({
    id: uuidv4(),
    order_no: generateOrderNo(21),
    leader_id: null,
    leader_name: '团长21',
    city: '北京',
    sku_id: 'SKU001',
    sku_name: '新鲜草莓',
    refund_quantity: 2,
    refund_amount: 100,
    reason: '商品坏了',
    submit_time: moment().toISOString(),
    images: null,
    raw_data: JSON.stringify({ missingField: 'leader_id' })
  });

  result.dirtyLeaderRefunds.push({
    id: uuidv4(),
    order_no: generateOrderNo(22),
    leader_id: 'L0099',
    leader_name: '团长22',
    city: '上海',
    sku_id: 'SKU002',
    sku_name: '有机牛奶',
    refund_quantity: 1,
    refund_amount: 60,
    reason: '少发了',
    submit_time: moment().subtract(2, 'days').add(25, 'hours').toISOString(),
    images: null,
    raw_data: JSON.stringify({ crossDay: true })
  });

  result.dirtyWarehouseReviews.push({
    id: uuidv4(),
    order_no: generateOrderNo(23),
    reviewer_id: 'W001',
    reviewer_name: '仓管员1',
    sku_id: 'SKU003',
    sku_name: '进口牛肉(新)',
    actual_quantity: 3,
    actual_amount: 200,
    is_damaged: 0,
    is_missing: 0,
    review_result: 'APPROVED',
    review_remark: null,
    review_time: moment().toISOString(),
    raw_data: JSON.stringify({ nameChanged: '进口牛肉' })
  });

  result.dirtyRefundFlows.push({
    id: uuidv4(),
    order_no: generateOrderNo(24),
    flow_no: `RF${moment().format('YYYYMMDDHHmmss')}99`,
    refund_amount: 150,
    refund_method: '微信支付',
    refund_status: 'SUCCESS',
    operator_id: 'F001',
    operator_name: '财务1',
    operate_time: moment().toISOString(),
    raw_data: JSON.stringify({ expectedAmount: 120 })
  });

  return result;
}

async function insertData(data: SeedData, dirtyData: any): Promise<void> {
  const db = getDatabase(path.resolve(__dirname, '../../', DB_PATH));

  console.log('开始插入基础数据...');

  for (const order of data.orders) {
    await db.run(
      `INSERT INTO after_sales_order (order_no, city, leader_id, leader_name, sku_id, sku_name, status, current_handler, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.order_no, order.city, order.leader_id, order.leader_name, order.sku_id, order.sku_name, order.status, order.current_handler, order.create_time, order.update_time]
    );
  }
  console.log(`插入 ${data.orders.length} 条售后单`);

  for (const refund of data.leaderRefunds) {
    await db.run(
      `INSERT INTO leader_refund (id, order_no, leader_id, leader_name, city, sku_id, sku_name, refund_quantity, refund_amount, reason, submit_time, images, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [refund.id, refund.order_no, refund.leader_id, refund.leader_name, refund.city, refund.sku_id, refund.sku_name, refund.refund_quantity, refund.refund_amount, refund.reason, refund.submit_time, refund.images, refund.raw_data]
    );
  }
  console.log(`插入 ${data.leaderRefunds.length} 条团长退款记录`);

  for (const review of data.warehouseReviews) {
    await db.run(
      `INSERT INTO warehouse_review (id, order_no, reviewer_id, reviewer_name, sku_id, sku_name, actual_quantity, actual_amount, is_damaged, is_missing, review_result, review_remark, review_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [review.id, review.order_no, review.reviewer_id, review.reviewer_name, review.sku_id, review.sku_name, review.actual_quantity, review.actual_amount, review.is_damaged, review.is_missing, review.review_result, review.review_remark, review.review_time, review.raw_data]
    );
  }
  console.log(`插入 ${data.warehouseReviews.length} 条仓库复核记录`);

  for (const remark of data.userRemarks) {
    await db.run(
      `INSERT INTO user_remark (id, order_no, user_id, user_name, content, images, create_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [remark.id, remark.order_no, remark.user_id, remark.user_name, remark.content, remark.images, remark.create_time, remark.raw_data]
    );
  }
  console.log(`插入 ${data.userRemarks.length} 条用户备注`);

  for (const flow of data.refundFlows) {
    await db.run(
      `INSERT INTO refund_flow (id, order_no, flow_no, refund_amount, refund_method, refund_status, operator_id, operator_name, operate_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [flow.id, flow.order_no, flow.flow_no, flow.refund_amount, flow.refund_method, flow.refund_status, flow.operator_id, flow.operator_name, flow.operate_time, flow.raw_data]
    );
  }
  console.log(`插入 ${data.refundFlows.length} 条退款流水`);

  for (const log of data.statusLogs) {
    await db.run(
      `INSERT INTO status_log (id, order_no, from_status, to_status, operator_id, operator_name, operator_role, reason, operate_time, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.order_no, log.from_status, log.to_status, log.operator_id, log.operator_name, log.operator_role, log.reason, log.operate_time, log.extra]
    );
  }
  console.log(`插入 ${data.statusLogs.length} 条状态日志`);

  console.log('\n开始插入脏数据...');
  for (const refund of dirtyData.dirtyLeaderRefunds) {
    await db.run(
      `INSERT INTO leader_refund (id, order_no, leader_id, leader_name, city, sku_id, sku_name, refund_quantity, refund_amount, reason, submit_time, images, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [refund.id, refund.order_no, refund.leader_id, refund.leader_name, refund.city, refund.sku_id, refund.sku_name, refund.refund_quantity, refund.refund_amount, refund.reason, refund.submit_time, refund.images, refund.raw_data]
    );
  }
  console.log(`插入 ${dirtyData.dirtyLeaderRefunds.length} 条脏团长退款记录`);

  for (const review of dirtyData.dirtyWarehouseReviews) {
    await db.run(
      `INSERT INTO warehouse_review (id, order_no, reviewer_id, reviewer_name, sku_id, sku_name, actual_quantity, actual_amount, is_damaged, is_missing, review_result, review_remark, review_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [review.id, review.order_no, review.reviewer_id, review.reviewer_name, review.sku_id, review.sku_name, review.actual_quantity, review.actual_amount, review.is_damaged, review.is_missing, review.review_result, review.review_remark, review.review_time, review.raw_data]
    );
  }
  console.log(`插入 ${dirtyData.dirtyWarehouseReviews.length} 条脏仓库复核记录`);

  for (const flow of dirtyData.dirtyRefundFlows) {
    await db.run(
      `INSERT INTO refund_flow (id, order_no, flow_no, refund_amount, refund_method, refund_status, operator_id, operator_name, operate_time, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [flow.id, flow.order_no, flow.flow_no, flow.refund_amount, flow.refund_method, flow.refund_status, flow.operator_id, flow.operator_name, flow.operate_time, flow.raw_data]
    );
  }
  console.log(`插入 ${dirtyData.dirtyRefundFlows.length} 条脏退款流水记录`);

  console.log('\n造数完成！');
}

async function main(): Promise<void> {
  try {
    console.log('========================================');
    console.log('  社区团购售后验收回放链路服务 - 造数脚本');
    console.log('========================================\n');

    const data = generateSeedData();
    const dirtyData = generateDirtyData();
    await insertData(data, dirtyData);

    process.exit(0);
  } catch (error) {
    console.error('造数失败:', error);
    process.exit(1);
  }
}

main();

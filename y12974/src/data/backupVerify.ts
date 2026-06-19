import type { BackupVerifyResult, VerifyItem } from '../types';

const verifyItemsV2: VerifyItem[] = [
  {
    id: 'vi-001',
    name: '库存表主键完整性',
    category: 'constraint',
    status: 'passed',
    description: 'warehouse_inventory 表主键 id 无重复、无空值',
    detail: '扫描 580000 行记录，主键全部有效',
    relatedMigration: '20240320_143000_add_returns_and_optimize_inventory.sql'
  },
  {
    id: 'vi-002',
    name: '订单表外键一致性',
    category: 'data_integrity',
    status: 'passed',
    description: 'orders.customer_id 与 customers 表关联完整',
    detail: '检查 320000 条订单，客户ID全部有效',
    relatedMigration: '20240320_143000_add_returns_and_optimize_inventory.sql'
  },
  {
    id: 'vi-003',
    name: '库存表唯一索引有效性',
    category: 'index',
    status: 'failed',
    description: 'idx_warehouse_sku 联合唯一索引存在重复数据',
    detail: '发现 23 条记录在同一仓库下 SKU 重复，迁移脚本执行后未清理历史脏数据',
    relatedMigration: '20240320_143000_add_returns_and_optimize_inventory.sql',
    businessImpact: '库存更新时可能出现唯一键冲突，导致库存扣减失败，影响订单发货'
  },
  {
    id: 'vi-004',
    name: '退货单表结构完整性',
    category: 'table_structure',
    status: 'passed',
    description: 'returns 表结构与 schema v2.0.0 定义一致',
    detail: '6 个字段、3 个索引全部匹配定义',
    relatedMigration: '20240320_143000_add_returns_and_optimize_inventory.sql'
  },
  {
    id: 'vi-005',
    name: '库存表 safe_stock 字段默认值',
    category: 'table_structure',
    status: 'warning',
    description: '部分历史记录 safe_stock 字段值为 NULL，而非默认值 10',
    detail: '共 1245 条历史记录在迁移时未填充默认值',
    relatedMigration: '20240320_143000_add_returns_and_optimize_inventory.sql',
    businessImpact: '库存预警计算时可能误判缺货'
  }
];

const verifyItemsV3: VerifyItem[] = [
  {
    id: 'vi-101',
    name: '金额字段精度校验',
    category: 'table_structure',
    status: 'passed',
    description: 'orders.total_amount 和 order_items.unit_price 已升级为 decimal(12,2)',
    detail: '检查 8 张表共 12 个金额字段，精度全部符合 v3.0.0 定义',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql'
  },
  {
    id: 'vi-102',
    name: '订单日志表索引有效性',
    category: 'index',
    status: 'passed',
    description: 'order_logs 表 idx_created_at 索引正常工作',
    detail: 'EXPLAIN 验证按时间范围查询可有效使用索引，扫描行数 / 返回行数 ≈ 1.2',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql'
  },
  {
    id: 'vi-103',
    name: '订单日志表数据一致性',
    category: 'data_integrity',
    status: 'warning',
    description: '部分订单日志缺少操作人信息',
    detail: '迁移前的历史日志共 89000 条 operator 字段为 NULL',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql',
    businessImpact: '审计追踪时无法定位历史操作人'
  },
  {
    id: 'vi-104',
    name: '退货单表联合索引验证',
    category: 'index',
    status: 'passed',
    description: 'returns 表 idx_status_amount 索引可覆盖排序查询',
    detail: 'sq-013 查询使用新索引后，rowsExamined 从 34000 降至 245，filesort 消失',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql'
  },
  {
    id: 'vi-105',
    name: '批量导入表数据完整性',
    category: 'data_integrity',
    status: 'failed',
    description: 'batch_import 表存在重复批次号',
    detail: '发现 5 条记录 batch_no 重复，违反唯一约束',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql',
    businessImpact: '批量导入结果查询可能返回错误数据，影响库存批量更新'
  },
  {
    id: 'vi-106',
    name: '收货地址表默认地址字段',
    category: 'table_structure',
    status: 'passed',
    description: 'shipping_addresses.is_default 字段已添加并设置默认值 0',
    detail: '178000 条记录全部正确填充默认值',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql'
  },
  {
    id: 'vi-107',
    name: '订单明细表联合唯一索引',
    category: 'constraint',
    status: 'failed',
    description: 'idx_order_product 联合唯一索引存在历史重复数据',
    detail: '发现 156 条记录同一订单下同一产品重复出现',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql',
    businessImpact: '订单金额统计可能重复计算，导致财务数据不准确'
  },
  {
    id: 'vi-108',
    name: '库存表全文索引验证',
    category: 'index',
    status: 'passed',
    description: 'warehouse_inventory.sku_name 全文索引已生效',
    detail: '模糊查询性能提升 85%，避免全表扫描',
    relatedMigration: '20240610_100000_upgrade_precision_and_add_tables.sql'
  }
];

export const backupVerifyResults: BackupVerifyResult[] = [
  {
    id: 'verify-20240320',
    timestamp: '2024-03-20 16:00:00',
    schemaVersion: 'v2.0.0',
    status: 'warning',
    items: verifyItemsV2
  },
  {
    id: 'verify-20240610',
    timestamp: '2024-06-10 14:00:00',
    schemaVersion: 'v3.0.0',
    status: 'failed',
    items: verifyItemsV3
  }
];

export const getLatestBackupVerify = (): BackupVerifyResult => {
  return backupVerifyResults[backupVerifyResults.length - 1];
};

export const getBackupVerifyBySchemaVersion = (version: string): BackupVerifyResult | undefined => {
  return backupVerifyResults.find(r => r.schemaVersion === version);
};

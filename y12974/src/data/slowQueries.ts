import type { SlowQuery } from '../types';

export const slowQueries: SlowQuery[] = [
  {
    id: 'sq-001',
    timestamp: '2024-06-18 10:23:45',
    sql: 'SELECT * FROM warehouse_inventory WHERE sku_name LIKE "%ABC%" ORDER BY created_at DESC',
    queryTime: 12.5,
    rowsExamined: 580000,
    rowsSent: 127,
    indexUsed: null,
    indexFailure: {
      detected: true,
      reason: '全表扫描 + 文件排序',
      type: 'full_table_scan',
      explanation: '查询使用了前导通配符%开头的LIKE，无法使用sku_name上的普通索引，导致全表扫描。同时ORDER BY created_at无法利用索引，产生文件排序(filesort)。',
      businessImpact: '库存模糊查询响应超时，仓储拣货员无法快速定位商品，高峰时段可能导致拣货延误。'
    },
    queryType: 'SELECT',
    tableName: 'warehouse_inventory',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-002',
    timestamp: '2024-06-18 10:25:12',
    sql: 'SELECT order_id, status FROM orders WHERE YEAR(order_date) = 2024 AND MONTH(order_date) = 6',
    queryTime: 8.3,
    rowsExamined: 320000,
    rowsSent: 8456,
    indexUsed: null,
    indexFailure: {
      detected: true,
      reason: '索引列上使用函数导致索引失效',
      type: 'index_ignored',
      explanation: '在索引列order_date上使用了YEAR()和MONTH()函数，MySQL无法直接使用idx_order_date索引，退化为全表扫描。应改为范围查询：WHERE order_date >= "2024-06-01" AND order_date < "2024-07-01"。',
      businessImpact: '月度订单统计查询变慢，财务月结时报表生成时间从30秒增加到5分钟。'
    },
    queryType: 'SELECT',
    tableName: 'orders',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-003',
    timestamp: '2024-06-18 10:28:33',
    sql: 'SELECT * FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = "PENDING" GROUP BY oi.product_id ORDER BY SUM(oi.quantity) DESC LIMIT 100',
    queryTime: 15.7,
    rowsExamined: 890000,
    rowsSent: 100,
    indexUsed: 'PRIMARY',
    indexFailure: {
      detected: true,
      reason: '临时表 + 文件排序',
      type: 'temporary_table',
      explanation: 'GROUP BY和ORDER BY的列不同，MySQL需要使用临时表(temporary table)来存储中间结果，然后再进行文件排序(filesort)。扫描行数89万，仅返回100行，效率极低。',
      businessImpact: '热销商品统计报表超时，运营团队无法实时查看销量排行。'
    },
    queryType: 'SELECT',
    tableName: 'order_items, orders',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-004',
    timestamp: '2024-06-18 10:30:01',
    sql: 'SELECT id, name FROM products WHERE id IN (SELECT product_id FROM inventory WHERE quantity < 10)',
    queryTime: 6.8,
    rowsExamined: 245000,
    rowsSent: 892,
    indexUsed: 'PRIMARY',
    indexFailure: {
      detected: true,
      reason: '子查询导致索引未被有效利用',
      type: 'index_ignored',
      explanation: 'IN子查询在MySQL中可能被优化器处理为相关子查询，导致外表每行都执行一次内查询。应改为JOIN查询以提高性能。rowsExamined/rowsSent ≈ 274，严重失衡。',
      businessImpact: '库存预警查询缓慢，仓库补货不及时，可能导致缺货。'
    },
    queryType: 'SELECT',
    tableName: 'products, inventory',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-005',
    timestamp: '2024-06-18 10:32:18',
    sql: 'SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id ORDER BY NULL',
    queryTime: 3.2,
    rowsExamined: 156000,
    rowsSent: 23400,
    indexUsed: 'idx_customer_id',
    indexFailure: {
      detected: false,
      reason: '',
      type: 'full_table_scan',
      explanation: '',
      businessImpact: ''
    },
    queryType: 'SELECT',
    tableName: 'orders',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-006',
    timestamp: '2024-06-18 10:35:42',
    sql: 'UPDATE warehouse_inventory SET quantity = quantity - 1 WHERE sku = "SKU123456"',
    queryTime: 2.1,
    rowsExamined: 1,
    rowsSent: 0,
    indexUsed: 'idx_sku',
    indexFailure: {
      detected: false,
      reason: '',
      type: 'full_table_scan',
      explanation: '',
      businessImpact: ''
    },
    queryType: 'UPDATE',
    tableName: 'warehouse_inventory',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-007',
    timestamp: '2024-06-18 10:38:55',
    sql: 'SELECT * FROM shipping_addresses WHERE phone = 13800138000 LIMIT 1',
    queryTime: 4.5,
    rowsExamined: 178000,
    rowsSent: 1,
    indexUsed: null,
    indexFailure: {
      detected: true,
      reason: '隐式类型转换导致索引失效',
      type: 'index_ignored',
      explanation: 'phone字段是VARCHAR类型，但查询条件使用了数字13800138000（不带引号），MySQL需要对每行进行类型转换后才能比较，导致idx_phone索引失效，退化为全表扫描。应改为phone = "13800138000"。',
      businessImpact: '收货地址查询超时，订单发货地址匹配缓慢。'
    },
    queryType: 'SELECT',
    tableName: 'shipping_addresses',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-008',
    timestamp: '2024-06-18 10:41:20',
    sql: 'SELECT * FROM orders WHERE status = "SHIPPED" ORDER BY shipped_at DESC LIMIT 100000, 20',
    queryTime: 7.9,
    rowsExamined: 100020,
    rowsSent: 20,
    indexUsed: 'idx_status_shipped_at',
    indexFailure: {
      detected: true,
      reason: '深分页导致大量数据扫描',
      type: 'index_ignored',
      explanation: '使用LIMIT 100000, 20进行深分页，即使使用了索引，也需要扫描并跳过前100000条记录。应改为基于上次位置的游标分页：WHERE id < last_id ORDER BY id DESC LIMIT 20。',
      businessImpact: '订单列表翻页到后面越来越慢，仓储操作员翻页体验差。'
    },
    queryType: 'SELECT',
    tableName: 'orders',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-009',
    timestamp: '2024-06-18 10:45:07',
    sql: 'SELECT w.id, w.name, COUNT(i.id) as item_count FROM warehouses w LEFT JOIN inventory i ON w.id = i.warehouse_id GROUP BY w.id, w.name',
    queryTime: 2.8,
    rowsExamined: 67000,
    rowsSent: 12,
    indexUsed: 'PRIMARY',
    indexFailure: {
      detected: false,
      reason: '',
      type: 'full_table_scan',
      explanation: '',
      businessImpact: ''
    },
    queryType: 'SELECT',
    tableName: 'warehouses, inventory',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-010',
    timestamp: '2024-06-18 10:48:33',
    sql: 'DELETE FROM order_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    queryTime: 25.3,
    rowsExamined: 1200000,
    rowsSent: 0,
    indexUsed: 'idx_created_at',
    indexFailure: {
      detected: true,
      reason: '大批量删除导致锁等待和索引维护',
      type: 'index_ignored',
      explanation: '一次性删除120万条记录，即使使用了索引也会导致长时间锁表、大量索引维护和binlog写入。应改为分批删除，每次删除1000-5000条，循环执行。',
      businessImpact: '日志清理期间订单日志表被锁定，新订单无法写入日志，可能导致数据丢失。'
    },
    queryType: 'DELETE',
    tableName: 'order_logs',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-011',
    timestamp: '2024-06-18 10:52:15',
    sql: 'INSERT INTO batch_import (id, data) VALUES (1, "..."), (2, "..."), ... , (1000, "...")',
    queryTime: 4.2,
    rowsExamined: 0,
    rowsSent: 0,
    indexUsed: null,
    indexFailure: {
      detected: false,
      reason: '',
      type: 'full_table_scan',
      explanation: '',
      businessImpact: ''
    },
    queryType: 'INSERT',
    tableName: 'batch_import',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-012',
    timestamp: '2024-06-18 10:55:48',
    sql: 'SELECT category_id, AVG(price) as avg_price FROM products GROUP BY category_id WITH ROLLUP',
    queryTime: 1.9,
    rowsExamined: 45000,
    rowsSent: 58,
    indexUsed: 'idx_category_price',
    indexFailure: {
      detected: false,
      reason: '',
      type: 'full_table_scan',
      explanation: '',
      businessImpact: ''
    },
    queryType: 'SELECT',
    tableName: 'products',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-013',
    timestamp: '2024-06-18 11:00:22',
    sql: 'SELECT * FROM returns r WHERE r.status = "PENDING" AND r.created_at > "2024-01-01" ORDER BY r.amount DESC',
    queryTime: 5.6,
    rowsExamined: 34000,
    rowsSent: 245,
    indexUsed: 'idx_status',
    indexFailure: {
      detected: true,
      reason: '排序字段不在索引中导致filesort',
      type: 'filesort',
      explanation: 'idx_status索引只能用于过滤status = "PENDING"，但ORDER BY amount不在联合索引中，MySQL需要对结果集进行文件排序(filesort)。应创建联合索引idx_status_amount(status, amount)。',
      businessImpact: '退货单按金额排序查询缓慢，财务审核退货时等待时间长。'
    },
    queryType: 'SELECT',
    tableName: 'returns',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-014',
    timestamp: '2024-06-18 11:05:10',
    sql: 'SELECT p.name, p.sku, SUM(oi.quantity) as total_sold FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE p.category_id = 15 GROUP BY p.id ORDER BY total_sold DESC',
    queryTime: 9.1,
    rowsExamined: 145000,
    rowsSent: 340,
    indexUsed: 'PRIMARY',
    indexFailure: {
      detected: true,
      reason: '连接查询+分组排序产生临时表',
      type: 'temporary_table',
      explanation: 'JOIN后按产品ID分组并按聚合结果排序，MySQL需要使用临时表存储分组结果，然后进行文件排序。rowsExamined与rowsSent比例约426:1，性能较差。',
      businessImpact: '分类销量排行查询超时，运营部门无法及时获取销售数据。'
    },
    queryType: 'SELECT',
    tableName: 'products, order_items',
    dbName: 'warehouse_db'
  },
  {
    id: 'sq-015',
    timestamp: '2024-06-18 11:10:30',
    sql: 'SELECT id, order_no FROM orders WHERE id = LAST_INSERT_ID()',
    queryTime: 0.05,
    rowsExamined: 1,
    rowsSent: 1,
    indexUsed: 'PRIMARY',
    indexFailure: {
      detected: false,
      reason: '',
      type: 'full_table_scan',
      explanation: '',
      businessImpact: ''
    },
    queryType: 'SELECT',
    tableName: 'orders',
    dbName: 'warehouse_db'
  }
];

export const getIndexFailureQueries = (): SlowQuery[] => {
  return slowQueries.filter(q => q.indexFailure.detected);
};

export const getSlowQueriesByTable = (tableName: string): SlowQuery[] => {
  return slowQueries.filter(q => q.tableName.includes(tableName));
};

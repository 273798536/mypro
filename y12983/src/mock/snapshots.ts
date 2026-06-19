import type { TableSnapshot } from '@/types';

export const mockSnapshots: TableSnapshot[] = [
  {
    id: 'snap_001_v1',
    gapId: 'gap_001',
    tableName: 'monitor_metrics',
    version: 'v1.2.0',
    createdAt: '2024-06-01T00:00:00Z',
    schema: {
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, comment: '主键ID' },
        { name: 'metric_name', type: 'VARCHAR(128)', nullable: false, comment: '指标名称' },
        { name: 'metric_value', type: 'DOUBLE', nullable: false, comment: '指标值' },
        { name: 'timestamp', type: 'DATETIME', nullable: false, comment: '采样时间' },
        { name: 'tags', type: 'JSON', nullable: true, comment: '标签' },
        { name: 'created_at', type: 'DATETIME', nullable: false, default: 'CURRENT_TIMESTAMP' },
      ],
      indexes: [
        { name: 'PRIMARY', columns: ['id'], unique: true },
        { name: 'idx_metric_time', columns: ['metric_name', 'timestamp'], unique: false },
      ],
      partitionBy: 'timestamp',
    },
    ddl: `CREATE TABLE monitor_metrics (
  id BIGINT NOT NULL AUTO_INCREMENT,
  metric_name VARCHAR(128) NOT NULL COMMENT '指标名称',
  metric_value DOUBLE NOT NULL COMMENT '指标值',
  timestamp DATETIME NOT NULL COMMENT '采样时间',
  tags JSON NULL COMMENT '标签',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_metric_time (metric_name, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
PARTITION BY RANGE (TO_DAYS(timestamp)) (
  PARTITION p20240601 VALUES LESS THAN (TO_DAYS('2024-06-02')),
  PARTITION p20240602 VALUES LESS THAN (TO_DAYS('2024-06-03'))
);`,
  },
  {
    id: 'snap_001_v2',
    gapId: 'gap_001',
    tableName: 'monitor_metrics',
    version: 'v1.3.0',
    createdAt: '2024-06-15T10:00:00Z',
    schema: {
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, comment: '主键ID' },
        { name: 'metric_name', type: 'VARCHAR(128)', nullable: false, comment: '指标名称' },
        { name: 'metric_value', type: 'DOUBLE', nullable: false, comment: '指标值' },
        { name: 'timestamp', type: 'DATETIME', nullable: false, comment: '采样时间' },
        { name: 'tags', type: 'JSON', nullable: true, comment: '标签' },
        { name: 'unit', type: 'VARCHAR(32)', nullable: true, comment: '单位' },
        { name: 'created_at', type: 'DATETIME', nullable: false, default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
      ],
      indexes: [
        { name: 'PRIMARY', columns: ['id'], unique: true },
        { name: 'idx_metric_time', columns: ['metric_name', 'timestamp'], unique: false },
        { name: 'idx_timestamp', columns: ['timestamp'], unique: false },
      ],
      partitionBy: 'timestamp',
    },
    ddl: `CREATE TABLE monitor_metrics (
  id BIGINT NOT NULL AUTO_INCREMENT,
  metric_name VARCHAR(128) NOT NULL COMMENT '指标名称',
  metric_value DOUBLE NOT NULL COMMENT '指标值',
  timestamp DATETIME NOT NULL COMMENT '采样时间',
  tags JSON NULL COMMENT '标签',
  unit VARCHAR(32) NULL COMMENT '单位',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_metric_time (metric_name, timestamp),
  KEY idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
PARTITION BY RANGE (TO_DAYS(timestamp)) (
  PARTITION p20240601 VALUES LESS THAN (TO_DAYS('2024-06-02')),
  PARTITION p20240602 VALUES LESS THAN (TO_DAYS('2024-06-03'))
);`,
  },
  {
    id: 'snap_002_v1',
    gapId: 'gap_002',
    tableName: 'order_detail',
    version: 'v2.0.0',
    createdAt: '2024-06-14T12:00:00Z',
    schema: {
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, comment: '明细ID' },
        { name: 'order_id', type: 'BIGINT', nullable: false, comment: '订单ID' },
        { name: 'product_id', type: 'BIGINT', nullable: false, comment: '商品ID' },
        { name: 'quantity', type: 'INT', nullable: false, comment: '数量' },
        { name: 'price', type: 'DECIMAL(10,2)', nullable: false, comment: '单价' },
        { name: 'created_at', type: 'DATETIME', nullable: false, default: 'CURRENT_TIMESTAMP' },
      ],
      indexes: [
        { name: 'PRIMARY', columns: ['id'], unique: true },
        { name: 'idx_order_id', columns: ['order_id'], unique: false },
        { name: 'idx_product_id', columns: ['product_id'], unique: false },
      ],
    },
    ddl: `CREATE TABLE order_detail (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  order_id BIGINT NOT NULL COMMENT '订单ID',
  product_id BIGINT NOT NULL COMMENT '商品ID',
  quantity INT NOT NULL COMMENT '数量',
  price DECIMAL(10,2) NOT NULL COMMENT '单价',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_id (order_id),
  KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  },
];

export const getMockSnapshots = (): TableSnapshot[] => {
  return JSON.parse(JSON.stringify(mockSnapshots));
};

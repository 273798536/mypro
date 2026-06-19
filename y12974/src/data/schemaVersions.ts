import type { SchemaVersion, SchemaTable, SchemaColumn, SchemaIndex } from '../types';

const v1Tables: SchemaTable[] = [
  {
    name: 'warehouse_inventory',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '库存表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false, comment: '主键ID' },
      { name: 'sku', type: 'varchar(64)', nullable: false, comment: 'SKU编码' },
      { name: 'sku_name', type: 'varchar(255)', nullable: false, comment: 'SKU名称' },
      { name: 'quantity', type: 'int(11)', nullable: false, default: '0', comment: '库存数量' },
      { name: 'warehouse_id', type: 'int(11)', nullable: false, comment: '仓库ID' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_sku', columns: ['sku'], type: 'UNIQUE' },
      { name: 'idx_warehouse', columns: ['warehouse_id'], type: 'NORMAL' }
    ]
  },
  {
    name: 'orders',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false, comment: '主键ID' },
      { name: 'order_no', type: 'varchar(32)', nullable: false, comment: '订单号' },
      { name: 'customer_id', type: 'bigint(20)', nullable: false, comment: '客户ID' },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'PENDING', comment: '订单状态' },
      { name: 'total_amount', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'order_date', type: 'datetime', nullable: false, comment: '下单时间' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_no', columns: ['order_no'], type: 'UNIQUE' },
      { name: 'idx_customer_id', columns: ['customer_id'], type: 'NORMAL' },
      { name: 'idx_order_date', columns: ['order_date'], type: 'NORMAL' }
    ]
  },
  {
    name: 'order_items',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单明细表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'order_id', type: 'bigint(20)', nullable: false },
      { name: 'product_id', type: 'bigint(20)', nullable: false },
      { name: 'quantity', type: 'int(11)', nullable: false, default: '1' },
      { name: 'unit_price', type: 'decimal(10,2)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_id', columns: ['order_id'], type: 'NORMAL' }
    ]
  },
  {
    name: 'products',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '商品表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'name', type: 'varchar(255)', nullable: false },
      { name: 'sku', type: 'varchar(64)', nullable: false },
      { name: 'price', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'category_id', type: 'int(11)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_sku', columns: ['sku'], type: 'UNIQUE' },
      { name: 'idx_category_id', columns: ['category_id'], type: 'NORMAL' }
    ]
  },
  {
    name: 'shipping_addresses',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '收货地址表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'customer_id', type: 'bigint(20)', nullable: false },
      { name: 'receiver_name', type: 'varchar(64)', nullable: false },
      { name: 'phone', type: 'varchar(20)', nullable: false },
      { name: 'address', type: 'varchar(512)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_customer_id', columns: ['customer_id'], type: 'NORMAL' },
      { name: 'idx_phone', columns: ['phone'], type: 'NORMAL' }
    ]
  }
];

const v2Tables: SchemaTable[] = [
  {
    name: 'warehouse_inventory',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '库存表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false, comment: '主键ID' },
      { name: 'sku', type: 'varchar(64)', nullable: false, comment: 'SKU编码' },
      { name: 'sku_name', type: 'varchar(255)', nullable: false, comment: 'SKU名称' },
      { name: 'quantity', type: 'int(11)', nullable: false, default: '0', comment: '库存数量' },
      { name: 'warehouse_id', type: 'int(11)', nullable: false, comment: '仓库ID' },
      { name: 'safe_stock', type: 'int(11)', nullable: false, default: '10', comment: '安全库存' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_sku', columns: ['sku'], type: 'UNIQUE' },
      { name: 'idx_warehouse_sku', columns: ['warehouse_id', 'sku'], type: 'UNIQUE' },
      { name: 'idx_sku_name', columns: ['sku_name'], type: 'NORMAL' }
    ]
  },
  {
    name: 'orders',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false, comment: '主键ID' },
      { name: 'order_no', type: 'varchar(32)', nullable: false, comment: '订单号' },
      { name: 'customer_id', type: 'bigint(20)', nullable: false, comment: '客户ID' },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'PENDING', comment: '订单状态' },
      { name: 'total_amount', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'order_date', type: 'datetime', nullable: false, comment: '下单时间' },
      { name: 'shipped_at', type: 'datetime', nullable: true, comment: '发货时间' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_no', columns: ['order_no'], type: 'UNIQUE' },
      { name: 'idx_customer_id', columns: ['customer_id'], type: 'NORMAL' },
      { name: 'idx_order_date', columns: ['order_date'], type: 'NORMAL' },
      { name: 'idx_status_shipped_at', columns: ['status', 'shipped_at'], type: 'NORMAL' }
    ]
  },
  {
    name: 'order_items',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单明细表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'order_id', type: 'bigint(20)', nullable: false },
      { name: 'product_id', type: 'bigint(20)', nullable: false },
      { name: 'quantity', type: 'int(11)', nullable: false, default: '1' },
      { name: 'unit_price', type: 'decimal(10,2)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_id', columns: ['order_id'], type: 'NORMAL' },
      { name: 'idx_product_id', columns: ['product_id'], type: 'NORMAL' }
    ]
  },
  {
    name: 'products',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '商品表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'name', type: 'varchar(255)', nullable: false },
      { name: 'sku', type: 'varchar(64)', nullable: false },
      { name: 'price', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'category_id', type: 'int(11)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_sku', columns: ['sku'], type: 'UNIQUE' },
      { name: 'idx_category_price', columns: ['category_id', 'price'], type: 'NORMAL' }
    ]
  },
  {
    name: 'shipping_addresses',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '收货地址表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'customer_id', type: 'bigint(20)', nullable: false },
      { name: 'receiver_name', type: 'varchar(64)', nullable: false },
      { name: 'phone', type: 'varchar(20)', nullable: false },
      { name: 'address', type: 'varchar(512)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_customer_id', columns: ['customer_id'], type: 'NORMAL' },
      { name: 'idx_phone', columns: ['phone'], type: 'NORMAL' }
    ]
  },
  {
    name: 'returns',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '退货单表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'order_id', type: 'bigint(20)', nullable: false },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'PENDING' },
      { name: 'amount', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'reason', type: 'varchar(512)', nullable: true },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_id', columns: ['order_id'], type: 'NORMAL' },
      { name: 'idx_status', columns: ['status'], type: 'NORMAL' }
    ]
  }
];

const v3Tables: SchemaTable[] = [
  {
    name: 'warehouse_inventory',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '库存表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false, comment: '主键ID' },
      { name: 'sku', type: 'varchar(64)', nullable: false, comment: 'SKU编码' },
      { name: 'sku_name', type: 'varchar(255)', nullable: false, comment: 'SKU名称' },
      { name: 'quantity', type: 'int(11)', nullable: false, default: '0', comment: '库存数量' },
      { name: 'warehouse_id', type: 'int(11)', nullable: false, comment: '仓库ID' },
      { name: 'safe_stock', type: 'int(11)', nullable: false, default: '10', comment: '安全库存' },
      { name: 'last_updated_by', type: 'varchar(64)', nullable: true, comment: '最后更新人' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_sku', columns: ['sku'], type: 'UNIQUE' },
      { name: 'idx_warehouse_sku', columns: ['warehouse_id', 'sku'], type: 'UNIQUE' },
      { name: 'idx_sku_name', columns: ['sku_name'], type: 'FULLTEXT' }
    ]
  },
  {
    name: 'orders',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false, comment: '主键ID' },
      { name: 'order_no', type: 'varchar(32)', nullable: false, comment: '订单号' },
      { name: 'customer_id', type: 'bigint(20)', nullable: false, comment: '客户ID' },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'PENDING', comment: '订单状态' },
      { name: 'total_amount', type: 'decimal(12,2)', nullable: false, default: '0.00' },
      { name: 'order_date', type: 'datetime', nullable: false, comment: '下单时间' },
      { name: 'shipped_at', type: 'datetime', nullable: true, comment: '发货时间' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_no', columns: ['order_no'], type: 'UNIQUE' },
      { name: 'idx_customer_status', columns: ['customer_id', 'status'], type: 'NORMAL' },
      { name: 'idx_order_date', columns: ['order_date'], type: 'NORMAL' },
      { name: 'idx_status_shipped_at', columns: ['status', 'shipped_at'], type: 'NORMAL' }
    ]
  },
  {
    name: 'order_items',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单明细表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'order_id', type: 'bigint(20)', nullable: false },
      { name: 'product_id', type: 'bigint(20)', nullable: false },
      { name: 'quantity', type: 'int(11)', nullable: false, default: '1' },
      { name: 'unit_price', type: 'decimal(12,2)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_product', columns: ['order_id', 'product_id'], type: 'UNIQUE' },
      { name: 'idx_product_id', columns: ['product_id'], type: 'NORMAL' }
    ]
  },
  {
    name: 'products',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '商品表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'name', type: 'varchar(255)', nullable: false },
      { name: 'sku', type: 'varchar(64)', nullable: false },
      { name: 'price', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'category_id', type: 'int(11)', nullable: false },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_sku', columns: ['sku'], type: 'UNIQUE' },
      { name: 'idx_category_price', columns: ['category_id', 'price'], type: 'NORMAL' }
    ]
  },
  {
    name: 'shipping_addresses',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '收货地址表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'customer_id', type: 'bigint(20)', nullable: false },
      { name: 'receiver_name', type: 'varchar(64)', nullable: false },
      { name: 'phone', type: 'varchar(20)', nullable: false },
      { name: 'address', type: 'varchar(512)', nullable: false },
      { name: 'is_default', type: 'tinyint(1)', nullable: false, default: '0' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_customer_id', columns: ['customer_id'], type: 'NORMAL' },
      { name: 'idx_phone', columns: ['phone'], type: 'NORMAL' }
    ]
  },
  {
    name: 'returns',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '退货单表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'order_id', type: 'bigint(20)', nullable: false },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'PENDING' },
      { name: 'amount', type: 'decimal(10,2)', nullable: false, default: '0.00' },
      { name: 'reason', type: 'varchar(512)', nullable: true },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_id', columns: ['order_id'], type: 'NORMAL' },
      { name: 'idx_status_amount', columns: ['status', 'amount'], type: 'NORMAL' }
    ]
  },
  {
    name: 'order_logs',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '订单日志表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'order_id', type: 'bigint(20)', nullable: false },
      { name: 'action', type: 'varchar(50)', nullable: false },
      { name: 'operator', type: 'varchar(64)', nullable: true },
      { name: 'detail', type: 'text', nullable: true },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_order_id', columns: ['order_id'], type: 'NORMAL' },
      { name: 'idx_created_at', columns: ['created_at'], type: 'NORMAL' }
    ]
  },
  {
    name: 'batch_import',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '批量导入表',
    columns: [
      { name: 'id', type: 'bigint(20)', nullable: false },
      { name: 'batch_no', type: 'varchar(32)', nullable: false },
      { name: 'data', type: 'text', nullable: false },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'PENDING' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' },
      { name: 'idx_batch_no', columns: ['batch_no'], type: 'UNIQUE' }
    ]
  },
  {
    name: 'warehouses',
    engine: 'InnoDB',
    charset: 'utf8mb4',
    comment: '仓库表',
    columns: [
      { name: 'id', type: 'int(11)', nullable: false },
      { name: 'name', type: 'varchar(128)', nullable: false },
      { name: 'address', type: 'varchar(512)', nullable: true },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'ACTIVE' },
      { name: 'created_at', type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP' }
    ],
    indexes: [
      { name: 'PRIMARY', columns: ['id'], type: 'PRIMARY' }
    ]
  }
];

export const schemaVersions: SchemaVersion[] = [
  {
    version: 'v1.0.0',
    timestamp: '2024-01-15 09:00:00',
    description: '初始版本，包含核心业务表',
    tables: v1Tables
  },
  {
    version: 'v2.0.0',
    timestamp: '2024-03-20 14:30:00',
    description: '新增退货单表，优化库存索引',
    migrationScript: '20240320_143000_add_returns_and_optimize_inventory.sql',
    migrationName: '新增退货单表和库存优化',
    tables: v2Tables
  },
  {
    version: 'v3.0.0',
    timestamp: '2024-06-10 10:00:00',
    description: '金额精度升级，新增订单日志、批量导入、仓库表，优化索引',
    migrationScript: '20240610_100000_upgrade_precision_and_add_tables.sql',
    migrationName: '精度升级和新表',
    tables: v3Tables
  }
];

export const getLatestSchemaVersion = (): SchemaVersion => {
  return schemaVersions[schemaVersions.length - 1];
};

export const getSchemaVersion = (version: string): SchemaVersion | undefined => {
  return schemaVersions.find(v => v.version === version);
};

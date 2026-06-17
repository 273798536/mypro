-- 当前 Schema v2.3
-- 仓储系统数据库最新结构

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `manager` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` tinyint(1) DEFAULT '1',
  `capacity` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_region` (`status`,`manager`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库表';

CREATE TABLE `product_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `parent_id` int(11) DEFAULT '0',
  `sort_order` int(11) DEFAULT '0',
  `status` tinyint(1) DEFAULT '1',
  `level` int(11) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status_level` (`status`,`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `credit_level` varchar(20) DEFAULT 'normal',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_region_active` (`region`,`is_active`),
  KEY `idx_credit_level` (`credit_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表';

CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `cost` decimal(10,2) DEFAULT '0.00',
  `weight` decimal(8,2) DEFAULT '0.00',
  `warehouse_id` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku` (`sku`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_warehouse_status` (`warehouse_id`,`status`),
  KEY `idx_price` (`price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `level` varchar(20) DEFAULT 'normal',
  `points` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户表';

CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_no` varchar(32) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'pending',
  `priority` varchar(20) DEFAULT 'normal',
  `payment_method` varchar(20) DEFAULT NULL,
  `shipping_fee` decimal(8,2) DEFAULT '0.00',
  `remark` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_status_created` (`status`,`created_at`),
  KEY `idx_warehouse_status` (`warehouse_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int(11) DEFAULT '0',
  `price` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(5,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT '0',
  `available_qty` int(11) DEFAULT '0',
  `locked_qty` int(11) DEFAULT '0',
  `safety_stock` int(11) DEFAULT '0',
  `status` varchar(20) DEFAULT 'normal',
  `category_id` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_warehouse` (`product_id`,`warehouse_id`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_status_warehouse` (`status`,`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `po_no` varchar(32) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'draft',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_no` (`po_no`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单表';

CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_no` varchar(32) NOT NULL,
  `from_warehouse_id` int(11) DEFAULT NULL,
  `to_warehouse_id` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_no` (`transfer_no`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存调拨表';

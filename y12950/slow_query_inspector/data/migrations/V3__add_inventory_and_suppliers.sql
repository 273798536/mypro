-- V3__add_inventory_and_suppliers.sql
-- 新增库存和供应商表

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `region` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_region` (`region`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT '0',
  `status` varchar(20) DEFAULT 'normal',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_warehouse` (`product_id`,`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `products` ADD COLUMN `supplier_id` int(11) DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN `warehouse_id` int(11) DEFAULT NULL;
ALTER TABLE `products` ADD KEY `idx_supplier_id` (`supplier_id`);
ALTER TABLE `products` ADD KEY `idx_warehouse_id` (`warehouse_id`);

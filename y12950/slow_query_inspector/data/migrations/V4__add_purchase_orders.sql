-- V4__add_purchase_orders.sql
-- 新增采购订单表

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `po_no` varchar(32) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `warehouse_id` int(11) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'draft',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_no` (`po_no`),
  KEY `idx_supplier_id` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `orders` ADD COLUMN `payment_method` varchar(20) DEFAULT NULL;
ALTER TABLE `orders` ADD COLUMN `supplier_id` int(11) DEFAULT NULL;

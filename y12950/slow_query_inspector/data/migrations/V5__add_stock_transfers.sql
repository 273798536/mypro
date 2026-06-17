-- V5__add_stock_transfers.sql
-- 新增库存调拨表（待执行）

CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_no` varchar(32) NOT NULL,
  `from_warehouse_id` int(11) DEFAULT NULL,
  `to_warehouse_id` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_no` (`transfer_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `inventory` ADD COLUMN `safety_stock` int(11) DEFAULT '0';

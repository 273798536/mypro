-- schema 快照：迁移后
CREATE TABLE stock (
  id BIGINT NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  warehouse_id VARCHAR(32) NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_stock_sku (sku),
  UNIQUE KEY uq_stock_warehouse_sku (warehouse_id, sku)
) ENGINE=InnoDB;

CREATE TABLE stock_move_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  move_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_move_created (created_at)
) ENGINE=InnoDB;

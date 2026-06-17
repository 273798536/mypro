-- schema 快照：迁移前
CREATE TABLE stock (
  id BIGINT NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  warehouse_id VARCHAR(32) NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_stock_sku (sku)
) ENGINE=InnoDB;

CREATE TABLE stock_move_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  move_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

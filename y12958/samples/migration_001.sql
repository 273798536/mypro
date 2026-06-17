-- batch_001: 给 stock 表的 (warehouse_id, sku) 加唯一约束，缓解锁等待
-- 迁移脚本会被记录 content_hash，二次导入应识别为同一份而非新增。

ALTER TABLE stock
  ADD CONSTRAINT uq_stock_warehouse_sku UNIQUE (warehouse_id, sku);

ALTER TABLE stock_move_log
  ADD INDEX idx_move_created (created_at);

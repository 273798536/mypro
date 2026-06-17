-- 005_add_order_payment.sql
-- 添加订单支付相关字段
ALTER TABLE orders ADD COLUMN pay_method VARCHAR(20);
ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(100);

CREATE INDEX idx_orders_paid_at ON orders(paid_at);

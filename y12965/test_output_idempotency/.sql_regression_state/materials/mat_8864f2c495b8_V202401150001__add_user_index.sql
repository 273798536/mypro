-- 为users表添加性能优化索引
-- 版本: V202401150001
-- 作者: SRE Team
-- 日期: 2024-01-15

CREATE INDEX idx_users_name ON users (name);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status_created ON users (status, created_at DESC);

-- 为orders表添加复合索引
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
CREATE INDEX idx_orders_created_amount ON orders (created_at, amount DESC);

ANALYZE TABLE users;
ANALYZE TABLE orders;

-- 006_seed_sample_data.sql
-- 插入样例数据（包含一条"坏数据"）

INSERT INTO users (username, email, password_hash, nickname, phone) VALUES
('alice', 'alice@example.com', 'hash123', '爱丽丝', '13800000001'),
('bob', 'bob@example.com', 'hash456', '鲍勃', '13800000002'),
('charlie', 'charlie@example.com', 'hash789', '查理', '13800000003');

INSERT INTO orders (user_id, order_no, total_amount, status, pay_method, paid_at) VALUES
(1, 'ORD20240101001', 99.90, 'paid', 'alipay', '2024-01-01 10:00:00'),
(1, 'ORD20240102002', 199.50, 'paid', 'wechat', '2024-01-02 14:30:00'),
(2, 'ORD20240103003', 49.00, 'pending', NULL, NULL),
(3, 'ORD20240104004', 299.99, 'paid', 'alipay', '2024-01-04 09:15:00');

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
(1, 101, '无线鼠标', 1, 99.90, 99.90),
(2, 102, '机械键盘', 1, 199.50, 199.50),
(3, 103, '鼠标垫', 1, 49.00, 49.00),
(4, 104, '显示器支架', 1, 299.99, 299.99);

-- 下面这条是坏数据：order_id 引用了一个不存在的订单（脏数据）
-- 这是平时业务工单里可能混进来的小麻烦
INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
(9999, 105, '神秘商品', 2, 88.88, 177.76);

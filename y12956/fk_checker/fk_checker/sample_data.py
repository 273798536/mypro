SCHEMA_SQL = """
CREATE DATABASE IF NOT EXISTS fk_demo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE fk_demo;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS audit_log;

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    total_amount DECIMAL(12,2) NOT NULL,
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""

CATEGORIES_DATA = [
    (1, "电子产品", None),
    (2, "手机数码", 1),
    (3, "电脑办公", 1),
    (4, "服装鞋帽", None),
    (5, "男装", 4),
    (6, "女装", 4),
    (7, "食品饮料", None),
]

USERS_DATA = [
    (1, "zhangsan", "zhangsan@example.com", 1),
    (2, "lisi", "lisi@example.com", 1),
    (3, "wangwu", "wangwu@example.com", 1),
    (4, "zhaoliu", "zhaoliu@example.com", 0),
    (5, "qianqi", "qianqi@example.com", 1),
    (10, "sunba", "sunba@example.com", 1),
]

PRODUCTS_DATA = [
    (1, "iPhone 15 Pro", 2, 8999.00, 100),
    (2, "MacBook Pro 14", 3, 14999.00, 50),
    (3, "华为 Mate 60", 2, 6999.00, 200),
    (4, "男士休闲衬衫", 5, 199.00, 500),
    (5, "女士连衣裙", 6, 299.00, 300),
    (6, "有机牛奶 1L", 7, 12.90, 1000),
    (7, "进口巧克力", 7, 68.00, 200),
    (8, "机械键盘", 99, 399.00, 150),
    (9, "蓝牙耳机", 2, 299.00, 0),
]

ORDERS_DATA = [
    (1, 1, "ORD202401001", 8999.00, 2),
    (2, 2, "ORD202401002", 7198.00, 1),
    (3, 3, "ORD202401003", 199.00, 0),
    (4, 5, "ORD202401004", 68.00, 3),
    (5, 6, "ORD202401005", 299.00, 1),
    (10, 1, "ORD202401010", 399.00, 2),
]

ORDER_ITEMS_DATA = [
    (1, 1, 1, 1, 8999.00),
    (2, 2, 3, 1, 6999.00),
    (3, 2, 9, 1, 199.00),
    (4, 3, 4, 1, 199.00),
    (5, 4, 7, 1, 68.00),
    (6, 5, 5, 1, 299.00),
    (7, 6, 8, 1, 399.00),
    (8, 7, 99, 2, 150.00),
]

AUDIT_LOG_DATA = [
    (1, 1, "login", None, None, "用户登录系统"),
    (2, 2, "update_product", "products", 1, "修改了商品价格"),
    (3, None, "system_check", None, None, "系统定时巡检"),
    (4, 99, "delete_order", "orders", 100, "删除了订单"),
    (5, 3, "create_order", "orders", 3, "创建新订单"),
]


def get_sample_sql() -> str:
    lines = [SCHEMA_SQL]

    lines.append("-- 插入分类数据")
    lines.append("INSERT INTO categories (id, name, parent_id) VALUES")
    vals = [f"  ({cid}, '{name}', {pid if pid else 'NULL'})" for cid, name, pid in CATEGORIES_DATA]
    lines.append(",\n".join(vals) + ";")
    lines.append("")

    lines.append("-- 插入用户数据")
    lines.append("INSERT INTO users (id, username, email, status) VALUES")
    vals = [f"  ({uid}, '{uname}', '{email}', {status})" for uid, uname, email, status in USERS_DATA]
    lines.append(",\n".join(vals) + ";")
    lines.append("")

    lines.append("-- 插入商品数据")
    lines.append("INSERT INTO products (id, name, category_id, price, stock) VALUES")
    vals = [f"  ({pid}, '{name}', {cid}, {price}, {stock})" for pid, name, cid, price, stock in PRODUCTS_DATA]
    lines.append(",\n".join(vals) + ";")
    lines.append("")

    lines.append("-- 插入订单数据")
    lines.append("INSERT INTO orders (id, user_id, order_no, total_amount, status) VALUES")
    vals = [f"  ({oid}, {uid}, '{ono}', {amount}, {status})" for oid, uid, ono, amount, status in ORDERS_DATA]
    lines.append(",\n".join(vals) + ";")
    lines.append("")

    lines.append("-- 插入订单明细数据")
    lines.append("INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES")
    vals = [f"  ({iid}, {oid}, {pid}, {qty}, {price})" for iid, oid, pid, qty, price in ORDER_ITEMS_DATA]
    lines.append(",\n".join(vals) + ";")
    lines.append("")

    lines.append("-- 插入审计日志数据")
    lines.append("INSERT INTO audit_log (id, user_id, action, target_table, target_id, detail) VALUES")
    vals = []
    for aid, uid, action, ttable, tid, detail in AUDIT_LOG_DATA:
        uid_str = str(uid) if uid is not None else "NULL"
        ttable_str = f"'{ttable}'" if ttable else "NULL"
        tid_str = str(tid) if tid else "NULL"
        vals.append(f"  ({aid}, {uid_str}, '{action}', {ttable_str}, {tid_str}, '{detail}')")
    lines.append(",\n".join(vals) + ";")
    lines.append("")

    return "\n".join(lines)


SAMPLE_BROKEN_LINKS_DESC = """
样例数据中故意混入的"小麻烦"说明：

1. products 表中 id=8 的商品（机械键盘），category_id=99 —— 分类表中没有这个分类
   这类问题通常出现在：分类数据清理后，老商品忘记同步更新

2. orders 表中 id=5 的订单，user_id=6 —— 用户表中没有 id=6 的用户
   这类问题通常出现在：用户注销/迁移时，历史订单没处理

3. order_items 表中 id=7 的订单项，order_id=6 —— 订单表中没有 id=6 的订单
   （但注意：orders 里有 id=10，跳过了一些ID，像日常导数据跳号的情况）
   这类问题通常出现在：数据迁移时部分订单丢失，但明细还在

4. order_items 表中 id=8 的订单项，product_id=99 —— 商品表中没有这个商品
   这类问题通常出现在：商品下架硬删除后，历史订单项成了孤儿

5. audit_log 表中 id=4 的日志，user_id=99 —— 操作者是个不存在的用户
   这类问题通常出现在：老系统导过来的数据，用户ID体系对不上

6. categories 表中 parent_id 虽然没有外键约束，但 id=2、3 的父级是 1（有效）
   id=5、6 的父级是 4（有效）—— 逻辑外键，不在本工具物理外键检查范围内
"""

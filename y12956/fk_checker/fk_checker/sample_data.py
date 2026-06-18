from typing import List

SCHEMA_SQL_TEMPLATE = """
CREATE DATABASE IF NOT EXISTS `{schema}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `{schema}`;

-- 按依赖逆序删表
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;

-- ========== 建表（都带真实外键约束，这样 information_schema 里能查到 ==========

CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    total_amount DECIMAL(12,2) NOT NULL,
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_orderitems_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditlog_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
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

PRODUCTS_DATA_GOOD = [
    (1, "iPhone 15 Pro", 2, 8999.00, 100),
    (2, "MacBook Pro 14", 3, 14999.00, 50),
    (3, "华为 Mate 60", 2, 6999.00, 200),
    (4, "男士休闲衬衫", 5, 199.00, 500),
    (5, "女士连衣裙", 6, 299.00, 300),
    (6, "有机牛奶 1L", 7, 12.90, 1000),
    (7, "进口巧克力", 7, 68.00, 200),
    (9, "蓝牙耳机", 2, 299.00, 0),
]

PRODUCTS_DATA_BAD = [
    (8, "机械键盘", 99, 399.00, 150),
]

ORDERS_DATA_GOOD = [
    (1, 1, "ORD202401001", 8999.00, 2),
    (2, 2, "ORD202401002", 7198.00, 1),
    (3, 3, "ORD202401003", 199.00, 0),
    (4, 5, "ORD202401004", 68.00, 3),
    (10, 1, "ORD202401010", 399.00, 2),
]

ORDERS_DATA_BAD = [
    (5, 6, "ORD202401005", 299.00, 1),
]

ORDER_ITEMS_DATA_GOOD = [
    (1, 1, 1, 1, 8999.00),
    (2, 2, 3, 1, 6999.00),
    (3, 2, 9, 1, 199.00),
    (4, 3, 4, 1, 199.00),
    (5, 4, 7, 1, 68.00),
    (7, 10, 8, 1, 399.00),
]

ORDER_ITEMS_DATA_BAD = [
    (6, 6, 5, 1, 299.00),
    (8, 5, 99, 2, 150.00),
]

AUDIT_LOG_DATA_GOOD = [
    (1, 1, "login", None, None, "用户登录系统"),
    (2, 2, "update_product", "products", 1, "修改了商品价格"),
    (3, None, "system_check", None, None, "系统定时巡检"),
    (5, 3, "create_order", "orders", 3, "创建新订单"),
]

AUDIT_LOG_DATA_BAD = [
    (4, 99, "delete_order", "orders", 100, "删除了订单"),
]

EXPECTED_BROKEN_LINKS = [
    {
        "table": "products",
        "column": "category_id",
        "referenced_table": "categories",
        "referenced_column": "id",
        "broken_value": 99,
        "broken_count": 1,
        "sample_pks": [8],
        "reason": "分类表清理后，这条机械键盘的分类ID没同步更新",
    },
    {
        "table": "orders",
        "column": "user_id",
        "referenced_table": "users",
        "referenced_column": "id",
        "broken_value": 6,
        "broken_count": 1,
        "sample_pks": [5],
        "reason": "用户注销后，这笔订单的 user_id 保留了旧ID",
    },
    {
        "table": "order_items",
        "column": "order_id",
        "referenced_table": "orders",
        "referenced_column": "id",
        "broken_value": 5,
        "broken_count": 1,
        "sample_pks": [6],
        "reason": "数据迁移时订单表丢了ID=6，订单项还在（注意orders里ID直接跳到10了）",
    },
    {
        "table": "order_items",
        "column": "product_id",
        "referenced_table": "products",
        "referenced_column": "id",
        "broken_value": 99,
        "broken_count": 1,
        "sample_pks": [8],
        "reason": "商品下架硬删除后，这条订单项成了孤儿",
    },
    {
        "table": "audit_log",
        "column": "user_id",
        "referenced_table": "users",
        "referenced_column": "id",
        "broken_value": 99,
        "broken_count": 1,
        "sample_pks": [4],
        "reason": "老系统导过来的日志，用户ID体系对不上",
    },
]


def _insert_values(table: str, columns: str, data: list) -> str:
    if not data:
        return ""
    placeholders = []
    for row in data:
        cells = []
        for v in row:
            if v is None:
                cells.append("NULL")
            elif isinstance(v, str):
                escaped = v.replace("'", "\\'")
                cells.append(f"'{escaped}'")
            else:
                cells.append(str(v))
        placeholders.append("  (" + ", ".join(cells) + ")")
    return f"INSERT INTO {table} ({columns}) VALUES\n" + ",\n".join(placeholders) + ";"


def get_sample_statements(schema: str = "fk_demo") -> List[tuple]:
    """
    返回按正确顺序排列的 SQL 语句列表，每条是 (描述, SQL)。
    每条都是可单独 execute 的单条语句，避免 PyMySQL 多语句问题。
    """
    stmts = []

    stmts.append(("创建数据库",
        f"CREATE DATABASE IF NOT EXISTS `{schema}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
    stmts.append(("切换到目标库", f"USE `{schema}`;"))
    stmts.append(("删表 order_items", "DROP TABLE IF EXISTS order_items;"))
    stmts.append(("删表 orders", "DROP TABLE IF EXISTS orders;"))
    stmts.append(("删表 products", "DROP TABLE IF EXISTS products;"))
    stmts.append(("删表 audit_log", "DROP TABLE IF EXISTS audit_log;"))
    stmts.append(("删表 users", "DROP TABLE IF EXISTS users;"))
    stmts.append(("删表 categories", "DROP TABLE IF EXISTS categories;"))

    stmts.append(("建表 categories（父表，无外键）", """
        CREATE TABLE categories (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            parent_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    """.strip()))

    stmts.append(("建表 users（父表，无外键）", """
        CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL,
            status TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    """.strip()))

    stmts.append(("建表 products（外键→categories）", """
        CREATE TABLE products (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(200) NOT NULL,
            category_id INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            stock INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
        ) ENGINE=InnoDB;
    """.strip()))

    stmts.append(("建表 orders（外键→users）", """
        CREATE TABLE orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            order_no VARCHAR(32) NOT NULL UNIQUE,
            total_amount DECIMAL(12,2) NOT NULL,
            status TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB;
    """.strip()))

    stmts.append(("建表 order_items（外键→orders, products）", """
        CREATE TABLE order_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) REFERENCES orders(id),
            CONSTRAINT fk_orderitems_product FOREIGN KEY (product_id) REFERENCES products(id)
        ) ENGINE=InnoDB;
    """.strip()))

    stmts.append(("建表 audit_log（外键→users）", """
        CREATE TABLE audit_log (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT DEFAULT NULL,
            action VARCHAR(50) NOT NULL,
            target_table VARCHAR(50),
            target_id INT,
            detail TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_auditlog_user FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB;
    """.strip()))

    stmts.append(("关闭外键检查（让坏数据能落库）", "SET FOREIGN_KEY_CHECKS = 0;"))

    stmts.append(("插入分类数据（7条合法）",
        _insert_values("categories", "id, name, parent_id", CATEGORIES_DATA)))
    stmts.append(("插入用户数据（6条合法）",
        _insert_values("users", "id, username, email, status", USERS_DATA)))
    stmts.append(("插入商品数据-合法（8条）",
        _insert_values("products", "id, name, category_id, price, stock", PRODUCTS_DATA_GOOD)))
    stmts.append(("插入商品数据-坏数据（1条：category_id=99）",
        _insert_values("products", "id, name, category_id, price, stock", PRODUCTS_DATA_BAD)))
    stmts.append(("插入订单数据-合法（5条）",
        _insert_values("orders", "id, user_id, order_no, total_amount, status", ORDERS_DATA_GOOD)))
    stmts.append(("插入订单数据-坏数据（1条：user_id=6）",
        _insert_values("orders", "id, user_id, order_no, total_amount, status", ORDERS_DATA_BAD)))
    stmts.append(("插入订单项-合法（6条）",
        _insert_values("order_items", "id, order_id, product_id, quantity, unit_price", ORDER_ITEMS_DATA_GOOD)))
    stmts.append(("插入订单项-坏数据1（order_id=5）",
        _insert_values("order_items", "id, order_id, product_id, quantity, unit_price", ORDER_ITEMS_DATA_BAD[:1])))
    stmts.append(("插入订单项-坏数据2（product_id=99）",
        _insert_values("order_items", "id, order_id, product_id, quantity, unit_price", ORDER_ITEMS_DATA_BAD[1:])))
    stmts.append(("插入审计日志-合法（4条）",
        _insert_values("audit_log", "id, user_id, action, target_table, target_id, detail", AUDIT_LOG_DATA_GOOD)))
    stmts.append(("插入审计日志-坏数据（1条：user_id=99）",
        _insert_values("audit_log", "id, user_id, action, target_table, target_id, detail", AUDIT_LOG_DATA_BAD)))

    stmts.append(("重新打开外键检查（断链数据保留）", "SET FOREIGN_KEY_CHECKS = 1;"))

    return stmts


def get_sample_sql(schema: str = "fk_demo") -> str:
    """兼容旧接口，返回完整 SQL 脚本字符串。"""
    parts = []
    for desc, sql in get_sample_statements(schema):
        parts.append(f"-- {desc}\n{sql}")
    return "\n\n".join(parts) + "\n"


EXPECTED_ROW_COUNTS = {
    "categories": len(CATEGORIES_DATA),
    "users": len(USERS_DATA),
    "products": len(PRODUCTS_DATA_GOOD) + len(PRODUCTS_DATA_BAD),
    "orders": len(ORDERS_DATA_GOOD) + len(ORDERS_DATA_BAD),
    "order_items": len(ORDER_ITEMS_DATA_GOOD) + len(ORDER_ITEMS_DATA_BAD),
    "audit_log": len(AUDIT_LOG_DATA_GOOD) + len(AUDIT_LOG_DATA_BAD),
}

EXPECTED_FK_COUNT = 5


SAMPLE_BROKEN_LINKS_DESC = """
样例数据中故意混入的"小麻烦"说明（真实 MySQL 下能稳定落库）：

1. products 表中 id=8 的商品（机械键盘），category_id=99 —— 分类表中没有这个分类
   场景：分类数据清理后，老商品忘记同步更新
   检测预期：products.category_id → categories(id) 断链 1 条

2. orders 表中 id=5 的订单，user_id=6 —— 用户表中没有 id=6（用户ID跳到10了）
   场景：用户注销/迁移时，历史订单没处理
   检测预期：orders.user_id → users(id) 断链 1 条

3. order_items 表中 id=6 的订单项，order_id=5 —— 订单表中没有 id=5（订单ID直接跳到10了）
   场景：数据迁移时部分订单丢失，但订单项还在
   检测预期：order_items.order_id → orders(id) 断链 1 条

4. order_items 表中 id=8 的订单项，product_id=99 —— 商品表中没有这个商品
   场景：商品下架硬删除后，历史订单项成了孤儿
   检测预期：order_items.product_id → products(id) 断链 1 条

5. audit_log 表中 id=4 的日志，user_id=99 —— 操作者是个不存在的用户
   场景：老系统导过来的数据，用户ID体系对不上
   检测预期：audit_log.user_id → users(id) 断链 1 条

合计：5 条外键断链，涉及 5 个外键约束，影响 5 行数据。
"""

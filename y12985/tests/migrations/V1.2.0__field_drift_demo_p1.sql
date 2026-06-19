-- V1.2.0 - 用户表字段类型变更 - 第1页（用于测试字段类型漂移）

-- 第一次修改：email 从 VARCHAR(100) 改为 VARCHAR(255)
ALTER TABLE users ALTER COLUMN email VARCHAR(255);

-- 第二次修改：同一文件中再次修改 email 类型，造成字段类型漂移
ALTER TABLE users ALTER COLUMN email TEXT;

-- 正常修改
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 004_add_user_profile.sql
-- 添加用户资料字段
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

CREATE INDEX idx_users_phone ON users(phone);

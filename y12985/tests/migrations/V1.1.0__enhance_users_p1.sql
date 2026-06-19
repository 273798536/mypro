-- V1.1.0 - 用户表增强 - 第1页
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN last_login_at DATETIME;

CREATE INDEX idx_users_email ON users(email);

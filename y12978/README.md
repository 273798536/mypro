# 时区字段统一审计工具

为数据平台工程师设计的时区字段审计工具，支持从空目录快速启动，可追溯到原始行号、表名、导入批次。

## 快速开始（从空目录开始）

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 初始化数据库
python init_db.py

# 3. 导入示例数据（含索引失效、重复导入、补录场景）
python seed_data.py

# 4. 启动服务
python run.py
# 服务地址: http://127.0.0.1:8000
# API文档: http://127.0.0.1:8000/docs
# 审计页面: http://127.0.0.1:8000/static/index.html
```

## 日常入口

### 备份校验（日常执行）
```bash
bash scripts/run_backup_check.sh
# 或用 curl
curl -s http://127.0.0.1:8000/api/audit/backup-check | python -m json.tool
```

### 权限审计（月底/课前执行）
```bash
bash scripts/run_permission_audit.sh
# 或用 curl
curl -s http://127.0.0.1:8000/api/audit/permission | python -m json.tool
```

## 验收：用索引失效记录倒查

```bash
# 1. 查所有索引失效记录
curl -s "http://127.0.0.1:8000/api/audit/records?status=index_invalid" | python -m json.tool

# 2. 取一条记录ID，追溯完整链路（来源表 -> 处理记录 -> 结论）
curl -s "http://127.0.0.1:8000/api/audit/trace/{record_id}" | python -m json.tool
```

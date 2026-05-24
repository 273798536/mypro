# 会议室占用异常回执状态机 API - 快速开始

## 项目结构

```
.
├── main.py                  # FastAPI 主应用
├── models.py                # 数据模型定义
├── schemas.py               # Pydantic 模式
├── database.py              # 数据库配置
├── state_machine.py         # 状态机核心逻辑
├── import_service.py        # 数据导入服务
├── export_service.py        # 导出服务
├── generate_test_data.py    # 测试数据生成
├── demo_curls.sh            # 演示脚本
├── requirements.txt         # 依赖列表
└── QUICKSTART.md            # 本文件
```

## 核心状态定义

### 记录状态 (RecordState)
- `draft` - 草稿
- `pending_review` - 待复核
- `approved` - 通过
- `rejected` - 驳回
- `frozen` - 已冻结
- `settled` - 已结算
- `recalled` - 已撤回
- `archived` - 已归档

### 批次状态 (BatchState)
- `created` - 已创建
- `importing` - 导入中
- `partial_failed` - 部分失败
- `pending_review` - 待复核
- `frozen` - 已冻结
- `settled` - 已结算
- `recalled` - 已撤回
- `archived` - 已归档

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 生成测试数据

```bash
python3 generate_test_data.py
```

### 3. 启动服务

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/api/health

### 4. 运行演示脚本

```bash
chmod +x demo_curls.sh
./demo_curls.sh
```

## 核心 API 接口

### 批次管理
- `POST /api/batches` - 创建批次
- `GET /api/batches` - 批次列表
- `GET /api/batches/{id}` - 批次详情

### 数据导入
- `POST /api/batches/{id}/import` - 导入数据文件
  - 支持: calendar (预约日历), access_card (门禁刷卡), cancel_message (取消消息)

### 记录管理
- `GET /api/batches/{id}/records` - 记录列表
- `GET /api/batches/{id}/records-by-appointment` - 按预约ID分组的多源关联视图
- `GET /api/records/{id}` - 记录详情(含原始证据)
- `PATCH /api/records/{id}` - 更新记录

### 复核管理
- `POST /api/records/submit-review` - 提交审核 (draft -> pending_review)
- `POST /api/records/review` - 批量复核 (pending_review -> approved/rejected)
- `POST /api/records/{id}/override` - 人工改判(强制状态转换)

### 附件管理
- `POST /api/records/{id}/attachments` - 上传附件

### 批次状态流转
- `POST /api/batches/{id}/freeze` - 冻结
- `POST /api/batches/{id}/unfreeze` - 解冻
- `POST /api/batches/{id}/settle` - 结算
- `POST /api/batches/{id}/recall` - 撤回
- `POST /api/batches/{id}/archive` - 归档

### 导出管理
- `GET /api/batches/{id}/export/summary` - 导出摘要(JSON)
- `GET /api/batches/{id}/export/excel` - 导出Excel报告

### 统计分析
- `GET /api/stats/overview` - 总体统计

## 边界情况处理

1. **重复提交**: 通过文件哈希检测重复文件
2. **多源数据连续导入**: pending_review/partial_failed 状态下可继续导入其他来源数据
3. **撤回后再提交**: 支持 recalled -> created 状态转换
4. **部分失败**: 批次状态为 partial_failed，可继续导入或处理失败记录
5. **人工改判**: 支持强制状态转换，标记 manual_override 并记录改判人、改判原因
6. **导出前冻结**: 导出接口要求批次必须处于 frozen 状态，防止数据不一致

## 审计特性

- 所有状态变更都记录: 时间、操作人、原因
- 原始证据保留: 来源文件、原始行号、原始值、解析后值
- 人工改判有特殊标记，可追溯

## 导出报告内容

Excel 报告包含4个Sheet:
1. **汇总** - 冻结前后状态对比、人工改判数、费用统计
2. **异常明细** - 所有记录详情
3. **状态变更日志** - 完整的状态流转历史
4. **原始证据** - 每个字段的原始来源

## 示例 curl 命令

```bash
# 创建批次
curl -X POST http://localhost:8000/api/batches \
  -H "Content-Type: application/json" \
  -d '{"name":"测试批次","description":"测试","created_by":"测试员"}'

# 导入数据
curl -X POST http://localhost:8000/api/batches/{BATCH_ID}/import \
  -F "file=@test_calendar.xlsx" \
  -F "source_type=calendar" \
  -F "uploaded_by=测试员"

# 冻结
curl -X POST http://localhost:8000/api/batches/{BATCH_ID}/freeze \
  -H "Content-Type: application/json" \
  -d '{"reason":"准备导出","operator":"管理员"}'

# 导出
curl -o report.xlsx "http://localhost:8000/api/batches/{BATCH_ID}/export/excel?exported_by=管理员"
```

# 会议室占用验收回放链路服务 - 使用手册

## 一、快速启动

### 命令行启动
```bash
# 方式1: 一键启动
./start.sh

# 方式2: 手动启动
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

服务启动后访问: http://localhost:8000/docs

### 一键演示
```bash
chmod +x run_demo.sh
./run_demo.sh
```

---

## 二、核心概念

### 数据链路
```
预约日历 → 门禁刷卡 → 临时取消 → 供应商账单 → 对账审计
    ↓          ↓          ↓           ↓
    └──────────┴──────────┴───────────┘
               ↓
         关联匹配引擎
               ↓
         异常检测规则
               ↓
         处理记录追踪
               ↓
         导出统一报表
```

### 异常类型定义
| 异常类型 | 触发条件 | 业务含义 |
|---------|---------|---------|
| `cancel_with_bill` | 有取消消息 + 有供应商账单 | 会议取消但茶歇/设备仍被准备 |
| `no_access_with_bill` | 无门禁记录 + 有供应商账单 | 无人到场但产生费用 |
| `cancelled_with_cost` | 预约状态=cancelled + 有账单 | 系统标记取消但实际有成本 |
| `cancel_message_mismatch` | 有取消消息 + 预约状态≠cancelled | 消息与状态不同步 |

### 脏记录分类
| 类型 | 说明 | 处理建议 |
|-----|------|---------|
| `missing_field` | 缺少关键字段 | 补充数据后重新导入 |
| `cross_day_booking` | 预约跨越多天 | 验证是否为隔夜会议 |
| `room_name_change` | 同一source_id但会议室不同 | 确认会议室变更原因 |
| `amount_conflict` | 金额或数量不一致 | 与供应商对账确认 |

---

## 三、API 操作详解

### 1. 数据导入

**接口**: `POST /api/import`

**请求体结构**:
```json
{
  "bookings": [...],
  "access_records": [...],
  "cancel_messages": [...],
  "supplier_bills": [...],
  "duplicate_handling": "skip",
  "batch_id": "可选自定义批次号"
}
```

**重复处理策略**:
- `skip` (默认): 重复记录跳过，统计到duplicate_count
- `overwrite`: 覆盖原有记录，写入审计日志

**成功响应**:
```json
{
  "batch_id": "batch_20240520_143022_abc123",
  "total_records": 12,
  "success_count": 12,
  "duplicate_count": 0,
  "error_count": 0,
  "duplicate_handling": "skip",
  "details": {
    "bookings": {"total": 4, "success": 4, ...},
    "access": {"total": 3, "success": 3, ...},
    "cancel": {"total": 1, "success": 1, ...},
    "bills": {"total": 4, "success": 4, ...}
  }
}
```

### 2. 对账查询

**接口**: `GET /api/reconciliation`

**查询参数**:
- `start_date`: 开始日期 (ISO格式)
- `end_date`: 结束日期
- `room_name`: 会议室名称筛选
- `exceptions_only`: 仅显示异常 (true/false)

**异常记录示例**:
```json
{
  "booking_id": 4,
  "room_name": "3楼第一会议室",
  "meeting_topic": "月度预算会议",
  "start_time": "2024-05-22T10:00:00",
  "booking_status": "cancelled",
  "has_access_record": false,
  "has_cancel_message": true,
  "has_supplier_bill": true,
  "tea_break_cost": 210.0,
  "equipment_cost": 0.0,
  "total_cost": 210.0,
  "is_exception": true,
  "exception_type": "cancel_with_bill",
  "exception_description": "会议已取消但产生了供应商费用"
}
```

### 3. 详情追溯

**接口**: `GET /api/bookings/{booking_id}`

返回该预约的完整链路:
- 预约基本信息
- 关联的门禁刷卡记录
- 关联的取消消息
- 关联的供应商账单
- 所有处理记录（含脏记录）

### 4. 报表导出

**接口**: `GET /api/export/reconciliation?format=xlsx`

**支持格式**: `xlsx` 或 `csv`

**导出字段** (中英文对照):
| 中文列名 | 英文说明 |
|---------|---------|
| 预约ID | booking_id |
| 会议室 | room_name |
| 会议主题 | meeting_topic |
| 开始时间 | start_time |
| 预约状态 | booking_status |
| 有门禁记录 | has_access_record |
| 有取消消息 | has_cancel_message |
| 有供应商账单 | has_supplier_bill |
| 茶歇费用 | tea_break_cost |
| 设备费用 | equipment_cost |
| 总费用 | total_cost |
| 是否异常 | is_exception |
| 异常类型 | exception_type |
| 异常描述 | exception_description |

---

## 四、失败路径与修正方式

### 场景1: 重复导入
**现象**: 同一批数据第二次导入，success_count=0, duplicate_count=N
**原因**: source_id已存在
**修正方式**:
```bash
# 方式A: 强制覆盖
POST /api/import
{
  ...
  "duplicate_handling": "overwrite"
}

# 方式B: 修改source_id后重新导入
```
**报表变化**: 覆盖模式下，审计日志会记录新旧值对比

### 场景2: 跨日预约标记为脏记录
**现象**: process_records中出现is_dirty=true的记录
**错误类型**: `cross_day_booking`
**修正步骤**:
1. 查询脏记录: `GET /api/process-records?is_dirty=true`
2. 验证是否为真实隔夜会议
3. 人工标记已解决:
```bash
PATCH /api/process-records/{process_id}/resolve
{
  "corrected_value": {"is_valid_cross_day": true},
  "reason": "确认是跨天培训会议"
}
```

### 场景3: 金额冲突
**现象**: 导入账单时提示amount_conflict
**原因**: 同一source_id对应账单金额不一致
**排查路径**:
1. 查看导入历史: `GET /api/import-history`
2. 查看审计日志: `GET /api/audit-logs`
3. 对比原始数据的raw_data字段
**处理方式**: 与供应商确认正确金额后，使用overwrite模式重新导入

### 场景4: 关联匹配失败
**现象**: 账单/门禁/取消消息未关联到预约
**原因**: 会议室名称不一致或时间窗口不匹配
**手动关联**: 暂无API，需直接修改数据库booking_id字段

---

## 五、样例材料说明

### sample_data.json 包含的测试场景

| 预约ID | 会议室 | 主题 | 门禁 | 取消 | 账单 | 预期结果 |
|-------|-------|------|------|------|------|---------|
| BK20240520001 | 3楼第一会议室 | Q2产品发布会 | ✓ | ✗ | ✓(茶歇+设备) | 正常会议 |
| BK20240520002 | 3楼第一会议室 | 系统架构评审 | ✓ | ✗ | ✓(设备) | 正常会议 |
| BK20240521001 | 2楼多功能厅 | 新员工培训 | ✓ | ✗ | ✓(茶歇) | 正常会议 |
| BK20240522001 | 3楼第一会议室 | 月度预算会议 | ✗ | ✓ | ✓(茶歇) | **异常** - 取消但产生费用 |

### 预期对账结果
- 总预约数: 4
- 异常数: 1 (BK20240522001)
- 异常类型: cancel_with_bill
- 涉及金额: 210元（茶歇）
- 自动关联: 对账时会动态重新关联所有未匹配记录

### 动态关联机制
系统在对账时会自动执行以下操作：
1. 扫描所有未关联的门禁/取消/账单记录
2. 按会议室+时间窗口进行智能匹配
3. 优先匹配时间最接近的预约
4. 更新数据库关联关系
5. 基于最新关联结果计算对账

可通过 `POST /api/relink-all` 手动触发全量重关联。

---

## 六、持久化说明

### 数据库文件
- 位置: `./meeting_room_audit.db` (SQLite)
- 重启后数据保留

### 核心表结构
1. **booking_records**: 预约主表
2. **access_records**: 门禁刷卡记录
3. **cancel_messages**: 取消消息
4. **supplier_bills**: 供应商账单
5. **process_records**: 处理记录（含脏记录）
6. **audit_logs**: 变更审计日志
7. **import_history**: 导入批次历史

### 导出文件
- 位置: `./exports/` 目录
- 命名规则: `reconciliation_YYYYMMDD_HHMMSS.xlsx`
- 每次导出生成新文件，不覆盖

---

## 七、行政经理关注点

### 命令行操作
```bash
# 启动服务
./start.sh

# 导入数据
curl -X POST http://localhost:8000/api/import \
  -H "Content-Type: application/json" \
  -d @sample_data.json

# 查看异常
curl "http://localhost:8000/api/reconciliation?exceptions_only=true"

# 导出报表
curl -O "http://localhost:8000/api/export/reconciliation?format=xlsx"

# 查看导入历史
curl http://localhost:8000/api/import-history
```

### HTTP 读写清单
| 操作 | 方法 | 端点 |
|-----|------|------|
| 导入数据 | POST | /api/import |
| 查询预约 | GET | /api/bookings |
| 预约详情 | GET | /api/bookings/{id} |
| 对账结果 | GET | /api/reconciliation |
| 导出报表 | GET | /api/export/reconciliation |
| 处理记录 | GET | /api/process-records |
| 解决脏记录 | PATCH | /api/process-records/{id}/resolve |
| **重新关联汇总** | **POST** | **/api/relink-all** |
| 导入历史 | GET | /api/import-history |
| 审计日志 | GET | /api/audit-logs |

### 数据一致性保证
1. **单一事实来源**: 所有接口从同一数据库查询
2. **审计追踪**: 所有更新操作写入audit_logs表
3. **幂等导入**: skip模式下重复导入不改变数据
4. **原始数据保留**: raw_data字段保存导入时的原始JSON

---

## 八、常见问题

**Q: 重启服务后数据还在吗？**
A: 在，所有数据持久化到SQLite数据库文件。

**Q: 同一批数据导入两次会怎样？**
A: 默认skip模式下，第二次导入success=0，duplicate=N，汇总数字不变；overwrite模式会更新并记录审计日志。

**Q: 导出文件和详情接口数据不一致？**
A: 两者使用相同的ReconciliationService逻辑，如发现不一致请提交bug。

**Q: 如何添加审批邮件字段？**
A: 在models.py的CancelMessage或BookingRecord中添加新字段，在services.py中更新关联逻辑。

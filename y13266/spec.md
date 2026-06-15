# 社区充电容量复核 - 需求规格说明书

## 1. 需求概述

### 1.1 背景与目标

规划师小赵本次提出的"社区充电容量复核"，**目标不是替换现有系统**，而是针对巡检照片采集过程中出现的「早晚高峰统计口径不一致」问题，对原始记录进行梳理、归并与复核。

核心目标：
- 捋顺巡检照片中导致早晚高峰口径不一致的记录
- 复核过程可追溯（异常可回溯到原始巡检照片和本次计算口径）
- 复核结果按三类状态区分，便于项目经理决策

### 1.2 关键约束（不可突破）

| 编号 | 约束内容 | 违反后果 |
|------|----------|----------|
| C-1 | 旧方案覆盖新意见时，**宁可挂起等待项目经理确认，也不得输出假稳定结论** | 输出错误的稳定结论会误导后续规划决策 |
| C-2 | 同一地点存在多种写法时，**必须保留归并证据链**，禁止无依据合并相邻点位 | 相邻点位错误合并会导致容量统计失真 |
| C-3 | 复核材料必须包含：巡检照片、晚到附件、后补说明——即使数量少也要真实呈现 | 材料缺失会削弱复核结论的可信度 |
| C-4 | 给项目经理的接口返回**必须明确区分**三类状态：已处理 / 待补材料 / 人工改判 | 状态混淆会导致项目经理无法快速决策 |

---

## 2. 功能范围

### 2.1 包含功能（In Scope）

1. **启动复核任务**：按批次导入巡检记录，触发容量复核流程
2. **重跑复核任务**：对已挂起或已处理的任务，补充材料后重新计算
3. **查看复核结果**：按三类状态返回结果列表，支持点击异常回溯到原始材料
4. **点位归并**：同一地点多种写法的识别与归并，保留归并证据
5. **口径标注**：每条复核结果标注本次所采用的计算口径（早高峰/晚高峰/统一口径）

### 2.2 不包含功能（Out of Scope）

- 替换现有巡检采集系统
- 重新设计底层充电容量数据库
- 前端大屏图表的独立开发（仅要求图表异常可回溯到照片和口径）

---

## 3. 数据模型设计

### 3.1 核心实体关系

```
InspectionRecord (巡检记录)
    ├── id, community_name, point_address, photo_urls
    ├── morning_peak_data, evening_peak_data
    ├── collected_at, collector_name
    │
    ├─── Attachment (附件)
    │      ├── id, record_id, type (photo|late_attachment|supplement)
    │      ├── file_url, uploaded_at, remark
    │
    ├─── PointAlias (点位别名/同地点多写法)
    │      ├── id, canonical_name, alias_name, evidence
    │
    └─── ReviewResult (复核结果)
           ├── id, record_id, task_id
           ├── status (processed|pending_material|manual_judgment)
           ├── final_capacity, caliber_used (morning|evening|unified)
           ├── conflict_detail, merge_evidence
           └── reviewed_by, reviewed_at
```

### 3.2 字段详细说明

#### 3.2.1 InspectionRecord（巡检记录）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | UUID | 是 | 主键 |
| community_name | string | 是 | 社区名称 |
| point_address | string | 是 | 点位地址（原始写法，可能不规范） |
| photo_urls | string[] | 是 | 巡检照片URL列表，至少1张 |
| morning_peak_data | object | 否 | 早高峰采集数据 {capacity, occupied, timestamp} |
| evening_peak_data | object | 否 | 晚高峰采集数据 {capacity, occupied, timestamp} |
| collected_at | datetime | 是 | 采集时间 |
| collector_name | string | 是 | 采集人 |

#### 3.2.2 Attachment（附件）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | UUID | 是 | 主键 |
| record_id | UUID | 是 | 关联巡检记录 |
| type | enum | 是 | `photo`(巡检照片) / `late_attachment`(晚到附件) / `supplement`(后补说明) |
| file_url | string | 是 | 附件文件URL |
| uploaded_at | datetime | 是 | 上传时间 |
| remark | string | 否 | 备注说明 |

#### 3.2.3 PointAlias（点位别名映射）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | UUID | 是 | 主键 |
| canonical_name | string | 是 | 规范后的标准点位名称 |
| alias_name | string | 是 | 原始写法（别名） |
| evidence | string | 是 | 归并依据（如照片门牌号、地图坐标、人工确认记录） |
| merged_by | string | 否 | 归并操作人（系统自动归并时为 system） |

#### 3.2.4 ReviewResult（复核结果）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | UUID | 是 | 主键 |
| task_id | UUID | 是 | 所属复核任务ID |
| record_id | UUID | 是 | 关联巡检记录 |
| status | enum | 是 | `processed`(已处理) / `pending_material`(待补材料) / `manual_judgment`(人工改判) |
| final_capacity | number | 否 | 最终确认容量（status=processed 时有值） |
| caliber_used | enum | 否 | 采用口径 `morning` / `evening` / `unified` |
| conflict_detail | string | 否 | 冲突详情（早晚高峰不一致、新旧方案冲突等） |
| merge_evidence | string | 否 | 点位归并证据链 |
| reviewed_by | string | 否 | 复核人 |
| reviewed_at | datetime | 否 | 复核时间 |

---

## 4. 核心接口设计

### 4.1 接口总览

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 启动复核 | POST | `/api/review/tasks` | 创建并启动一个复核任务 |
| 重跑复核 | POST | `/api/review/tasks/{task_id}/rerun` | 补充材料后重新执行复核 |
| 查看结果 | GET | `/api/review/tasks/{task_id}/results` | 按三类状态分页返回复核结果 |

### 4.2 启动复核任务

**请求**：
```json
POST /api/review/tasks
{
  "task_name": "2026年Q2朝阳区社区充电容量复核",
  "record_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "operator": "小赵"
}
```

**响应**（201 Created）：
```json
{
  "task_id": "task-uuid-001",
  "task_name": "2026年Q2朝阳区社区充电容量复核",
  "status": "running",
  "total_records": 3,
  "created_at": "2026-06-16T10:30:00Z"
}
```

### 4.3 重跑复核任务

**请求**：
```json
POST /api/review/tasks/task-uuid-001/rerun
{
  "supplementary_record_ids": ["uuid-4"],
  "operator": "小赵",
  "remark": "补充了3号楼晚到附件"
}
```

**响应**（200 OK）：
```json
{
  "task_id": "task-uuid-001",
  "status": "running",
  "rerun_count": 1,
  "last_rerun_at": "2026-06-16T14:20:00Z"
}
```

### 4.4 查看复核结果

**请求**：
```
GET /api/review/tasks/task-uuid-001/results?status=processed&page=1&page_size=20
```

**响应**（200 OK）——重点：**三类状态明确区分**：
```json
{
  "task_id": "task-uuid-001",
  "task_name": "2026年Q2朝阳区社区充电容量复核",
  "summary": {
    "total": 120,
    "processed": 85,
    "pending_material": 22,
    "manual_judgment": 13
  },
  "filter_status": "processed",
  "items": [
    {
      "result_id": "result-uuid-001",
      "record_id": "uuid-1",
      "community_name": "阳光家园",
      "point_address": "3号楼南侧充电桩",
      "status": "processed",
      "final_capacity": 12,
      "caliber_used": "evening",
      "caliber_explanation": "采用晚高峰口径，因早高峰数据缺失充电桩编号照片",
      "materials": {
        "photos": ["https://cdn.example.com/photo1.jpg", "https://cdn.example.com/photo2.jpg"],
        "late_attachments": ["https://cdn.example.com/late1.pdf"],
        "supplements": ["https://cdn.example.com/supplement1.docx"]
      },
      "merge_info": {
        "canonical_name": "阳光家园3号楼南侧",
        "aliases_merged": ["阳光家园3#南", "阳光家园三号楼南侧"],
        "evidence": "照片门牌号一致，坐标偏差<5米"
      },
      "reviewed_at": "2026-06-16T11:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

**`manual_judgment` 状态示例**（新旧方案冲突，挂起待确认）：
```json
{
  "result_id": "result-uuid-088",
  "record_id": "uuid-88",
  "community_name": "幸福里小区",
  "point_address": "北门充电站",
  "status": "manual_judgment",
  "conflict_detail": "旧方案（2025版）标注容量8桩，本次巡检照片显示已扩容至16桩，新旧方案冲突，需项目经理确认是否按新数据更新",
  "materials": {
    "photos": ["https://cdn.example.com/photo88a.jpg", "https://cdn.example.com/photo88b.jpg"],
    "late_attachments": [],
    "supplements": ["https://cdn.example.com/supp88.pdf"]
  },
  "need_confirmation_from": "项目经理",
  "submitted_at": "2026-06-16T11:30:00Z"
}
```

**`pending_material` 状态示例**（材料不足）：
```json
{
  "result_id": "result-uuid-099",
  "record_id": "uuid-99",
  "community_name": "绿洲花园",
  "point_address": "地下车库B2",
  "status": "pending_material",
  "pending_reason": "缺少晚高峰时段照片，无法判断口径一致性；后补说明未收到",
  "required_materials": ["晚高峰巡检照片", "点位归属说明"],
  "materials": {
    "photos": ["https://cdn.example.com/photo99.jpg"],
    "late_attachments": [],
    "supplements": []
  }
}
```

---

## 5. 归并逻辑与冲突处理规则

### 5.1 早晚高峰口径不一致处理

| 场景 | 判定条件 | 处理方式 | 结果状态 |
|------|----------|----------|----------|
| 数据完整一致 | 早晚高峰容量差 ≤ 10% 且均有照片佐证 | 取平均值，标注 `unified` | processed |
| 一方缺数据 | 仅早高峰或仅晚高峰有完整数据+照片 | 采用有数据一方，标注对应口径 | processed |
| 数据差异大但可解释 | 容量差 > 10%，但后补说明能合理解释（如临时施工占用） | 采用说明中认可的口径，附证据链 | processed |
| 数据差异大且无解释 | 容量差 > 10%，无后补说明或说明不充分 | 挂起，标注需人工改判 | manual_judgment |

### 5.2 同一地点多写法归并

**归并触发条件**（满足任一即可）：
1. 地址文本相似度 ≥ 90%（如"3号楼"vs"3#楼"）
2. 照片中出现相同门牌号
3. GPS坐标偏差 < 5米

**归并约束**（C-2）：
- **禁止**仅因地址相似就合并不满足坐标/照片条件的相邻点位
- 每次归并必须记录 `evidence` 字段，说明归并依据
- 归并后的 `canonical_name` 从所有别名中选择最规范的写法

### 5.3 新旧方案冲突处理（C-1）

| 场景 | 处理方式 | 结果状态 |
|------|----------|----------|
| 本次巡检数据与历史方案一致 | 正常输出 | processed |
| 本次巡检数据与历史方案不一致，但有官方扩容通知作为附件 | 以本次为准，附扩容通知链接 | processed |
| 本次巡检数据与历史方案不一致，无充分证据支持变更 | **挂起不做判断**，明确标注"需项目经理确认"，返回冲突详情 | manual_judgment |

> **关键原则**：宁可挂起，也不输出假稳定结论。

---

## 6. 材料完整性要求（C-3）

每条复核结果返回时，`materials` 节点必须包含三类数组：

| 材料类型 | 最低要求 | 说明 |
|----------|----------|------|
| photos（巡检照片） | ≥ 1 张 | 点位全景、容量可见的照片 |
| late_attachments（晚到附件） | 允许为空 | 采集后补交的表格、邮件截图等 |
| supplements（后补说明） | 允许为空 | 针对异常情况的文字说明文件 |

即使某类材料为空数组，字段也必须在响应中出现，体现"量少也要像真活"的真实感。

---

## 7. 非功能需求

| 维度 | 要求 |
|------|------|
| 性能 | 单批次 500 条记录复核 ≤ 30 秒 |
| 可追溯 | 每条结果均可回溯到原始照片、附件和采用口径 |
| 幂等性 | 重跑同一任务（无新材料时）结果应一致 |
| 技术栈 | Python + FastAPI，数据存储 PostgreSQL |

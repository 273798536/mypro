# 医疗器械巡检权限追责台账 API

## 系统概述

本系统用于管理医疗器械巡检、校准证书、维修报价和临时补录单的全流程，支持完整的审批工作流、审计轨迹、角色权限管理和数据脱敏导出。

## 核心功能

### 1. 四类记录管理
- **巡检记录**: 设备巡检结果、问题记录、下次巡检日期
- **校准证书**: 证书有效期管理、自动过期预警、校准机构信息
- **维修报价**: 故障描述、维修厂商、报价金额、保修期限
- **临时补录单**: 补录原因、原记录关联、补录备注

### 2. 完整工作流
```
草稿 → 提交 → 驳回 → 重提 → 二次确认 → 冻结 → 导出
         ↓
       撤回 → 修改 → 重提
```

### 3. 边界情况处理
- ✅ **重复提交拦截**: 记录编号唯一校验
- ✅ **撤回后再提交**: 支持修改后重新提交
- ✅ **部分失败处理**: 批量导入时记录失败详情
- ✅ **人工改判**: 保留原始证据，记录改判原因
- ✅ **导出前冻结**: 防止导出后数据被篡改
- ✅ **异常不吞没**: 所有错误明确返回

### 4. 审计与安全
- **完整审计轨迹**: 所有操作留痕，包含变更前后值、操作人、时间、原因
- **角色权限控制**: 5种角色视图，不同权限范围
- **敏感数据脱敏**: 护士/护士长视图自动脱敏设备序列号等敏感字段
- **数据不可覆盖**: 原始导入数据与解析值分开存储，改判不覆盖原始证据

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 初始化数据库
```bash
python init_db.py
```

### 3. 启动服务
```bash
python run.py
```

### 4. 运行测试
```bash
python test_demo.py
```

## API 接口列表

### 巡检记录 `/api/inspection`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建巡检记录 |
| GET | `/` | 查询列表（支持分页筛选） |
| GET | `/{id}` | 查询单条详情 |
| PUT | `/{id}` | 更新记录（草稿状态） |
| POST | `/{id}/submit` | 提交审核 |
| POST | `/{id}/reject` | 驳回（需reason） |
| POST | `/{id}/confirm` | 二次确认通过 |
| POST | `/{id}/withdraw` | 撤回记录 |
| POST | `/{id}/manual-edit` | 人工改判（需judgment_note） |
| POST | `/{id}/freeze` | 冻结记录 |
| POST | `/{id}/unfreeze` | 解冻记录 |

### 校准证书 `/api/calibration`
同巡检记录接口，额外支持：
- `GET /expired` - 查询已过期证书
- `GET /?expiring_soon=true` - 查询即将过期证书

### 维修报价 `/api/repair`
同巡检记录接口

### 临时补录单 `/api/supplementary`
同巡检记录接口

### 批量导入 `/api/import`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 上传Excel/CSV文件批量导入 |
| GET | `/sources` | 查询导入历史 |
| GET | `/sources/{id}` | 查询导入详情 |

**导入参数**:
- `file`: 上传文件 (xlsx/xls/csv)
- `record_type`: 记录类型 (inspection/calibration/repair/supplementary)

### 导出功能 `/api/export`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/records` | 导出指定类型记录 |
| POST | `/summary` | 导出汇总报告 |
| GET | `/download/{filename}` | 下载导出文件 |
| GET | `/logs` | 查询导出历史 |

### 审计轨迹 `/api/audit`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 查询审计日志列表 |
| GET | `/{id}` | 查询单条审计详情 |
| GET | `/record/{type}/{id}` | 查询单条记录的操作历史 |
| GET | `/statistics` | 审计统计 |

### 用户与角色 `/api/user`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/role-view` | 获取当前角色权限视图 |
| POST | `/` | 创建用户 |
| GET | `/` | 用户列表 |
| GET | `/{id}` | 用户详情 |
| PUT | `/{id}` | 更新用户 |

**角色说明**:
- `admin` - 系统管理员：全部权限，查看完整数据
- `auditor` - 审计员：查看所有记录，查看完整审计
- `department_head` - 科室护士长：本科室数据，部分脱敏
- `nurse` - 护士：有限权限，高度脱敏
- `technician` - 技术员：创建校准/维修记录

## 请求头设置

通过HTTP头模拟当前用户：
```
X-User-ID: 1
X-User-Role: admin
X-User-Name: 系统管理员
```

## 数据结构说明

### 原始证据保留
每条导入记录包含：
- `original_data`: 原始导入行的完整数据（JSON）
- `parsed_data`: 解析后的标准字段值（JSON）
- `original_row_number`: Excel原始行号
- `import_source_id`: 关联导入文件

人工改判时：
- 设置 `is_manually_edited = true`
- 填写 `manual_judgment_note` 说明原因
- **不覆盖** `original_data` 原始证据

### 状态流转图
```
DRAFT(草稿)
    ↓ submit
SUBMITTED(已提交)
    ├→ reject → REJECTED(已驳回) → submit → SUBMITTED
    ├→ confirm → CONFIRMED(已确认) → freeze → FROZEN(已冻结)
    └→ withdraw → WITHDRAWN(已撤回) → submit → SUBMITTED
```

## 测试场景覆盖

运行 `python test_demo.py` 可验证以下场景：

1. ✅ 系统健康检查
2. ✅ 创建巡检记录
3. ✅ 重复提交拦截（409冲突）
4. ✅ 完整工作流（草稿→提交→驳回→重提→确认）
5. ✅ 撤回后再提交
6. ✅ 人工改判（保留痕迹）
7. ✅ 导出前冻结（冻结后修改被拦截）
8. ✅ 审计轨迹查看
9. ✅ 角色视图和脱敏
10. ✅ 证书过期状态联动
11. ✅ 数据持久化验证

## 目录结构
```
.
├── app/
│   ├── __init__.py          # Flask应用工厂
│   ├── models.py            # 数据库模型
│   ├── routes/              # API路由
│   │   ├── inspection.py
│   │   ├── calibration.py
│   │   ├── repair.py
│   │   ├── supplementary.py
│   │   ├── import_routes.py
│   │   ├── export_routes.py
│   │   ├── audit.py
│   │   └── user.py
│   └── utils/               # 工具函数
│       ├── audit.py         # 审计工具
│       ├── validators.py    # 验证和脱敏
│       ├── import_utils.py  # 导入解析
│       └── export_utils.py  # 导出生成
├── config.py                # 配置文件
├── init_db.py               # 数据库初始化
├── run.py                   # 应用入口
├── test_demo.py             # 功能测试脚本
└── requirements.txt         # 依赖列表
```

## 重点关注（护士长视图）

1. **角色视图清晰**: 明确知道自己能看什么、能做什么
2. **变更原因可见**: 每次状态变更都有原因说明
3. **敏感字段脱敏**: 设备序列号自动脱敏，保护隐私
4. **来源可追溯**: 每条记录都能查到导入来源、原始行号
5. **状态联动预警**: 证书即将过期/已过期自动标记

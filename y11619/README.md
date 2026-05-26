# 会员积分负债预测 API

电商大促前积分负债预测系统，支持积分过期、退货返积分、兑换券核销的全链路预测和管理。

## 功能特性

### 核心预测能力
- **积分账本管理**: 会员积分余额、流水、冻结、过期全生命周期管理
- **过期试算**: 按时间范围预测积分过期量，自动识别跨月过期风险
- **退货返积分**: 处理订单退款的积分返还，跨月退款自动标记
- **券核销联动**: 积分兑换、核销、失败回滚全流程，自动计算兑换券成本
- **预测曲线**: 按月/周/日生成负债预测趋势曲线
- **导出报告**: 支持Excel/CSV格式导出完整预测报告

### 异常场景处理
| 场景 | 处理方式 | 提示级别 |
|------|----------|----------|
| 退货返积分跨月 | 自动标记，单独列示 | ⚠️ Warning |
| 积分过期跨月 | 计算但不纳入本期正常负债，明确提示 | ⚠️ Warning |
| 券核销失败 | 自动回滚积分，记录失败原因，生成异常记录 | ❌ Error |
| 数据导入错误 | 保留原始行号，逐行记录错误详情 | ❌ Error |

### 修正追踪
- 所有数据修正保留完整痕迹：原值、新值、修正原因、操作人、来源参考
- 修正后自动重新计算预测结果和曲线
- 修正历史永久保存，可追溯

## 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### 启动服务
```bash
python run.py
```

服务启动后访问：
- 健康检查: http://localhost:5000/health
- API文档: http://localhost:5000/api/help

### 运行测试
```bash
python test_api.py
```

## API 接口

### 预测管理

#### 创建预测
```http
POST /api/forecast
Content-Type: application/json

{
    "forecast_name": "618大促积分负债预测",
    "start_date": "2024-06-01",
    "end_date": "2024-08-31",
    "forecast_period": "monthly",
    "points_per_yuan": 0.01,
    "created_by": "运营-小明",
    "remark": "618大促前负债预估"
}
```

#### 获取预测列表
```http
GET /api/forecast?page=1&per_page=20
```

#### 获取预测详情
```http
GET /api/forecast/{id}
```

#### 推进预测状态
```http
PUT /api/forecast/{id}/status
Content-Type: application/json

{
    "status": "reviewing",
    "updated_by": "财务-小红"
}
```

状态流转: `draft` → `reviewing` → `approved` / `rejected` → `published` → `archived`

#### 修正预测数据
```http
POST /api/forecast/{id}/correct
Content-Type: application/json

{
    "field_name": "expected_expired_points",
    "old_value": 10000,
    "new_value": 15000,
    "correction_reason": "根据历史数据调整过期预估",
    "corrected_by": "财务-小红",
    "source_reference": "历史数据报表第15行"
}
```

可修正字段: `expected_expired_points`, `expected_refund_points`, `expected_redemption_points`, `expected_coupon_cost`, `points_per_yuan`, `remark`

#### 导出预测报告
```http
GET /api/forecast/{id}/export?format=xlsx
```
format: `xlsx`(默认) 或 `csv`

### 积分账本

#### 查询积分账本
```http
GET /api/points/ledger?page=1&per_page=20&member_id=M001
```

#### 查询会员积分明细
```http
GET /api/points/ledger/{member_id}
```

#### 积分过期试算
```http
GET /api/points/expiry/simulate?start_date=2024-06-01&end_date=2024-08-31
```

### 退货管理

#### 获取待处理退款列表
```http
GET /api/refunds/pending
```

#### 处理退款返积分
```http
POST /api/refunds/{id}/process
```

### 兑换券管理

#### 获取兑换券列表
```http
GET /api/coupons
```

#### 积分兑换券
```http
POST /api/coupons/redeem
Content-Type: application/json

{
    "coupon_code": "COUPON001",
    "member_id": "M001"
}
```

#### 获取待核销列表
```http
GET /api/coupons/pending-verify
```

#### 核销兑换券
```http
POST /api/coupons/verify/{id}
Content-Type: application/json

{
    "success": true
}
```

核销失败:
```json
{
    "success": false,
    "fail_reason": "库存不足"
}
```

### 活动计划

#### 获取活动列表
```http
GET /api/activities
```

#### 创建活动计划
```http
POST /api/activities
Content-Type: application/json

{
    "activity_name": "618年中大促",
    "activity_type": "promotion",
    "start_date": "2024-06-18",
    "end_date": "2024-06-20",
    "expected_points_issued": 50000,
    "expected_redemption_rate": 0.4,
    "expected_coupon_cost": 5000
}
```

### 数据导入

#### 批量导入数据
```http
POST /api/data/import
Content-Type: application/json

{
    "source_name": "会员积分导出",
    "source_type": "csv_import",
    "file_name": "points_202405.csv",
    "records": [
        {
            "type": "points_ledger",
            "member_id": "M001",
            "member_name": "张三",
            "available_points": 5800
        }
    ]
}
```

支持的记录类型: `points_ledger`, `transaction`, `refund`, `coupon`

## 数据模型

### 核心数据表
| 表名 | 说明 |
|------|------|
| `points_ledger` | 会员积分账本 |
| `point_transactions` | 积分流水记录 |
| `order_refunds` | 订单退款记录 |
| `coupons` | 兑换券配置 |
| `coupon_redemptions` | 兑换记录 |
| `activity_plans` | 活动计划 |
| `liability_forecasts` | 负债预测主表 |
| `forecast_warnings` | 预测风险提示 |
| `forecast_corrections` | 预测修正记录 |
| `forecast_curves` | 预测曲线数据 |
| `data_sources` | 数据来源追踪 |

## 错误响应格式

所有错误响应统一格式:
```json
{
    "error": "错误信息描述",
    "source_reference": "相关ID或源行号",
    "details": "额外的错误详情"
}
```

## 项目结构

```
.
├── app/
│   ├── __init__.py          # 应用工厂
│   ├── models.py            # 数据模型
│   ├── sample_data.py       # 示例数据
│   ├── api/
│   │   └── __init__.py      # API接口
│   └── services/
│       ├── points_service.py    # 积分业务逻辑
│       └── forecast_engine.py   # 预测引擎
├── config.py                # 配置文件
├── run.py                   # 启动脚本
├── test_api.py              # 测试工具
└── requirements.txt         # 依赖
```

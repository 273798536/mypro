# 跨境音乐版税预提系统

海外流媒体平台版税预提管理后端系统，解决跨币种、跨税率、跨期的版税核算难题。

## 核心功能

### 1. 统一数据链路
- **版税明细管理**: 支持多平台、多币种、多季度的版税明细录入
- **关联归集**: 播放报表、汇率表、制作人名单自动关联到同一件事
- **状态追踪**: 待处理 → 已验证 → 已归集 → 已结算 / 有异议

### 2. 预提试算与归集
- **实时试算**: 按期间/平台筛选，即时查看预提结果
- **币种换算**: 自动应用对应期间汇率，生成换算口径说明
- **批量归集**: 验证通过后一键归集，自动更新所有关联状态

### 3. 历史追溯
- 每条明细的状态变更、金额调整、操作人完整记录
- 归集单号可追溯全部关联明细
- 导出操作日志留存

### 4. 报表导出
- 版税明细Excel导出（含币种汇总sheet）
- 归集报告导出（含换算说明sheet）
- 自动附带币种换算口径说明

## 业务流程

```
播放报表导入
    ↓
创建版税明细 (自动换算人民币、计算预提税)
    ↓
待处理 → 已验证 (核对曲目与金额)
    ↓
预提试算 (查看汇总数据)
    ↓
版税归集 (生成归集单号)
    ↓
已归集 → 已结算
    ↓
导出报告 (附带换算口径说明)
```

## 项目结构

```
y12404/
├── app/
│   ├── main.py                 # FastAPI入口
│   ├── models/
│   │   └── database.py         # 数据库模型
│   ├── schemas/
│   │   └── royalty.py          # Pydantic Schema
│   ├── services/
│   │   ├── royalty_service.py  # 版税核心业务
│   │   └── export_service.py   # 导出服务
│   └── api/
│       ├── deps.py             # 依赖注入
│       └── endpoints/
│           ├── royalty.py      # 版税管理API
│           └── master_data.py  # 基础数据API
├── scripts/
│   ├── init_data.py            # 初始化基础数据
│   └── demo_flow.py            # 完整流程演示
├── requirements.txt
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 初始化基础数据

```bash
python scripts/init_data.py
```

### 3. 运行演示流程

```bash
python scripts/demo_flow.py
```

### 4. 启动API服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 访问API文档

打开浏览器访问: http://localhost:8000/docs

## API接口清单

### 版税管理 (`/api/v1/royalty`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/details` | 创建版税明细 |
| POST | `/details/query` | 查询版税明细列表 |
| GET | `/details/{id}` | 获取明细详情 |
| PUT | `/details/{id}/status` | 更新明细状态 |
| GET | `/details/{id}/history` | 获取变更历史 |
| POST | `/trial-calculate` | 预提试算 |
| POST | `/accruals` | 创建版税归集 |
| GET | `/accruals` | 获取归集记录 |
| GET | `/accruals/{id}/details` | 获取归集明细 |
| POST | `/export/details` | 导出版税明细 |
| GET | `/export/accrual/{id}` | 导出归集报告 |
| GET | `/export/logs` | 获取导出日志 |

### 基础数据 (`/api/v1/master`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/producers` | 创建制作人 |
| GET | `/producers` | 获取制作人列表 |
| POST | `/tracks` | 创建曲目 |
| GET | `/tracks` | 获取曲目列表 |
| POST | `/exchange-rates` | 创建汇率 |
| GET | `/exchange-rates` | 获取汇率列表 |
| POST | `/play-reports` | 创建播放报表 |
| GET | `/play-reports` | 获取播放报表列表 |

## 核心特性说明

### 1. 用户友好的错误提示

所有错误响应都包含三层信息:
```json
{
  "error_code": "VALIDATION_ERROR",
  "error_message": "明细状态不正确（需为已验证）: [1, 2, 3]",
  "user_friendly_message": "明细状态不正确（需为已验证）: [1, 2, 3]。请先完成曲目核对和金额确认后再执行归集。"
}
```

### 2. 币种换算口径说明自动生成

归集报告和导出文件自动附带换算说明:
```
【币种换算口径说明】
报表期间：2024Q1
换算规则：按各币种入账当月1日央行中间价折算为人民币

各币种明细：
- USD: 原币金额 1250.50，汇率 7.245600，记录数 1条

预提税说明：根据《内地和香港特别行政区关于对所得避免双重征税和防止偷漏税的安排》，
特许权使用费预提所得税税率为 7%（需提供税收居民身份证明），未提供证明则按 10% 计征。
```

### 3. 状态流转强制校验

- 归集前必须为"已验证"状态
- 状态变更必须填写变更原因
- 所有操作记录操作人和时间

### 4. 数据一致性

归集操作是原子事务:
1. 创建归集记录
2. 关联所有明细
3. 批量更新明细状态
4. 写入历史记录
5. 全部成功或全部回滚

## 数据库表结构

- `producers` - 制作人信息
- `tracks` - 曲目信息 (ISRC唯一标识)
- `exchange_rates` - 汇率表 (币种+日期唯一)
- `play_reports` - 播放报表
- `royalty_details` - 版税明细 (核心表)
- `royalty_accruals` - 归集记录
- `accrual_details` - 归集-明细关联
- `royalty_history` - 变更历史
- `export_logs` - 导出日志

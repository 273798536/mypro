# 加油卡企业分摊分析工具

## 项目概述

针对企业加油卡费用分摊管理的全流程分析工具，支持加油流水导入、数据清洗、异常检测、项目分摊、司机确认和报表导出。

## 技术栈

- **后端**: Python 3.9+ / Flask / SQLAlchemy / SQLite
- **前端**: Vue 3 + Element Plus + ECharts
- **数据处理**: Pandas

## 功能特性

### 核心功能
1. **📊 数据概览** - 可视化展示消费趋势、油品分布、项目分摊汇总
2. **📋 加油流水管理** - 支持Excel/CSV导入，数据自动清洗标准化
3. **⚠️ 异常检测** - 自动识别车牌错误、非授权油品、金额异常等问题
4. **💰 项目分摊** - 支持自动分摊和手动调整，保留分摊痕迹
5. **✅ 司机确认** - 生成确认任务，司机可确认或提出异议
6. **📁 基础数据** - 项目、车辆、司机信息管理

### 异常检测类型
- 车牌未授权/格式错误
- 非授权油品/车辆油品不匹配
- 金额异常/数量异常
- 项目跨期（早于开始/晚于结束）
- 司机信息缺失/不匹配

## 快速开始

### 1. 启动后端服务

```bash
chmod +x start_backend.sh
./start_backend.sh
```

后端服务运行在 http://localhost:5001

### 2. 启动前端页面

```bash
chmod +x start_frontend.sh
./start_frontend.sh
```

前端页面运行在 http://localhost:8080

### 3. 测试数据

使用 `sample_data/fuel_records_sample.csv` 进行导入测试。

## 项目结构

```
.
├── backend/                    # 后端代码
│   ├── app.py                 # Flask主应用
│   ├── config.py              # 配置文件
│   ├── models.py              # 数据模型
│   ├── data_importer.py       # 数据导入与清洗
│   ├── anomaly_detector.py    # 异常检测引擎
│   ├── allocator.py           # 项目分摊算法
│   ├── driver_confirmation.py # 司机确认流程
│   ├── report_exporter.py     # 报表导出
│   └── audit_logger.py        # 审计追踪
├── frontend/
│   └── index.html             # 前端单页应用
├── sample_data/
│   └── fuel_records_sample.csv # 示例数据
├── requirements.txt           # Python依赖
├── start_backend.sh           # 后端启动脚本
└── start_frontend.sh          # 前端启动脚本
```

## API 接口

### 数据导入
- `POST /api/upload` - 上传加油流水文件

### 记录管理
- `GET /api/fuel-records` - 获取记录列表
- `GET /api/fuel-records/:id` - 获取记录详情
- `PUT /api/fuel-records/:id` - 更新记录

### 异常处理
- `POST /api/anomalies/resolve/:id` - 标记异常已处理

### 分摊管理
- `POST /api/allocate/auto` - 自动分摊
- `POST /api/allocate/manual` - 手动分摊
- `GET /api/allocation-summary` - 分摊汇总

### 司机确认
- `GET /api/driver-confirmations` - 获取确认任务
- `POST /api/driver-confirmations/create` - 批量创建确认任务
- `POST /api/driver-confirmations/:id/confirm` - 确认/异议

### 报表导出
- `GET /api/export/fuel-records` - 导出流水明细
- `GET /api/export/allocation-report` - 导出分摊报告
- `GET /api/export/anomaly-report` - 导出异常报告
- `GET /api/export/project-summary` - 导出项目汇总

### 基础数据
- `GET/POST /api/projects` - 项目管理
- `GET/POST /api/vehicles` - 车辆管理
- `GET/POST /api/drivers` - 司机管理

## 数据模型

### 核心表
- `fuel_records` - 加油流水记录
- `vehicles` - 车辆档案
- `drivers` - 司机档案
- `projects` - 项目档案
- `fuel_types` - 油品配置
- `anomalies` - 异常记录
- `allocations` - 分摊记录
- `driver_confirmations` - 司机确认记录
- `audit_logs` - 操作审计日志

## 使用流程

1. **基础数据配置** - 在"基础数据"页面录入项目、车辆、司机信息
2. **导入流水** - 在"加油流水"页面上传Excel/CSV文件
3. **异常处理** - 在"异常处理"页面查看并处理异常记录
4. **项目分摊** - 在"项目分摊"页面执行自动或手动分摊
5. **司机确认** - 在"司机确认"页面生成确认任务并处理
6. **报表导出** - 导出各类报表供财务使用

## 注意事项

- 首次启动会自动创建数据库和初始数据
- 所有操作均有审计日志，可追溯修改历史
- 异常记录不会自动分摊，需人工确认后处理
- 支持按会计期间筛选数据

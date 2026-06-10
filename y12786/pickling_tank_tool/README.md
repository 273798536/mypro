# 酸洗槽浓度补加质检系统

> 整合称量单、试剂台账、处理意见于一体的质检工具，告别临时群，一站式管理酸洗槽浓度补加流程。

## ✨ 功能特性

### 📋 核心功能
- **称量单管理**：记录酸洗槽浓度补加的称量信息
- **试剂台账**：关联试剂批次、纯度、浓度、生产厂家等信息
- **处理意见**：质检人员填写处理意见、浓度计算、判断结论
- **批次追踪**：完整记录每次操作和判断变更，可追溯前后差别
- **谱峰重叠标记**：明确标注谱峰重叠卡在哪份材料上，方便复核

### 🔧 操作模式
- **重复运行**：支持多次运行分析，记录运行次数
- **补录**：支持历史数据补录，记录补录来源和备注
- **人工确认**：主管人工确认，记录确认人和确认意见

### 📊 数据质量
- **坏数据标记**：标记浓度错填等异常数据
- **样例数据**：贴近日常的测试数据，包含旧表、补录、漏填、坏数据
- **报告版本**：导出报告时自动递增版本号，记录判断变更历史

## 🚀 快速开始

### 环境要求
- Python 3.8+
- curl（用于脚本测试）

### 三步启动（从空目录开始）

```bash
# 1. 安装依赖
cd pickling_tank_tool
bash scripts/00_install_deps.sh

# 2. 启动服务（在新终端窗口）
bash scripts/01_start_server.sh

# 3. 导入样例数据（另开一个终端）
bash scripts/02_import_sample.sh
```

### 访问系统
- 前端界面：http://localhost:8000/static/index.html
- API 文档：http://localhost:8000/docs
- 一键导入样例：点击页面右上角「导入样例数据」

## 📁 项目结构

```
pickling_tank_tool/
├── backend/                    # 后端服务
│   ├── main.py                 # FastAPI 主入口
│   ├── database.py             # 数据库配置
│   ├── models.py               # 数据模型
│   ├── schemas.py              # Pydantic 模式
│   ├── crud.py                 # 业务逻辑
│   └── requirements.txt        # Python 依赖
├── frontend/                   # 前端界面
│   └── index.html              # 单页面应用
├── scripts/                    # 脚本示例
│   ├── 00_install_deps.sh      # 安装依赖
│   ├── 01_start_server.sh      # 启动服务
│   ├── 02_import_sample.sh     # 导入样例数据
│   └── 03_full_demo.sh         # 完整流程演示
├── examples/                   # 使用示例
│   ├── curl_examples.md        # curl 示例大全
│   └── bad_data_sample.json    # 坏数据样例
├── data/                       # 数据库文件
│   └── pickling.db             # SQLite 数据库（运行后生成）
└── README.md                   # 本文件
```

## 🧪 完整流程演示

运行完整流程脚本，体验所有功能：

```bash
bash scripts/03_full_demo.sh
```

脚本会依次执行：
1. 创建新的称量单
2. 录入试剂台账
3. 创建处理意见（带谱峰重叠）
4. 重复运行分析 3 次
5. 补录数据
6. 修改最终判断（记录变更）
7. 人工确认
8. 导出报告
9. 查看批次追踪（验证判断前后差别）
10. 查看谱峰重叠信息
11. 查看完整详情

## 📝 样例数据说明

导入后包含 5 条样例数据，覆盖日常场景：

| 批次号 | 类型 | 特点 |
|--------|------|------|
| SX-2026-0601-001 | 正常记录 | 常规合格记录 |
| SX-2026-0602-002 | 补录数据 | 谱峰重叠、已人工确认 |
| SX-2026-0603-003 | 旧表数据 | 漏填单位、数据存疑、判断变更 |
| SX-2026-0603-004 | 坏数据 | 试剂浓度错填（65%→650%） |
| SX-2026-0604-005 | 复杂记录 | 混合酸、多元素谱峰重叠严重 |

## 🔌 API 接口速览

### 称量单
- `POST /api/weighing-forms/` - 创建称量单
- `GET /api/weighing-forms/` - 查询列表
- `GET /api/weighing-forms/{id}/detail` - 完整详情（含台账、处理意见、追踪）
- `PUT /api/weighing-forms/{id}` - 更新称量单

### 试剂台账
- `POST /api/reagent-ledgers/` - 录入台账
- `GET /api/weighing-forms/{id}/reagent-ledger` - 查询台账

### 处理意见
- `POST /api/treatment-opinions/` - 创建处理意见
- `POST /api/treatment-opinions/{id}/rerun` - 重复运行
- `POST /api/treatment-opinions/{id}/manual-confirm` - 人工确认
- `POST /api/treatment-opinions/{id}/export-report` - 导出报告
- `PUT /api/treatment-opinions/{id}` - 更新处理意见

### 批次追踪
- `GET /api/batch-tracks/?batch_no=XXX` - 查询批次追踪
- `GET /api/weighing-forms/{id}/spectrum-overlap` - 谱峰重叠检查
- `POST /api/weighing-forms/{id}/supplement` - 补录数据
- `POST /api/weighing-forms/{id}/mark-bad-data` - 标记坏数据

### 其他
- `POST /api/import-sample-data` - 导入样例数据

完整的 curl 示例请参考 [examples/curl_examples.md](examples/curl_examples.md)

## 🎯 关键设计说明

### 谱峰重叠可见性
- 处理意见中标记 `spectrum_peak_overlap=true` 时，前端会高亮显示
- `overlap_material` 字段明确记录「卡在哪份材料上」
- 人工确认时会弹窗提醒谱峰重叠问题，确保复核人看到

### 判断变更追踪
- 修改 `final_judgment` 时自动记录 `before_judgment` 和 `after_judgment`
- `judgment_changed` 标记判断是否变更
- `change_reason` 记录变更原因
- 批次追踪时间线中用红色标记有变更的操作

### 报告版本管理
- 每次导出报告 `report_version` 自动 +1
- 记录 `report_export_time` 导出时间
- 所有操作都关联数据版本号，便于回溯

### 三种操作模式
1. **重复运行**：调用 `/rerun` 接口，`run_count++`，记录运行时间
2. **补录**：调用 `/supplement` 接口，标记 `is_supplement=true`，记录补录来源
3. **人工确认**：调用 `/manual-confirm` 接口，记录确认人和时间

## 🐛 坏数据样例（贴近日常）

**场景**：操作员录入时手滑，将 65% 写成 650%

```json
{
    "purity": "650%",
    "concentration": "650%", 
    "concentration_value": 650,
    "remarks": "典型坏数据：浓度不可能达到650%，属于录入时多写了一个0"
}
```

完整样例请参考 [examples/bad_data_sample.json](examples/bad_data_sample.json)

## 🛠 开发说明

### 数据库表结构
- `weighing_forms` - 称量单主表
- `reagent_ledgers` - 试剂台账（1:1）
- `treatment_opinions` - 处理意见（1:1）
- `batch_tracks` - 批次追踪（1:N）

### 技术栈
- **后端**：FastAPI + SQLAlchemy + SQLite
- **前端**：原生 HTML + JavaScript（无需构建）
- **数据库**：SQLite（本地文件，无需额外安装）

### 重新初始化数据库
删除 `data/pickling.db` 文件，重启服务即可重新创建。

## 📄 License

内部使用

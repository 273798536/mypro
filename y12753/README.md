# 缓冲液配方计算器

面向材料工程师的缓冲液实验记录与计算工具，覆盖**浓度换算 → 记录导入 → 复核 → 状态推进 → 报告导出**的完整链路。

---

## 一、快速启动（从空目录跑起来）

### 方式 A：一键启动（推荐）

```bash
cd 缓冲液配方计算器所在目录
bash start.sh
```

- 首次启动会自动安装所有依赖并初始化示例数据
- 前端地址：http://localhost:5173
- 后端 API 文档：http://localhost:8000/docs

### 方式 B：分开启动

```bash
# 终端 1 - 后端
bash start_backend.sh

# 终端 2 - 前端
bash start_frontend.sh
```

---

## 二、环境要求

| 项目 | 版本要求 |
|------|----------|
| Python | ≥ 3.9 |
| Node.js | ≥ 18 |
| 浏览器 | 任意现代浏览器 |

> 如果不想用脚本，手动安装命令：
> ```bash
> # 后端
> cd backend
> python3 -m venv .venv && source .venv/bin/activate
> pip install -r requirements.txt
> uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
>
> # 前端
> cd frontend
> npm install
> npm run dev
> ```

---

## 三、首次打开的示例数据

系统首次启动会自动向数据库插入 3 条真实场景示例（重启服务后仍保留在 `backend/buffer_calc.db`）：

| 批次号 | 缓冲液 | 状态 | 说明 |
|--------|--------|------|------|
| BUF-2026-001 | PBS 磷酸盐 pH 7.4 | 已导入 | 含完整组分、6 个温度点、4 条称量记录（全部合格） |
| BUF-2026-002 | Tris-HCl pH 8.0 | 已确认 | 复核通过，可直接导出报告 |
| BUF-2026-003 | 醋酸-醋酸钠 pH 5.0 | 草稿 | 仅填了基本信息和组分，待补温度和称量数据 |

> 数据库文件：`backend/buffer_calc.db`（SQLite，单文件即全部数据，删除即可重置）

---

## 四、使用流程（按材料工程师习惯）

```
日常入口：浓度换算（首页）
   │
   ▼
记录管理
   ├─ 新建 / 导入记录     ← 防止同批次+同日期重复导入
   ├─ 补录数据            ← 温度曲线、称量记录随时追加，不会产生多份结论
   ├─ 复核                ← 精度不合格 / 温度偏差超 ±2℃ 会被卡住
   ├─ 状态推进            ← 草稿 → 已导入 → 复核中 → 已确认 → 已报告
   └─ 报告导出 (Excel)    ← 导出内容与页面摘要完全一致，不会出现"页面通过、文件待确认"

月底 / 课前：配平计算
   └─ 基于 Henderson-Hasselbalch 方程算酸碱比例和需称量质量
```

---

## 五、关键质量控制点

| 关注点 | 实现位置 | 说明 |
|--------|----------|------|
| 防重复导入 | `backend/app/services.py:create_buffer_record` + `models.py:UniqueConstraint` | 批次号 + 记录日期唯一 |
| 称量精度校验 | `backend/app/services.py:_calc_weighing_check` | 默认允许误差 ±0.5%，超限标记不合格 |
| 温度曲线对齐 | `backend/app/services.py` create/update 中 | 设定 vs 实际偏差超 ±2℃ 标记不合格 |
| 状态推进防呆 | `backend/app/models.py:RecordStatus.TRANSITIONS` | 只能沿允许路径推进 |
| 导出-界面一致性 | `backend/app/services.py:build_report_content` | 报告预览接口和 Excel 导出共用同一份数据 |
| 补录不重复 | 所有子表（组分/温度/称量）更新时先 `clear()` 再重建 | 同一件事只有一份结论 |

---

## 六、项目结构

```
.
├── backend/                    # FastAPI + SQLite 后端
│   ├── app/
│   │   ├── main.py             # 入口，启动时自动建表 + 灌示例数据
│   │   ├── database.py         # SQLAlchemy 引擎
│   │   ├── models.py           # 数据模型 + 状态流转规则
│   │   ├── schemas.py          # Pydantic 请求/响应模型
│   │   ├── services.py         # 业务逻辑（计算、校验、状态流转、报告构建）
│   │   ├── routers.py          # API 路由
│   │   └── sample_data.py      # 3 条示例记录
│   ├── requirements.txt
│   └── buffer_calc.db          # 运行后生成，SQLite 数据库
├── frontend/                   # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx             # 顶栏 + 路由
│   │   ├── api.ts              # fetch 封装
│   │   ├── types.ts            # TS 类型
│   │   ├── index.css           # 全局样式
│   │   └── pages/
│   │       ├── ConcentrationPage.tsx   # 浓度换算（日常入口，首页）
│   │       ├── RecordsPage.tsx         # 记录列表
│   │       ├── NewRecordPage.tsx       # 新建记录
│   │       ├── RecordDetailPage.tsx    # 详情（温度曲线/复核/导出）
│   │       └── BalancePage.tsx         # 配平计算
│   └── package.json
├── start.sh                    # 一键启动
├── start_backend.sh
└── start_frontend.sh
```

---

## 七、后端 API 速查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/records?status=&keyword=` | 记录列表（支持状态、关键词筛选） |
| GET | `/api/records/{id}` | 记录详情 |
| POST | `/api/records` | 新建记录（重复批次会被拒绝） |
| PUT | `/api/records/{id}` | 更新记录（补录组分/温度/称量） |
| POST | `/api/records/{id}/status` | 状态推进 |
| DELETE | `/api/records/{id}` | 删除记录 |
| GET | `/api/records/{id}/report-preview` | 报告 JSON 预览（与 Excel 内容同源） |
| GET | `/api/records/{id}/report` | 下载 Excel 报告 |
| POST | `/api/calc/concentration` | 浓度 ↔ 质量 换算 |
| POST | `/api/calc/balance` | 缓冲对配平计算 |

完整交互式文档见：http://localhost:8000/docs

# 社区充电容量复核 - 开发任务清单

技术栈：Python + FastAPI + PostgreSQL + SQLAlchemy

---

## 阶段一：项目脚手架与数据模型

| 编号 | 任务 | 预估工时 | 依赖 | 交付物 |
|------|------|----------|------|--------|
| T-01 | 初始化 FastAPI 项目，配置依赖（fastapi, uvicorn, sqlalchemy, alembic, pydantic, python-dotenv） | 0.5h | 无 | pyproject.toml / requirements.txt, 项目目录结构 |
| T-02 | 配置数据库连接与 Alembic 迁移环境 | 0.5h | T-01 | database.py, alembic.ini, 迁移脚本目录 |
| T-03 | 定义 InspectionRecord ORM 模型与 Pydantic Schema | 1h | T-02 | models/inspection.py, schemas/inspection.py |
| T-04 | 定义 Attachment ORM 模型与 Pydantic Schema | 0.5h | T-02 | models/attachment.py, schemas/attachment.py |
| T-05 | 定义 PointAlias ORM 模型与 Pydantic Schema | 0.5h | T-02 | models/point_alias.py, schemas/point_alias.py |
| T-06 | 定义 ReviewTask 与 ReviewResult ORM 模型及 Schema（含三类 status enum） | 1h | T-02 | models/review.py, schemas/review.py |
| T-07 | 生成并执行首次数据库迁移 | 0.5h | T-03 ~ T-06 | Alembic 迁移版本文件 |

---

## 阶段二：核心业务逻辑

| 编号 | 任务 | 预估工时 | 依赖 | 交付物 |
|------|------|----------|------|--------|
| T-10 | 实现点位归并服务：文本相似度计算 + GPS 距离判断 + 归并证据记录 | 2h | T-05, T-06 | services/point_merger.py |
| T-11 | 实现早晚高峰口径判定服务：差异阈值判断 + 材料校验 + 口径选择逻辑 | 2h | T-03, T-04 | services/caliber_resolver.py |
| T-12 | 实现新旧方案冲突检测服务：历史数据对比 + 证据链校验 + 挂起判定（**严格落实 C-1**） | 2h | T-06 | services/conflict_detector.py |
| T-13 | 实现复核引擎编排：串联归并 → 口径 → 冲突检测，输出三类结果状态 | 2h | T-10 ~ T-12 | services/review_engine.py |

---

## 阶段三：接口层实现

| 编号 | 任务 | 预估工时 | 依赖 | 交付物 |
|------|------|----------|------|--------|
| T-20 | 实现启动复核接口 `POST /api/review/tasks`：参数校验 → 异步任务触发 → 返回 task_id | 1.5h | T-07, T-13 | routers/review.py, tasks/review_worker.py |
| T-21 | 实现重跑复核接口 `POST /api/review/tasks/{task_id}/rerun`：状态校验 → 追加补充记录 → 重新触发引擎 | 1h | T-20 | routers/review.py |
| T-22 | 实现查看结果接口 `GET /api/review/tasks/{task_id}/results`：按 status 过滤 + 分页 + summary 统计 + materials 三字段完整返回 | 1.5h | T-07 | routers/review.py |
| T-23 | 实现异常状态码：400 参数错误 / 404 不存在 / 409 运行中冲突 / 422 校验失败 | 0.5h | T-20 ~ T-22 | routers/review.py, exceptions.py |

---

## 阶段四：测试与验证

| 编号 | 任务 | 预估工时 | 依赖 | 交付物 |
|------|------|----------|------|--------|
| T-30 | 编写单元测试：点位归并（正常归并 + 相邻点位不合并） | 1.5h | T-10 | tests/test_point_merger.py |
| T-31 | 编写单元测试：口径判定（一致 / 一方缺 / 差异大可解释 / 差异大无解释） | 1.5h | T-11 | tests/test_caliber_resolver.py |
| T-32 | 编写单元测试：冲突检测（一致 / 有扩容通知 / 无证据 → 必须挂起 C-1 验证） | 1h | T-12 | tests/test_conflict_detector.py |
| T-33 | 编写接口集成测试：三个核心接口的正常 + 异常场景 | 2h | T-20 ~ T-23 | tests/test_review_api.py |
| T-34 | 按 check_list.md 逐项走查验收 | 1h | T-30 ~ T-33 | 验收通过标记 |

---

## 总预估工时：约 24 小时

### 关键里程碑
- M1（T-07 完成）：数据模型落地，可开始业务逻辑开发
- M2（T-13 完成）：核心复核引擎可运行
- M3（T-23 完成）：三个接口联调可用
- M4（T-34 完成）：全量验收通过

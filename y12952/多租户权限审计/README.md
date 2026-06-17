# 多租户权限审计 · BI 分析师巡检小工具

> 不用再每次巡检前靠截图、手写备注、权限清单硬对。跑几条命令就能拿到带解释、可直接转发同事的审计报告。

---

## 快速开始（2 分钟上手）

```bash
cd 多租户权限审计

# 1. 首次打开：自动加载样例数据（7 类典型场景）
python3 main.py init

# 2. 看总览：异常/风险/复核/批处理一张表
python3 main.py dashboard

# 3. 出报告：Markdown 格式 + 普通话解释 + 可复制文案
python3 main.py report -o 巡检报告.md

# 4. 复核一条异常（比如外键断链），谁改的/什么时候/为什么自动留痕
python3 main.py review \
    --finding F002 \
    --action APPROVE \
    --reviewer "李工-审计组" \
    --comment "工单 TK20251218 已清理测试数据 2 条，断链消除"

# 5. 顺着一条异常往回查：异常 → 处理记录 → 迁移脚本
python3 main.py trace --finding F002
```

**零依赖**：只用 Python 3 标准库（sqlite3、argparse、json…），`pip install` 不用跑。

---

## 所有命令速查

| 子命令 | 作用 | 常用参数 |
| --- | --- | --- |
| `init` | 初始化 DB + 加载样例数据 | `--force` 强制重置 |
| `dashboard` | 总览仪表盘：异常/风险/复核/批处理 | `--tenant T002` 只看某租户 |
| `report` | 生成完整审计报告 | `--format md/text` `--tenant` `--pending-only` `-o 输出.md` |
| `explain` | 单条异常的普通话解释 + 可复制文案 | `--finding F001` |
| `trace` | 异常溯源：处理记录 → 迁移脚本 → 处理意见 | `--finding F002` `--format md/text` |
| `review` | 复核异常（历史自动留痕） | `--finding --action --reviewer --comment [--handler-opinion]` |
| `history` | 查看某条异常的全部复核历史 | `--finding F002` |
| `batches` | 批处理记录（迁移+权限共用一套） | `--batch BATCH-MIG-20251205` |
| `tenants` | 列出租户清单及异常数/权限数 | |

### 复核动作枚举 `--action`

| 值 | 含义 | 目标状态 |
| --- | --- | --- |
| `APPROVE` | 复核通过（如外键断链确认修复、数据归属确认） | APPROVED |
| `REJECT` | 驳回（认为异常判定有误） | REJECTED |
| `MARK_FIXED` | 标记已修复 | FIXED |
| `NEEDS_FIX` | 标记待修复 | NEEDS_FIX |
| `REOPEN` | 重新打开 | PENDING |

---

## 满足了你提的每一条需求

| 你提的需求 | 在工具里怎么实现的 |
| --- | --- |
| **先做成能跑的小工具** | 纯 Python3+SQLite，`main.py` 一个入口 9 条子命令，`pip install` 免了 |
| **命令参数写清楚** | `main.py -h` + 每个子命令 `-h` 都有详细帮助；README 有速查表 |
| **样例数据放好，不手工整理半天** | `main.py init` 一键加载：4 租户 / 4 迁移脚本 / 5 权限规则 / **18 条处理记录** / **7 条异常**（覆盖备份缺口、外键断链、权限泄漏、角色超权、跨租户、孤立租户、迁移失败 7 类） |
| **迁移状态和权限审计共用同一批处理记录** | `processing_records` 一张表统一承载迁移(MIGRATION)、外键检查(FK_CHECK)、权限审计(PERMISSION_AUDIT)；`batches` 子命令展示每条处理记录关联的异常；`report` 里「批处理进度」和异常是同一批数据 |
| **首次打开给示例数据** | `init` 必载样例，`dashboard` 立刻能看到 7 条异常 5 个高危，立刻能理解工具 |
| **备份缺口等记录附普通话解释** | `PLAIN_EXPLANATIONS` 为每类异常写了三档：一句话 / 详细（背景+问题+风险+建议）/ **一段可直接复制给同事的完整文案**；`explain` / `report` 都输出 |
| **外键断链复核通过后，历史知道谁/何时/为什么** | `review` 子命令要求 `--reviewer` + `--comment` **必填**；操作写入 `review_histories` 表；`history` 子命令逐条列出来龙去脉 |
| **顺着异常往回查，查到迁移脚本+处理意见** | `trace` 子命令给时间线：**异常发现 → 处理记录溯源（批次/ID/操作员）→ 关联迁移脚本（版本/文件/错误）→ 所属租户 → 处理意见 → 历次复核** |

---

## 样例数据覆盖的 7 类场景

运行 `main.py dashboard` 你会看到这些真实还原的问题：

| ID | 类型 | 风险 | 场景 |
| --- | --- | --- | --- |
| F001 | 备份缺口 | 高危 | T003 租户 142 条用户数据迁移时被跳过，新库缺且未独立备份 |
| F002 | 外键断链 | 严重 | order_header 两条订单指向 user_T003 中不存在的用户 U0100/U0101 |
| F003 | 迁移脚本执行失败 | 高危 | V2025.12.003 权限初始化脚本因唯一键冲突整体回滚 |
| F004 | 角色超权 | 高危 | T001「订单审核员」持有 finance_payout.execute 打款权限 |
| F005 | 权限泄漏 | 严重 | T002「风控分析师」拿了通配符 *:* 全权限 |
| F006 | 跨租户访问风险 | 中危 | 同一账号 ops_reader01 跨 T001/T002 同角色授权 |
| F007 | 孤立租户 | 中危 | T004 西南文旅租户业务停摆但权限仍活跃（含通配符） |

---

## 验收回查路径（模拟真正验收时的操作）

当你要**顺着一条异常往回查**时，就跑这条命令：

```bash
python3 main.py trace --finding F002
```

输出会给你完整时间线：

1. **异常发现**：2025-12-06 10:06 审计引擎标记外键断链
2. **处理记录溯源**：批次 `BATCH-MIG-20251205` / 记录 `R0012` / 操作员 `li.na` / 状态 `FK_MISSING`
3. **关联迁移脚本**：`V2025.12.002 订单外键修复`（`migrations/V2025.12.002_order_fk.sql`），状态 `PARTIAL`，报错「T003 环境 user 表未建立，外键创建失败 142 条」
4. **所属租户**：T003 华南物流租户（预生产）
5. **复核历史**（如果已复核）：谁、什么时候、改了什么状态、为什么（带工单）

完美符合「能查到迁移脚本和处理意见才算顺」的验收标准。

---

## 目录结构

```
多租户权限审计/
├── main.py                  # CLI 入口（9 条子命令）
├── core/
│   ├── models.py            # 数据类 + 枚举（异常类型/风险/复核状态）
│   ├── database.py          # SQLite 封装（所有表 CRUD）
│   └── sample_data.py       # 样例数据（7 类异常场景）
├── audit/
│   ├── analyzer.py          # 总览分析 + 迁移状态 + 共用记录对比
│   ├── review.py            # 复核管理（状态变更 + 历史留痕）
│   └── trace.py             # 异常溯源引擎
├── report/
│   └── generator.py         # 报告生成 + 8 类异常普通话解释模板
└── data/
    └── audit.db             # SQLite 数据库文件（首次 init 后生成）
```

---

## 常用高级用法

```bash
# 只看 T003 租户的报告，聚焦备份缺口/外键断链
python3 main.py report --tenant T003 -o T003专项审计.md

# 只列出还待复核的异常（扫尾时用）
python3 main.py report --pending-only --format text

# 按批次看迁移细节，核对每条处理记录是否都关联了异常
python3 main.py batches --batch BATCH-PERM-20251206

# 复核时顺手把处理意见直接写回异常本身，后续报告自动带
python3 main.py review --finding F001 --action NEEDS_FIX \
    --reviewer "王工-审计组" \
    --comment "和DBA确认，需在本周内先做备份" \
    --handler-opinion "计划 2025-12-20 前由迁移组补跑 user_T003 并做双备份"

# 指定数据库文件路径（多环境隔离时用）
AUDIT_DB_PATH=/data/production-audit.db python3 main.py dashboard
```

# 慢行桥坡道公示清单

每次改判都可查到**来源**和**当前状态**（previous → new）；旧方案覆盖、灰度反馈、现场照片补录全程留标记；CSV 按「已处理 / 待补材料 / 人工改判」分类导出。

只讲三件事：启动、重跑、查看 CSV 明细。

---

## 1. 启动

```bash
npm install
npm run dev
```

- 前端：<http://localhost:5173>（Vite，代理 `/api` 到后端）
- 后端：<http://localhost:3001>（Express + SQLite，库文件 `data/ramps.db` 自动创建）

首次打开公示清单为空，点右上角 **「启动生成」**：

- 初始化表结构 → 写入 8 条示例坡道（覆盖正常材料 / 旧方案覆盖 / 居民反馈 / 现场照片 / 人工改判）→ 按最近改判对齐状态。
- 完成后清单出现表格、统计卡、地图点位。

> 想要全新基线：删掉 `data/ramps.db` 后再点「启动生成」即可重新种子。或单独跑 `npm run seed`。

## 2. 重跑

清单页右上角 **「重跑」**（`POST /api/list/rerun`）：

- **不删数据**，只按每条坡道的「最近一条改判记录」重新对齐 `当前状态`、`is_overriding` 标记和来源聚合。
- 适合在直接改过数据库、或老数据状态漂移后用来「拉齐」。
- 返回里会带 `reconciled`（本次被重新对齐的坡道数），页面顶部会显示「重跑 · 已处理 X · 待补 Y · 人工改判 Z · 对齐 N」。

> 改判请走详情页的「居民反馈 / 现场照片 / 人工改判」面板，**不要**手改库——那样不会留来源记录。重跑只会对齐到「已记录的最近改判」。

## 3. 查看 CSV 明细

清单页右上角 **「导出 CSV」**（`GET /api/export/csv?status=`，带 UTF-8 BOM，Excel 直开不乱码）。四个选项：

| 选项 | 说明 |
| --- | --- |
| 全部分类 | 按 `已处理 → 待补材料 → 人工改判` 分段排序，一文件看全貌 |
| 已处理 | 仅 `processed`，材料齐备、可对外公示 |
| 待补材料 | 仅 `pending`，含被旧方案覆盖的条目 |
| 人工改判 | 仅 `overridden`，人工核定挂账、需负责人复核 |

CSV 列：`分类 / 坡道 / 所属慢行桥 / 地址 / 当前状态 / 最近改判来源 / 最近改判时间 / 最近改判改变了哪些判断 / 是否旧方案覆盖 / 改判次数`。

- **「最近改判改变了哪些判断」** 就是每次改判时填的 `affectedSummary`，让负责人不用翻聊天记录就能说清这次改判动了什么。
- **「是否旧方案覆盖」** 标 `是` 的行，在网页清单里也会带橙色左边线和「旧方案覆盖」标签，筛选/详情/导出三处标记一致。

---

## 改判怎么留痕（给运营看一眼就够）

详情页三个面板都会写一条 `change_log`，并返回「不止成功」：

- 来源（resident_feedback / on_site_photo / manual_override）
- 前后状态（previousStatus → newStatus）
- 改变了哪些判断（affectedSummary）+ 操作人 + 时间

提交后顶部 Toast 会直接报「已记录改判：来源「…」，状态 X → Y」，时间线立刻多一条带状态箭头的记录。

相关代码：后端改判入口 [rampService.ts](file:///Users/mac/pro/solo/workspaces/y13294/api/services/rampService.ts)、CSV 导出 [csvService.ts](file:///Users/mac/pro/solo/workspaces/y13294/api/services/csvService.ts)、前端清单页 [Home.tsx](file:///Users/mac/pro/solo/workspaces/y13294/src/pages/Home.tsx)。

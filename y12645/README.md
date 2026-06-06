# 农机作业轨迹纠偏培训系统

安全培训师复核版：帮助新同事理解为什么重复标注需要复核。关卡少但覆盖完整流程：
边界失败练习、撤销/重做、可追溯来源、可一眼分清「可直接使用」与「需安全培训师复核」。

---

## 从零开始启动

### 1. 环境要求

- Node.js >= 18
- npm 或 pnpm 任意包管理器

### 2. 安装依赖

```bash
cd /Users/mac/pro/solo/workspaces/y12645
npm install
```

### 3. 启动开发服务

```bash
npm run dev
```

默认地址：<http://localhost:5173>

### 4. 构建生产版本

```bash
npm run build
npm run preview
```

### 5. 第一份样例在哪

关卡数据与样例轨迹点集中在：

- 关卡定义：`src/data/sampleData.ts`
  - 关卡 01：`01 田块边界越界识别`（简单）
    - 底图坐标 E116.30-116.31 / N39.85-39.86
    - 截图素材 `field_20240603_001.jpg`、`field_20240603_002.jpg`
    - 包含 1 处真实边界越界（第 6 行），可练习撤销/重做
  - 关卡 02：`02 碰撞边界误判复核（综合）`（中等）
    - 底图坐标 E116.35-116.36 / N39.88-39.89
    - 截图素材 `collision_20240605_003.jpg` ~ `collision_20240605_005.jpg`
    - 同一轮复核包含：老系统碰撞误判（田埂阴影，需撤销驳回）、真实边界越界（防护林带，需确认）、GPS 漂移

- 类型定义：`src/types/index.ts`
- 状态管理（统一 store）：`src/store/useStore.ts`
- 页面组件：`src/components/LevelSelect.tsx`、`AnnotationWorkspace.tsx`、`SettlementPage.tsx`

---

## 训练流程

1. **选择关卡**：在首页选择对应训练关卡，可看到训练目标、是否含边界失败/撤销练习。
2. **轨迹图标注**：
   - 点击轨迹上的点 → 右侧选择异常类型（边界违规 / GPS 漂移 / 重复点 / 速度异常 / 数据缺失）→ 添加标注。
   - 区域复核：对每个预定义区域选择「确认」或「驳回（撤销）」；驳回会被记录为一次边界失败。
3. **撤销 / 重做 / 重开**：顶部工具栏随时可用。撤销会把状态拉回来源材料。
4. **完成标注** → 进入结算页：
   - 顶部状态条明确 `通过 · 可直接使用` / `需安全培训师复核` / `未通过`。
   - **标注分类区** 直接把已标注分成三组：可直接使用、需培训师复核、已驳回（误判）。
   - **逐行复核明细** 保留原始行号、来源截图、来源备注，可回到那张表或那条记录。
   - **后续指引** 根据状态区分下一步操作。
5. **导出 JSON**：文件 `summary.status` 与页面结论完全一致，并做导出前一致性校验。

---

## 导出文件结构

导出的 JSON 文件结构：

```json
{
  "summary": {
    "status": "passed | needs_review | failed",
    "levelId": "...",
    "levelName": "02 碰撞边界误判复核（综合）",
    "totalPoints": 12,
    "annotations": 3,
    "accuracy": 85.5,
    "exportTime": 1717488000000,
    "summaryText": "所有标注已确认且准确率达标，可直接使用"
  },
  "annotations": [
    {
      "id": "...",
      "pointId": "...",
      "type": "boundary_violation",
      "status": "confirmed",
      "comment": "...",
      "sourceReference": {
        "lineNumber": 7,
        "imageName": "collision_20240605_004.jpg",
        "note": "5号田 真越界！进入防护林带 碰撞记录表第7行"
      }
    }
  ],
  "trajectoryPoints": [...],
  "correctionZones": [...],
  "layers": [...],
  "settlement": { ... }
}
```

> 保证：页面上的通过/复核/失败结论与 `summary.status` 字段完全一致，不会出现页面写通过但文件里写待确认的情况。

---

## 判定规则

结算状态判定（按优先级）：

| 条件 | 状态 |
|------|------|
| 准确率 ＜ 60% | `failed`（未通过，需重练） |
| 准确率 ＜ 80%，或存在 pending/needs_review 标注，或存在区域未确认，或有边界失败记录 | `needs_review`（需安全培训师复核） |
| 准确率 ≥ 80% 且所有标注/区域均确认 | `passed`（可直接使用） |

---

## 目录结构

```
src/
├── components/
│   ├── LevelSelect.tsx        # 关卡列表
│   ├── AnnotationWorkspace.tsx # 标注工作区
│   └── SettlementPage.tsx     # 结算报告页
├── data/
│   └── sampleData.ts          # 关卡与轨迹样例数据
├── store/
│   └── useStore.ts            # 统一状态管理（Zustand）
├── types/
│   └── index.ts               # TypeScript 类型定义
├── App.tsx
├── main.tsx
└── index.css
```

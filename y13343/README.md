# 排班推荐误判回放系统

> 解决 AI 产品阿宁的排班推荐误判回放人工修正被新结果覆盖的问题。
> 导入 / 确认 / 撤回 / 异常队列 全部接入同一份本地 JSON 数据，重启后历史备注、当前状态、异常队列完全对齐。

---

## 🚀 一分钟上手（接手同事请看）

### 1. 安装依赖（第一次需要）
```bash
cd /Users/mac/pro/solo/workspaces/y13343
npm install
```

### 2. 启动服务
```bash
npm start
```

启动后终端会打印：
```
========== 排班推荐误判回放系统 ==========
  服务地址: http://localhost:3100
  数据目录: /Users/mac/pro/solo/workspaces/y13343/data
  样本目录: /Users/mac/pro/solo/workspaces/y13343/samples
  ...
```

### 3. 打开浏览器
访问 **http://localhost:3100** 即可。

### 4. 跑一遍主流程（5 分钟验证）
1. 切换到 **「📥 导入」** Tab
2. 在「方式一：内置样本」下拉框选 `batch_manual_correction.json`
3. 点击 **🎯 导入此样本包** → 提示成功
4. 切到 **「📝 记录列表」**：
   - 看到 6 条记录（含 1 条红色「晚到附件」异常、1 条紫色「阈值漂移 + 改判」等）
5. 对 **rec_004_old_misjudge** 点 **「详情/回放」**：
   - 顶部看到「🔀 改判回放」卡：REST（休息） → DAY（日班）
   - 列出 3 项特征变化明细（周工时/加班审批/…）和改判解释
   - 下方「⚠️ 人工确认触发 & 下一步」卡会说明原因和建议
6. 对任意待确认记录点 **「确认」**，可写备注
7. 对已确认记录点 **「撤回」**
8. 切到 **「⚠️ 异常队列」**：看到晚到附件那条 → 点 **「标记解决」**
9. 切到 **「🔍 一致性校验」**：点 **「▶ 立即校验」** → 显示 ✅ 正常
10. **重启服务**（`Ctrl+C` → 再 `npm start`）→ 重新打开页面：
    - 所有状态 / 备注 / 异常 / 历史 **全部保留**

> 💡 材料就放在哪里？
> - 代码：`/Users/mac/pro/solo/workspaces/y13343`
> - 数据（最关键！）：`/Users/mac/pro/solo/workspaces/y13343/data/` 下 4 个 JSON
> - 样本包：`/Users/mac/pro/solo/workspaces/y13343/samples/batch_manual_correction.json`

---

## 📂 目录结构
```
y13343/
├── package.json              # 依赖声明（express 等）
├── server.js                 # 入口 + REST API 路由
├── src/
│   ├── storage.js            # 🔑 统一本地数据层（4 份 JSON + 原子写入）
│   └── service.js            # 业务逻辑（阈值漂移/改判解释/状态流转）
├── public/
│   └── index.html            # 前端单页应用（无构建工具，打开即跑）
├── samples/
│   └── batch_manual_correction.json  # 人工修正小包（含晚到附件）
└── data/                     # 运行后自动生成（导入/确认/撤回都落这里）
    ├── records.json          # 排班记录（含状态/备注/版本号）
    ├── exceptions.json       # 异常队列
    ├── history.json          # 所有操作历史（谁 何时 做了什么 备注）
    └── metadata.json         # 批次列表 + 最近修改时间
```

---

## 🔌 核心 API（全部接同一份本地 JSON）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/stats` | 统计概览（各状态计数/阈值/模型版本） |
| GET | `/api/consistency` | **一致性校验**（状态↔历史↔异常互相对得上？） |
| GET | `/api/records` | 记录列表，支持 `?status=pending&needsConfirm=true&batchId=...` |
| GET | `/api/records/:id` | 单条记录详情 |
| GET | `/api/records/:id/replay` | **误判回放**（含改判解释 + 人工确认原因 + 历史 + 异常） |
| POST | `/api/records/import` | **批量导入**（body: `{ operator, data: [...] }`） |
| POST | `/api/records/:id/confirm` | **确认**（body: `{ operator, remark? }`）→ 不被新结果覆盖 |
| POST | `/api/records/:id/withdraw` | **撤回**（body: `{ operator, remark? }`） |
| POST | `/api/records/:id/remark` | 更新备注（记录版本号自增） |
| GET | `/api/exceptions` | **异常队列**（`?resolved=false` 查未解决） |
| POST | `/api/exceptions/:id/resolve` | 标记异常解决（自动把记录从 exception→pending） |
| GET | `/api/metadata` | 导入批次元数据 |

---

## 🎯 设计要点（解决阿宁的痛点）

### 1️⃣ 人工修正不被新结果盖掉（核心痛点！）
这是阿宁被卡住的根因，设计如下：
- **状态保护**：如果记录已经是 `confirmed`（已确认）或 `withdrawn`（已撤回），**重新导入新批次时不会覆盖这些状态**，同时保留 `confirmedBy` / `confirmedAt` / `withdrawnBy` / `withdrawnAt` 和原有备注
- 操作历史写入 `update_import_preserve` 动作，明确标记"已保留人工结论"
- 每条记录带 `_version` 自增版本号，每次变更（含导入覆盖/保留）严格 +1，防止 +2 的累加 bug
- 只有 `pending` / `exception` 状态的记录才会被新导入完全刷新

### 2️⃣ 阈值漂移 → 触发人工确认 + 原因 + 下一步
在 [service.js](file:///Users/mac/pro/solo/workspaces/y13343/src/service.js#L27-L60) `needsManualConfirm()` 中：
- **置信度 < 75%** → 触发，建议人工核对规则
- **新旧置信度差 ≥ 15%（漂移阈值）** → 触发，说明漂移方向和差值
- **存在晚到附件** → 触发，建议等附件齐全
- **推荐结果变更** → 触发，建议对比特征权重

每条触发原因后面附「建议下一步」。

### 3️⃣ 旧模型误判回放 + 改判解释
在 [service.js](file:///Users/mac/pro/solo/workspaces/y13343/src/service.js#L62-L102) `explainReclassification()` 中：
- 逐条列出 **特征变化**（旧值→新值，影响方向+权重）
- 输出 **整体置信度变化**
- 若无特征变化但模型版本不同，给出「决策边界调整」兜底解释
- 前端详情弹窗直观展示「旧 → 新」对比卡片

### 4️⃣ 晚到附件异常（不只是干净记录）
样本 `rec_003_late_attachment` 带 `hasLateAttachment: true`：
- 导入时自动入 **异常队列**，类型 `late_attachment`
- 记录状态自动置为 `exception`
- 异常解决后记录状态恢复 `pending`，并留痕到历史

### 5️⃣ 重启后完全对得上
- 所有写入采用 **tmp 文件 + rename** 原子操作，不写半截
- 状态变更 **必落 history**（谁/何时/操作/备注/旧→新状态）
- `/api/consistency` 校验 4 项：
  - 异常关联的记录是否存在
  - 历史关联的记录是否存在
  - confirmed 状态必有 confirm 历史 + confirmedAt 字段
  - withdrawn 状态必有 withdraw 历史

### 6️⃣ 交付顺滑
- 无构建步骤，`npm install` 一次 → `npm start` 即跑
- 前端原生 HTML，不依赖 Webpack/Vite
- 内置样本一键导入，接手同事 5 分钟跑通全流程
- 数据文件就是 4 个 JSON，可直接备份/迁移/用编辑器查看

---

## 🧪 测试样本覆盖场景
`batch_manual_correction.json` 共 6 条：

| ID | 场景 | 关键特征 |
|----|------|----------|
| rec_001_clean | 干净改判 | 旧模型 REST → 新 DAY，置信 62%→88%，特征变化明确 |
| rec_002_drift | **阈值漂移** | 置信 81%→58%（下降23%，超15%阈值），必触发人工确认 |
| rec_003_late_attachment | **晚到附件异常** | `hasLateAttachment=true`，入异常队列，状态=exception |
| rec_004_old_misjudge | **旧模型误判回放** | v1.8.0 误判 REST，v2.3.1 改 DAY，带加班审批等特征变化 |
| rec_005_low_confidence | 低置信度 + 需确认 | 置信仅 61%，育儿假冲突不明确 |
| rec_006_clean_confirm | 首次干净推荐 | 无旧模型对比，置信 94%，高可靠 |

---

## 🛠 参数调整
所有阈值在 `src/service.js` 顶部，可直接改：
```js
const CONFIDENCE_THRESHOLD = 0.75;   // 置信度阈值（低于则需人工）
const DRIFT_THRESHOLD = 0.15;        // 漂移阈值（绝对值差）
const MODEL_VERSION = 'v2.3.1';      // 新模型版本号
const OLD_MODEL_VERSION = 'v1.8.0';  // 旧模型版本号（对比用）
```
改完重启服务生效。

---

## ❓ FAQ
**Q: 数据放哪了？我要拷给别人。**  
A: 整个 `data/` 文件夹打包即可，里面 4 个 JSON 是全部状态。

**Q: 怎么清空重来？**  
A: 停服务 → 删除 `data/` 下 4 个 JSON（或整个 data 文件夹）→ 重启服务 → 重新导入。

**Q: 端口被占了怎么办？**  
A: `PORT=3200 npm start` 换端口。

**Q: 我要追加自己的样本？**  
A: 参考 `samples/batch_manual_correction.json` 格式，或在导入页「方式二」上传 JSON。

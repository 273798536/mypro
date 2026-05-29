# 债券久期拼图

金融投教互动网页游戏——将债券久期与利率变化做成可玩的拼图，而非让用户背公式。

## 快速启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 类型检查
npm run check

# 代码检查（零警告）
npm run lint -- --max-warnings=0
```

启动后访问 http://localhost:5173/ ，进入启动页。

## 造数（Mock 数据）

所有关卡和债券数据均在前端 mock，无需后端服务。

- **债券卡牌**：`src/data/bonds.ts`，定义 6 张债券（短/中/长久期各 2 张），每张包含久期、票面利率、到期时间、面值和现金流分布
- **关卡配置**：`src/data/levels.ts`，定义 3 个关卡：
  - 关卡 1「初识久期」：拖拽债券到久期槽位，120 秒限时
  - 关卡 2「曲线波动」：调整收益率曲线方向，180 秒限时
  - 关卡 3「现金流权重」：调整各期现金流权重判断，240 秒限时
- 每个关卡含 3 个学习知识点，结果页可展开查看

新增关卡或债券：在对应 ts 文件中追加数据即可，类型定义在 `src/types/index.ts`。

## 主要操作流程

### 1. 启动页 → 关卡选择
- 点击「开始游戏」进入关卡选择页
- 点击「玩法说明」查看操作方式和评分规则
- 页面刷新后自动检测未完成关卡，按钮文案切换为「继续游戏」

### 2. 游戏主页操作

| 操作 | 方式 | 反馈 |
|------|------|------|
| 债券拖拽 | 拖拽卡牌到久期槽位 | 正确：+30 分 + 绿色 toast；错误：-20 分 + 红色 toast + 错因提示 |
| 收益率曲线调整 | 点击「利率上升/平稳/利率下降」按钮 | 正确：+50 分；错误：-30 分 + 方向说明 |
| 现金流权重判断 | 点击债券卡牌 → 展开现金流面板 → 调整滑块 → 点击「确认」 | 平均偏差 <2.5%：+40 分；偏差 >10%：-20 分；中间区间：0~20 分 |
| 取出已放置债券 | 在槽位中点击「取出」 | 债券返回卡牌区，不影响得分 |
| 暂停 | 点击右上角暂停按钮 | 弹出暂停菜单，计时器停止 |

### 3. 关卡结束
- 所有债券放置完成或倒计时归零，自动进入结果页
- 结果页展示：星级评分、错因逐条说明、学习报告、操作回放时间轴

### 4. 操作回放
- 结果页「操作回放」面板：点击播放按钮自动逐条推进（每秒一步），点击暂停停止
- 可拖动进度条跳转到任意步骤
- 每步显示操作类型、时间、得分变化和正确/错误状态

## 异常路径

| 异常场景 | 检测逻辑 | 提示方式 | 是否写入 errors |
|----------|----------|----------|-----------------|
| 长短久期混放 | 债券久期不在槽位的 [min, max) 区间内 | 红色 toast + 槽位高亮 + 指向正确槽位 | ✅ 写入 `duration_mismatch` |
| 收益率曲线方向与关卡预期相反 | 玩家选择方向 ≠ 关卡 yieldCurve.direction | 红色 toast + 方向说明 | ✅ 写入 `curve_direction` |
| 现金流权重偏差过大 | 平均偏差 >5% 或单项偏差 >10% | 红色/info toast + 具体偏差数值 | ✅ 写入 `cashflow_weight` |
| 拖拽到非法区域 | DnD 的 over 目标非久期槽位 | 卡牌弹回原位 | ❌ 不写入 |
| 重复放置同一债券 | placedBonds 中已存在该 bondId | 红色 toast「该债券已放置」 | ❌ 不写入 |
| 关卡超时 | timeRemaining 降至 0 | 自动结束，进入结果页 | ❌ 不写入 |
| 页面刷新 | localStorage 保存当前状态 | 重新打开时检测未完成关卡 | — |

所有写入 `errors` 的错误记录都会出现在结果页的「错因说明」列表中，可展开查看详情和修正建议。

## 技术栈

- React 18 + TypeScript + Vite
- TailwindCSS 3 + 自定义主题色
- Zustand（状态管理）
- @dnd-kit/core（拖拽）
- Framer Motion（动画）
- Lucide React（图标）
- React Router v6（路由）

## 项目结构

```
src/
├── types/index.ts           # TypeScript 类型定义
├── data/                    # Mock 数据（债券 + 关卡）
├── utils/                   # 久期计算、评分计算、错误检测
├── store/gameStore.ts       # Zustand 全局状态
├── hooks/useGameTimer.ts    # 计时器 Hook
├── components/
│   ├── layout/              # Header、FeedbackToast
│   ├── game/                # BondCard、DurationSlot、YieldCurveChart、CashFlowTimeline
│   └── result/              # ScorePanel、ErrorList、LearningReport、ReplayTimeline
└── pages/                   # StartPage、LevelSelectPage、GamePage、ResultPage
```

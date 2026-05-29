# 音乐版权侦探局

一款面向音乐版权行业新人的推理训练游戏，通过沉浸式侦探角色扮演，帮助学习者区分翻唱、采样和背景音乐授权等核心概念，建立证据链思维。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:5173 (或附近端口) 启动。

### 3. 第一份歌曲片段样例位置

第一份歌曲片段样例数据位于：

[cases.ts](file:///Users/mac/pro/solo/workspaces/y11845/src/data/cases.ts#L1-L195) - **案件-001《午夜回声》**

你可以在 `src/data/cases.ts` 文件中找到所有示例案件数据，包括：
- 歌曲片段：`songClips` 数组
- 授权合同：`contracts` 数组
- 平台下架单：`takedownNotices` 数组

## 游戏特色

### 核心玩法

1. **三类材料来源**：从歌曲片段、授权合同、平台下架单中提取线索
2. **证据链构建**：钉选线索并建立关联，每条关联都会影响得分
3. **结论追溯**：每条结论都可追溯到具体的来源材料

### 关键功能

- **授权过期不自动通过**：合同过期状态会被特别标记，需要手动判定
- **错误类型单独筛选**：
  - `SAMPLE_UNDECLARED` - 采样未申报
  - `BGM_EXPIRED` - 授权过期
  - `NAME_CONFLICT` - 同名歌曲误判
- **案件回顾**：可查看：
  - 玩家在哪一步触发了线索关联
  - 每条关联对分数的影响
  - 合同判定为什么影响了得分

## 项目结构

```
src/
├── pages/
│   ├── HomePage.tsx      # 首页大厅 - 案件列表
│   ├── CasePage.tsx      # 案件调查 - 材料审阅与证据关联
│   ├── ReportPage.tsx    # 判定报告 - 分数与错误分析
│   └── ReviewPage.tsx    # 案件回顾 - 操作历史与影响分析
├── components/
│   ├── ClueCard.tsx      # 线索卡片
│   ├── MaterialCard.tsx  # 材料卡片（歌曲/合同/下架单）
│   ├── EvidenceBoard.tsx # 证据板
│   ├── ScoreRing.tsx     # 分数圆环
│   └── Timeline.tsx      # 操作时间线
├── store/
│   └── useGameStore.ts   # 游戏状态管理
├── data/
│   └── cases.ts          # 案件数据（含歌曲片段样例）
├── utils/
│   ├── scoringEngine.ts  # 评分引擎
│   └── evidenceValidator.ts  # 证据验证器
└── types/
    └── index.ts          # 类型定义
```

## 可用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run check    # TypeScript 类型检查
npm run lint     # ESLint 代码检查
```

## 游戏流程

1. 进入首页，选择一个案件开始调查
2. 查看歌曲片段、授权合同、平台下架单三类材料
3. 从材料中提取线索并"钉选到证据板"
4. 在证据板上点击两个线索建立关联
5. 完成证据链构建后，提交判定结论
6. 查看判定报告，了解得分详情
7. 进入案件回顾，追踪每一步操作的影响

## 技术栈

- **框架**：React 18 + TypeScript 5
- **构建工具**：Vite 6
- **状态管理**：Zustand
- **路由**：React Router DOM 6
- **样式**：Tailwind CSS 3
- **图标**：Lucide React

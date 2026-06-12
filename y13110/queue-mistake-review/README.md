# 排队窗口错题复盘系统

数学错题复盘工具，重点解决「单位换算偏差」、「晚到附件影响结论」、「结果跳变原因不明」三大痛点。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

启动后访问 http://localhost:5173/

## 项目结构

```
src/
├── components/       # UI组件
│   ├── Layout.tsx             # 页面布局
│   ├── StatusBadge.tsx        # 状态标签
│   ├── StatsOverview.tsx      # 统计概览
│   ├── FilterBar.tsx          # 筛选栏
│   ├── MistakeCard.tsx        # 错题卡片
│   ├── UnitCheckPanel.tsx     # 单位校验面板
│   ├── JumpAnalysisPanel.tsx  # 跳变分析面板
│   ├── AttachmentList.tsx     # 附件列表
│   ├── ManualConfirmPanel.tsx # 人工确认面板
│   ├── SourceInfoPanel.tsx    # 来源信息面板
│   └── ExportButton.tsx       # 导出按钮
├── pages/            # 页面
│   ├── MistakeListPage.tsx    # 错题列表页
│   └── MistakeDetailPage.tsx  # 错题详情页
├── hooks/            # 自定义Hook
│   └── useMistakeData.tsx     # 错题数据状态管理
├── utils/            # 工具函数
│   ├── unitEngine.ts          # 单位转换引擎
│   ├── jumpAnalysis.ts        # 跳变分析
│   ├── fieldMapping.ts        # 字段映射
│   └── export.ts              # 导出工具
├── types/            # TypeScript类型定义
│   └── index.ts
├── data/             # 数据
│   └── mockData.ts             # Mock演示数据
├── App.tsx           # 应用入口
├── main.tsx          # 渲染入口
└── index.css         # 全局样式
```

## 核心功能

### 1. 单位校验（重点）
- 自动检测公式单位、答案单位、学生答案单位是否缺失
- 识别同类单位的不匹配问题（如 m vs km）
- 提供换算关系提示和偏差估算
- 支持10大类单位：长度、质量、时间、面积、体积、速度、密度、压强、能量、功率

### 2. 晚到附件影响说明
- 明确区分正常附件和晚到附件
- 每份晚到附件标注影响说明
- 总体影响总结，讲清"一条晚到附件为什么影响结论"

### 3. 结果跳变分析
- 自动识别三种跳变因素：阈值/公式调整、单位变更、晚到附件
- 按影响程度排序，标注主要因素
- 提供跳变摘要，可直接用于报告

### 4. 历史数据字段兼容
- 自动映射新旧字段名（如"题目"→"questionContent"）
- 保留字段映射记录，来源可追溯
- 数据来源分类：手工录入、旧系统导入、新系统导入、接口同步

### 5. 人工确认机制
- 单位缺失或存疑时自动触发人工确认
- 明确说明「原因」和「下一步」
- 标注需要执行的具体动作

### 6. 导出功能
- 一键导出详情页为图片
- 页面状态与导出文件完全一致
- 文件名自动包含日期

## 处理状态说明

| 状态 | 说明 |
|------|------|
| 待处理 | 刚录入，未开始处理 |
| 单位校验中 | 正在进行单位一致性检查 |
| 待人工确认 | 单位问题或其他异常，需人工判断 |
| 处理中 | 人工处理中 |
| 已复盘 | 完成复盘分析 |
| 已完成 | 全部处理完毕 |
| 已归档 | 历史归档 |

## 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Vite 5
- **样式**: Tailwind CSS 3
- **路由**: React Router 6
- **导出**: html2canvas
- **日期**: dayjs

## 演示数据说明

当前使用 Mock 数据（共10条），覆盖各种典型场景：
- #1 火车过桥问题：单位不匹配 + 旧系统导入 + 待人工确认
- #2 密度计算：单位缺失 + 手工录入
- #3 功与功率：单位混淆（J vs W）
- #4 溶液浓度：晚到附件 + 结果跳变 + 已复盘
- #5 匀速运动：全对 + 已完成
- #6 压强计算：单位格式问题 + 晚到附件 + 结果跳变 + 待确认
- #7 比热容：单位换算 + 处理中
- #8 欧姆定律：单位缺失 + 待处理
- #9 杠杆平衡：已归档 + 旧系统导入
- #10 单位换算专项：全对 + 已复盘

## 对接真实数据

替换 `src/data/mockData.ts` 中的数据即可。数据格式参考 `src/types/index.ts` 中的 `MistakeRecord` 接口。

如果历史数据字段名不一致，可在 `src/utils/fieldMapping.ts` 中补充映射规则。

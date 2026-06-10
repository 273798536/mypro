## 1. 架构设计

```mermaid
flowchart LR
    subgraph "前端层 (React + Vite)"
        A["路由层 (React Router)"] --> B["页面组件层"]
        B --> B1["配平计算页"]
        B --> B2["实验记录追踪页"]
        B --> B3["批次报告复核页"]
        B --> B4["复测建议页"]
        B --> B5["学生只读视图"]
        B --> C["共享组件库"]
        C --> C1["纯度结果卡(带解释)"]
        C --> C2["温度曲线图(SVG)"]
        C --> C3["pH越界告警条"]
        C --> C4["版本对比器"]
        C --> C5["角色切换栏"]
        C --> C6["导出按钮"]
        D["状态管理层 (Context)"]
        D --> D1["批次数据Context"]
        D --> D2["角色权限Context"]
        E["工具函数层"]
        E --> E1["配平计算引擎"]
        E --> E2["防重复ID生成器"]
        E --> E3["导出器(CSV/PDF)"]
        E --> E4["示例数据注入器"]
    end
    subgraph "数据层 (LocalStorage + Mock)"
        F["批次数据 Store"]
        G["版本历史 Store"]
        H["角色配置 Store"]
    end
    A --> D
    D --> F
    D --> G
    D --> H
    B --> E
```

## 2. 技术说明
- **前端框架**：React@18 + React Router@6 + Vite@5
- **样式方案**：Tailwind CSS@3 + CSS 自定义属性（主题变量）
- **状态管理**：React Context（轻量，避免过度工程）
- **数据持久化**：LocalStorage（模拟后端，首次加载自动注入示例数据）
- **图表方案**：原生 SVG 绘制温度曲线（无需额外图表库，保持轻量）
- **导出方案**：CSV 原生生成 + 浏览器打印为 PDF（界面一致）
- **字体资源**：Google Fonts 外链加载 DM Serif Display + Noto Sans SC

## 3. 路由定义
| 路由 | 页面 | 角色权限 |
|------|------|----------|
| `/` | 首页仪表盘（快捷入口 + 统计） | 全部 |
| `/balance` | 配平计算页（日常入口） | 环境监测员、老师 |
| `/records` | 实验记录追踪页 | 全部（学生仅见已发布） |
| `/review/:batchId` | 批次报告复核页 | 环境监测员、老师 |
| `/retest` | 复测建议页（月底/课前入口） | 环境监测员、老师 |
| `/student/:batchId` | 学生只读视图 | 学生（也可老师切换查看） |

## 4. 数据模型

### 4.1 ER 图

```mermaid
erDiagram
    BATCH ||--o{ VERSION : "拥有多个版本"
    BATCH ||--o{ RECORD : "包含多条实验记录"
    BATCH ||--o{ TEMPERATURE : "拥有温度曲线点"
    BATCH ||--o{ PH_LOG : "拥有pH记录点"
    BATCH ||--o{ RETEST : "可能产生复测建议"

    BATCH {
        string batchId PK "批次号(防重复唯一键)"
        string solventType "溶剂类型"
        float initialAmount "初始量(L)"
        float targetPurity "目标纯度(%)"
        string status "草稿/复核中/已发布/需复测"
        string createdBy "创建人角色"
        date createdAt "创建时间"
    }

    VERSION {
        string versionId PK "版本ID"
        string batchId FK "批次号"
        int versionNum "版本号(1,2,3...)"
        float purityResult "纯度结果(%)"
        string explanation "结果解释(1-2句)"
        string reactionConditions "反应条件摘要(JSON)"
        string modifiedBy "修改人"
        date modifiedAt "修改时间"
        string changeNote "修改说明"
        boolean isPublished "是否已发布"
    }

    RECORD {
        string recordId PK "记录ID"
        string batchId FK "批次号"
        string stepName "步骤名(如:回流/蒸馏/冷却)"
        float value "数值"
        string unit "单位"
        string note "备注"
    }

    TEMPERATURE {
        string tempId PK "温度点ID"
        string batchId FK "批次号"
        int timeMin "时间(分钟)"
        float tempC "温度(°C)"
    }

    PH_LOG {
        string phId PK "pH记录ID"
        string batchId FK "批次号"
        int timeMin "时间(分钟)"
        float phValue "pH值"
        boolean isOutOfRange "是否越界"
    }

    RETEST {
        string retestId PK "建议ID"
        string batchId FK "批次号"
        string reason "原因类别"
        string description "具体原因描述"
        string action "可操作建议步骤"
        string priority "高/中/低"
        boolean resolved "是否已处理"
    }
```

### 4.2 防重复机制
- **批次号生成规则**：`SOL-{溶剂缩写}-{YYYYMMDD}-{序号3位}`，如 `SOL-ETOH-20260610-001`
- **去重逻辑**：新建批次时校验 (溶剂类型 + 日期 + 初始量 + 目标纯度) 组合，若存在则提示"此条件已有批次 XXXX，是否查看？"而非重复创建
- **版本防冲突**：修改时基于 `versionNum` 乐观锁，若版本号不匹配则提示"已有新版本，请先查看最新内容"

### 4.3 初始示例数据
首次加载自动注入 3 个完整批次：
1. **批次 SOL-ETOH-20260608-001**：乙醇回收，纯度 96.2% ✅ 已发布（正常案例）
2. **批次 SOL-ACE-20260609-001**：丙酮回收，纯度 91.5% ⚠️ pH越界（异常案例，需讲解）
3. **批次 SOL-MEOH-20260610-001**：甲醇回收，纯度 88.7% 🔄 待复测（复测案例）

每个批次含：反应条件 5 条、温度曲线 12 个点、pH 记录 8 个点、版本历史 2 条、复测建议 1 条。

## 5. 核心业务规则

| 规则编号 | 规则内容 | 触发场景 |
|----------|----------|----------|
| R1 | 配平计算缺参数时，提示"缺少XX参数，请补充"（如"缺少回流温度，无法计算理论回收率"）而非抛出内部错误 | 配平计算表单提交 |
| R2 | 任何纯度结果必须附带 1-2 句专业解释，为空时禁止提交并提示 | 实验记录保存 |
| R3 | 修改批次报告必须填写修改说明，自动生成新版本，旧版只读不可删除 | 复核页保存修改 |
| R4 | 导出内容的状态标签、纯度数值、解释文字必须与界面当前显示完全一致 | 点击导出按钮 |
| R5 | 学生视图仅展示 `isPublished=true` 的最新版本，不提供版本切换入口 | 学生角色访问 |
| R6 | 同轮复核必须同时显示反应条件、温度曲线、pH越界三要素，缺一则页头告警 | 打开复核页 |
| R7 | 复测建议必须包含可操作的具体步骤（如"补测蒸馏30分钟、45分钟、60分钟温度点"） | 生成复测建议 |

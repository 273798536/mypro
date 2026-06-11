# 病毒引物覆盖检查工具 (Virus Primer Coverage Checker)

一款面向生信分析师和实验室质控组的专业分析工具，用于在更换病毒参考序列后，快速评估旧引物清单的可用性，辅助制定扩增方案。

## ✨ 核心功能

| 功能模块 | 说明 |
|---------|------|
| **数据导入** | 支持 FASTA 参考序列、CSV 引物清单、CSV/VCF 突变位点拖拽上传 |
| **引物覆盖分析** | 自动计算每对引物的结合位点和扩增区间，统计全基因组覆盖度 |
| **突变影响评估** | 检测 3' 端关键区域错配，按严重程度分级并给出使用建议 |
| **异常检测** | 反向引物写反检测、序列含 N 碱基标记、同名引物不同批次识别 |
| **可视化看板** | 全基因组覆盖轨道图谱、覆盖深度图、引物详情序列对齐视图 |
| **报告导出** | 导出实验员友好的 PDF、Excel 和 CSV 格式报告 |
| **数据去重** | 基于内容哈希的引物去重和分析结果缓存，避免重复导入 |

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 在浏览器中打开提示的地址（通常是 http://localhost:5173）
```

### 其他命令

```bash
# 生产环境构建
npm run build

# 预览构建结果
npm run preview

# TypeScript 类型检查
npm run check

# ESLint 代码检查
npm run lint
```

## 📖 使用指南

### 快速体验（使用样例数据）

1. 启动应用后，点击左侧导航栏的「**数据导入**」
2. 点击页面右上角的「**加载样例数据**」按钮
3. 系统将自动加载内置的参考序列、引物清单和突变位点并执行分析
4. 跳转到「**分析看板**」查看结果

### 标准工作流程

```
1. 导入参考序列 (FASTA)
        ↓
2. 导入引物清单 (CSV)
        ↓
3. 导入样本突变位点 (CSV/VCF)
        ↓
4. 设置分析参数（退火温度范围、3'端关键碱基数等）
        ↓
5. 点击「开始分析」
        ↓
6. 在「分析看板」查看覆盖图谱和明细
        ↓
7. 在「异常检测」处理问题引物
        ↓
8. 在「报告导出」生成扩增方案建议
```

## 📄 输入文件格式

### 1. 参考序列 (FASTA)

```fasta
>Reference_Name|Description
ATGCGTACGTAGCTAGCTGATCGATCGTAGCTAGCTAGCTAGCTAGCTAGCTAGC
TAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA
...
```

### 2. 引物清单 (CSV)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 引物对名称 |
| `batch` | string | ❌ | 批次号（用于区分同名不同批次） |
| `forward_sequence` | string | ✅ | 正向引物序列 (5'→3') |
| `reverse_sequence` | string | ✅ | 反向引物序列 (5'→3') |
| `forward_tm` | number | ❌ | 正向引物 Tm 值（不填则自动计算） |
| `reverse_tm` | number | ❌ | 反向引物 Tm 值（不填则自动计算） |

**示例：**
```csv
name,batch,forward_sequence,reverse_sequence,forward_tm,reverse_tm
PRIMER_001,B20240101,ATGCGTACGTAGCTAGCTGA,TCAGCTAGCTACGTACGCAT,58.2,57.8
PRIMER_002,B20240101,GCTAGCTAGCTAGCTAGCTA,TAGCTAGCTAGCTAGCTAGC,59.5,59.1
```

### 3. 突变位点 (CSV)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sample_name` | string | ✅ | 样本名称/编号 |
| `position` | integer | ✅ | 突变位置（1-based，相对于参考序列） |
| `ref_base` | string | ✅ | 参考碱基 (A/T/C/G) |
| `alt_base` | string | ✅ | 变异碱基 (A/T/C/G) |
| `quality` | number | ❌ | 测序质量值 |
| `allele_frequency` | number | ❌ | 等位基因频率 (0~1) |

**示例：**
```csv
sample_name,position,ref_base,alt_base,quality,allele_frequency
SAMPLE_A,125,T,C,320.5,0.85
SAMPLE_A,287,G,A,298.3,0.72
SAMPLE_B,456,A,T,410.8,0.91
```

## 🧪 样例数据说明

内置样例数据位于 `src/data/` 目录，包含精心设计的测试场景：

| 文件 | 内容 | 包含的测试场景 |
|------|------|-------------|
| `sample_reference.fasta` | 约 3000bp 模拟冠状病毒序列 | - |
| `sample_primers.csv` | 11 对引物 | ✅ 含 N 碱基引物<br>✅ 同名不同批次引物<br>✅ Tm 值越界<br>✅ 反向引物写反 |
| `sample_mutations.csv` | 14 个突变（4 个样本） | ✅ 3' 端关键区域错配<br>✅ 样本间重叠突变<br>✅ 转换和颠换类型 |

## 🏗️ 技术架构

```
前端框架:    React 18 + TypeScript 5
构建工具:    Vite 6
样式方案:    TailwindCSS 3 + 自定义科研风主题
状态管理:    Zustand 5
可视化:      React + SVG（自定义） + D3.js scale
文件处理:    纯前端解析（FASTA/CSV/VCF）
报告导出:    jsPDF + SheetJS (xlsx)
图标:        Lucide React
```

### 项目结构

```
src/
├── components/           # 组件
│   ├── ui/              # 基础UI组件 (Button, Card, Table...)
│   ├── coverage/        # 覆盖图谱可视化组件
│   └── Layout.tsx       # 应用布局（侧边栏+顶部栏）
├── pages/               # 页面
│   ├── ImportPage.tsx   # 数据导入
│   ├── DashboardPage.tsx# 分析看板
│   ├── AnomaliesPage.tsx# 异常检测
│   └── ReportPage.tsx   # 报告导出
├── store/               # 状态管理
│   └── analysisStore.ts # Zustand Store
├── lib/                 # 核心算法库
│   ├── bio/             # 生物信息学算法
│   │   ├── alignment.ts # 序列比对 (Smith-Waterman)
│   │   ├── primer.ts    # 引物分析与覆盖度
│   │   ├── mutation.ts  # 突变影响评估
│   │   └── tm.ts        # Tm值计算 (最近邻法)
│   ├── parsers/         # 文件解析器
│   │   ├── fasta.ts     # FASTA 解析
│   │   ├── csv.ts       # CSV 解析
│   │   └── vcf.ts       # VCF 解析
│   ├── exporters/       # 报告导出
│   │   ├── pdf.ts       # PDF 导出
│   │   └── excel.ts     # Excel 导出
│   └── utils/           # 工具函数
│       ├── types.ts     # TypeScript 类型定义
│       ├── sequence.ts  # 序列处理工具
│       └── hash.ts      # 哈希与去重
├── data/                # 样例数据
├── App.tsx              # 应用入口（路由）
├── main.tsx             # React 挂载
└── index.css            # 全局样式
```

## 🧬 核心算法说明

### 1. Tm 值计算

采用**最近邻热力学法 (Nearest-Neighbor)**：

$$T_m = \frac{\Delta H}{A + \Delta S + R \ln(\frac{C}{4})} + 16.6 \log_{10}[Na^+] - 273.15$$

短序列或含 N 碱基时回退至 %GC 简化公式。

### 2. 序列比对

使用改良的 **Smith-Waterman** 局部比对算法，针对引物短序列优化：
- 种子扩展加速（先匹配 10bp 完美种子）
- N 碱基按通配符处理（匹配但降低得分）
- 自动检测反向互补结合

### 3. 3' 端错配分级

| 级别 | 判定标准 | 建议 |
|------|---------|------|
| **Critical** | 距 3' 端 ≤ 5bp | 🔴 必须更换引物 |
| **High** | 距 3' 端 6-10bp 且为颠换 | 🟠 谨慎使用，建议备用 |
| **Medium** | 距 3' 端 6-10bp 且为转换 | 🟡 评估后可用 |
| **Low** | 距 3' 端 > 10bp | 🟢 通常可正常使用 |

### 4. 去重策略

- **引物级**：`SHA256(name + sequence + direction + batch)` 指纹
- **文件级**：文件内容 SHA-256 哈希 → 分析结果缓存
- 重复导入同一批数据直接返回缓存结果

## 🔬 异常检测规则

| 异常类型 | 检测规则 | 严重程度 |
|---------|---------|---------|
| 反向引物写反 | 反向引物 = 正向引物的直接反向（非反向互补） | 🔴 Error |
| 含 N 碱基 | 序列中存在 A/T/C/G 以外的不确定碱基 | 🟡 Warning |
| 同名不同批次 | 引物名称相同但批次号或序列不同 | ℹ️ Info |
| Tm 值越界 | Tm 超出设置的退火温度范围 | 🟡 Warning |

## 📝 注意事项

1. **数据安全**：所有分析均在浏览器本地完成，数据不会上传到任何服务器
2. **大序列处理**：大于 100kb 的参考序列可能会导致浏览器卡顿，建议分段分析
3. **突变位置**：输入的突变位置应为 **1-based**（即第一个碱基为位置 1）
4. **引物方向**：所有引物序列请按 **5' → 3'** 方向填写

## 📄 许可证

仅供内部实验室使用。

# 电池内阻误差归因分析工具

面向维修师傅和排班同事的现场数据归因工具。解决的核心问题：

- 导入现场旧材料（JSON / 现场照片 / 手动录入）
- 混入边界样本并讲清楚「为什么这条边界样本影响结论」
- 采样缺口单独拎出，不揉进正常结果
- 双参数组对照，中间计算过程（公式 + 单位换算 + 代入过程）不藏
- 人工确认前后变化进历史记录，评审会前可复盘
- 一键导出 HTML 报告 / PNG 截图 / JSON 快照，方便归档或发群

---

## 一、环境与安装

> 要求 Node ≥ 18（推荐 20 LTS）

```bash
# 1. 安装依赖
npm install
# 国内慢可用：
# npm install --registry=https://registry.npmmirror.com

# 2. 校验依赖装齐（应该能看到 html2canvas、zustand、lucide-react、react-router-dom）
npm ls html2canvas zustand lucide-react react-router-dom
```

依赖清单（核心）：

| 包 | 用途 |
|----|------|
| `react@18` + `react-dom` | 页面运行时 |
| `react-router-dom@7` | 路由（当前单页）|
| `zustand@5` | 全局状态（样本、参数、历史、操作人）|
| `lucide-react` | 图标 |
| `tailwindcss@3` + `autoprefixer` + `postcss` | 样式 |
| `html2canvas` | 主内容区 PNG 截图导出 |
| `vite@6` + `typescript@5.8` | 构建工具链 |

---

## 二、启动与常用命令

```bash
# 开发模式（热更新，默认 http://localhost:5173）
npm run dev

# 类型检查（只检查不产出）
npm run check

# 生产构建（先 tsc 再 vite build，产物在 dist/）
npm run build

# 本地预览生产构建
npm run preview
```

---

## 三、关键数据格式（导入 / 导出）

### 3.1 样本 JSON 导入格式

工具支持三种 JSON 形态，都能识别：

```jsonc
// 形态 1：根节点直接是数组（最常用）
[
  {
    "id": "demo-001",
    "name": "电池组示例-A",
    "type": "normal",
    "internalResistance": 3.15,
    "temperature": 26,
    "soc": 78,
    "testTime": "2026-06-15 10:20",
    "notes": "现场备注，可省略",
    "photoUrl": "可选，不填使用默认图",
    "gapReason": "type=gap 时建议填"
  }
]

// 形态 2：根节点为对象（可同时带参数组）
{
  "formatVersion": "1.0",
  "samples": [ /* ...同上数组... */ ],
  "parameterSets": [ /* 可选，见 3.2 */ ]
}

// 形态 3：单对象（单条快速导入）
{ "name": "单条样本", "internalResistance": 3.2, "temperature": 25, "soc": 80 }
```

**字段说明**：

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `name` | 是 | string | 样本名 |
| `internalResistance` | 是 | number | 实测内阻，单位 mΩ，必须 > 0 |
| `temperature` | 是 | number | 环境温度，°C |
| `soc` | 是 | number | 荷电状态 0~100，自动截断 |
| `type` | 否 | `normal \| boundary \| gap` | 不填时根据数值自动推断 |
| `id` | 否 | string | 不填自动生成；与已存在样本重复时自动跳过 |
| `testTime` | 否 | string | 不填取当前时间 |
| `notes` | 否 | string | 现场备注 |
| `gapReason` | 否 | string | type=gap 时的缺口原因 |
| `photoUrl` | 否 | string | 图片 URL 或 data:base64 |

> 💡 不知道怎么填？打开工具后点顶部「导入」→ JSON Tab → **下载导入模板**，里面含正常/边界/缺口三种示例。

### 3.2 参数组 JSON 格式（可选）

可随样本 JSON 一起导入，工具会自动识别根节点下的 `parameterSets` 字段：

```jsonc
{
  "parameterSets": [
    {
      "id": "p-v3",
      "name": "现场严选参数",
      "version": "v3.1",
      "baseResistance": 2.8,
      "baseTemperature": 25,
      "baseSoc": 80,
      "temperatureCoefficient": 0.025,
      "socCorrectionFactor": 0.008,
      "tolerance": 0.5,
      "updatedAt": "2026-06-18"
    }
  ]
}
```

### 3.3 照片上传

- 支持 `.jpg / .jpeg / .png / .webp` 等常见格式
- 多张可一次性拖入
- 图片会转成 **Base64** 嵌入样本（避免跨域）
- 照片导入后内阻/温度/SOC 会用默认值，到样本卡片再手动校正

### 3.4 手动录入

「导入」对话框 → 手动录入 Tab，直接填表单即可，支持「保存并继续录入」。

---

## 四、核心归因算法（中间过程透明）

```
总误差 = 实测内阻 − 基准内阻
  ├─ 温度误差  = (实测温度 − 基准温度) × 温度系数
  ├─ SOC 误差   = 基准内阻 × SOC修正系数 × (实测SOC − 基准SOC) / 100
  └─ 其他误差   = 总误差 − 温度误差 − SOC误差

误差率 = 总误差 / 基准内阻 × 100%
```

- 所有单位：内阻 **mΩ**，温度 **°C**，SOC **%**
- 在误差分解面板中点开每一项可看到**公式 + 单位换算说明 + 代入数值后的完整计算过程**

---

## 五、评审会前的推荐操作流程

对应原始目标「先导入旧材料 → 再补边界样本 → 最后看截图说明变化」：

```
1. 启动
   npm run dev → 浏览器打开 http://localhost:5173

2. 导入旧材料
   顶栏「导入」→ 选 JSON / 照片 / 手动录入
   → 核对下方 warning 列表（红=跳过，黄=兜底默认值）
   → 右栏历史时间线可看到 "导入旧材料：导入 N 组样本"

3. 补边界样本
   顶栏中间有「三步走」进度条 → 点第 2 步「补边界样本」
   或左侧样本列表底部点「补充边界样本」
   → 选中边界样本 → 点「查看影响分析」看三步传导路径

4. 双参数对照
   右栏参数版本 → 打开「对照模式」
   → 左右并排两组参数归因结果，差异一目了然

5. 人工确认
   右栏历史时间线 → 「确认版本」
   → 操作人、时间、误差快照都会写入历史

6. 导出复盘材料
   顶栏「导出报告」→ 根据场景选：
   ├─ HTML 报告（评审会投屏/打印，最完整）
   ├─ 主内容区 PNG 截图（发群快速说明）
   ├─ 报告快照 JSON（归档，可完整还原现场）
   ├─ 样本 JSON（可再次导入）
   └─ 打印 / PDF（浏览器打印对话框）
```

---

## 六、常见阻断点自检

如果启动或使用时遇到问题，先按这个顺序核：

| 现象 | 排查命令 / 方法 | 预期结果 |
|------|-----------------|----------|
| `npm run dev` 打不开 | `node -v` | ≥ 18 |
| 依赖报错 | `npm install` 再试一次，或删 `node_modules` 后重装 | 无 ERR 行 |
| 类型报错 | `npm run check` | 0 errors |
| 构建失败 | `npm run build` | 输出 `✓ built in ...s` |
| 页面 404 空白 | 打开 DevTools Console，看是否有 JS 报错 | 无红色错误 |
| 导入 JSON 后没反应 | 对话框底部查看 warning/error 列表 | 红色 error 说明跳过原因 |
| PNG 截图导不出 | 样本照片来自外网 URL 时可能因跨域污染 canvas；换成**本地照片上传**即可，或导出 HTML 报告再截图 | 成功下载 PNG |
| 刷新后历史没了 | 当前版本**内存态**，未持久化。需长期保留请用「导出历史记录 JSON」 | 导出成功即可 |

---

## 七、目录结构

```
src/
├── components/
│   ├── ImportDialog.tsx       # 导入对话框（JSON/照片/手动）
│   ├── ExportPanel.tsx        # 导出面板（6 种格式）
│   ├── SampleList.tsx         # 左侧样本列表
│   ├── ErrorBreakdown.tsx     # 中间误差分解（可展开计算过程）
│   ├── ParamCompare.tsx       # 右栏参数对照
│   ├── HistoryTimeline.tsx    # 右栏变更历史
│   ├── GapSection.tsx         # 采样缺口专区
│   └── BoundaryDetailModal.tsx # 边界样本影响分析弹窗
├── pages/
│   └── AnalysisPage.tsx       # 主页面（三栏布局+顶栏）
├── store/
│   └── useAppStore.ts         # Zustand 全局状态
├── data/
│   └── mockData.ts            # 预置的现场样本和参数组
├── utils/
│   ├── calculator.ts          # 归因计算
│   ├── fileIO.ts              # 导入解析 + 字段校验
│   └── exporter.ts            # 导出（HTML/JSON/PNG/打印）
├── types/
│   └── index.ts               # TypeScript 类型定义
├── App.tsx
├── main.tsx
└── index.css
```

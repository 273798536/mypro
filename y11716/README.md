# 浮力密度判定系统

批量判断学生实验浮沉结论是否合理的命令行工具。

## 快速开始

### 1. 生成测试数据

```bash
python3 generate_samples.py
```

会在 `sample_data/` 目录生成以下文件：
- `sample_all.csv` / `sample_all.json` - 包含20条完整测试样例（含各种错误类型）
- `sample_normal.csv` / `sample_normal.json` - 仅含5条正常样例

### 2. 启动系统

**交互式模式**（推荐首次使用）：
```bash
python3 main.py
```

**批量处理模式**（一步到位）：
```bash
python3 main.py -i sample_data/sample_all.csv -o output/ -f both
```

### 3. 交互式操作流程

```
┌─────────────────────────────────────────────────┐
│  浮力密度判定系统                                  │
└─────────────────────────────────────────────────┘

操作菜单:
  1. 导入数据文件          ← 第一步
  2. 显示数据概览
  3. 执行浮力计算          ← 第二步
  4. 显示异常检测结果      ← 第三步
  5. 导出报告 (CSV)       ← 第四步
  6. 导出报告 (JSON)
  7. 显示支持的单位列表
  0. 退出
```

## 数据格式要求

### CSV/JSON 必填字段

| 字段名 | 说明 | 示例 |
|--------|------|------|
| `sample_id` | 样本编号 | S001 |
| `mass` | 物体质量 | 10 |
| `mass_unit` | 质量单位 | g |
| `volume` | 物体体积 | 20 |
| `volume_unit` | 体积单位 | cm³ |
| `liquid_density` | 液体密度 | 1.0 |
| `liquid_density_unit` | 密度单位 | g/cm³ |
| `observed_state` | 观察到的浮沉状态 | 漂浮 |

### 支持的单位

**质量单位**：g, kg, mg, t

**体积单位**：cm³, m³, mL, L, dm³

**密度单位**：g/cm³, kg/m³, g/mL, kg/L

### 支持的浮沉状态

漂浮、悬浮、下沉、上浮、漂浮/悬浮、下沉/悬浮

## 异常类型说明

| 类型 | 严重程度 | 说明 |
|------|----------|------|
| UNIT_ERROR | 高 | 单位不识别，如中文"克"或格式错误 |
| MISSING_VOLUME | 高 | 体积值或单位缺失 |
| FORMAT_ERROR | 高 | 数值格式错误（如"abc"）或负值 |
| STATE_INCONSISTENT | 高 | 记录状态与计算结果明显不符 |
| CRITICAL_STATE | 中 | 物体密度接近液体密度（≤2%） |
| MISSING_FIELD | 高 | 必填字段为空 |
| VALUE_ERROR | 高 | 数值为零或负数 |

## 命令行参数

```bash
python3 main.py [选项]

选项:
  -i, --input FILE     输入数据文件 (CSV/JSON)
  -o, --output-dir DIR  报告输出目录 (默认: ./output)
  -f, --format FMT     导出格式: csv, json, both (默认: both)
  --cli                强制交互式模式
```

## 异常路径处理

### 情况1：单位错误
```
样本 U001 (行 8):
  【高】单位换算错误: 无效的质量单位: 克
  → 修正：将"克"改为"g"
```

### 情况2：体积缺失
```
样本 M001 (行 11):
  【高】体积数据缺失: 体积数据缺失: volume 为空或未提供
  → 修正：补充体积数据
```

### 情况3：临界状态
```
样本 C001 (行 5):
  【中】临界浮沉状态: 物体密度 (0.99 g/cm³) 与液体密度 (1.0 g/cm³) 接近
  → 建议：重复实验确认
```

### 情况4：记录不符
```
样本 I001 (行 14):
  【高】浮沉记录与计算不符: 记录状态 '漂浮' 与计算状态 '下沉' 明显不符
  → 建议：检查实验操作
```

## 输出文件

### CSV报告
- 文件名：`buoyancy_report_YYYYMMDD_HHMMSS.csv`
- 包含：原始数据、计算结果、异常标记、修正建议

### JSON报告
- 文件名：`buoyancy_report_YYYYMMDD_HHMMSS.json`
- 包含：完整处理结果、异常统计、修正建议

## 核心算法

1. **单位标准化**：所有单位转换为标准单位（g, cm³, g/cm³）
2. **密度计算**：物体密度 = 质量 / 体积
3. **浮沉判定**：
   - 物体密度 < 液体密度 × 0.9 → 漂浮
   - 物体密度 ≈ 液体密度（差≤2%）→ 悬浮（临界）
   - 物体密度 > 液体密度 × 1.1 → 下沉
   - 中间区域 → 边界状态
4. **一致性检查**：记录状态与计算状态对比

## 项目结构

```
.
├── main.py                 # CLI主程序
├── generate_samples.py     # 测试数据生成器
├── buoyancy/               # 核心模块
│   ├── unit_converter.py   # 单位转换
│   ├── validator.py        # 数据验证
│   ├── calculator.py       # 浮力计算
│   ├── anomaly_detector.py # 异常检测
│   └── report_generator.py # 报告生成
├── sample_data/            # 测试数据
└── output/                 # 输出报告
```

# 整数规划批量验算系统

> 早会彩排专用 · 建模助教小岑团队维护

---

## 🚀 快速开始（先跑这条命令）

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 运行完整演示（现场会收到的材料都在这里了）
python cli.py demo

# 3. 先看这份截图说明
#    → 打开 examples/ 目录，按顺序查看:
#      ① executive_summary_*.txt    - 执行摘要（给领导看的）
#      ② status_overview_*.png       - 状态概览图（彩排用）
#      ③ audit_trail_*.txt           - 小岑的修改历史
#      ④ details/*_trace.txt         - 异常记录追溯
```

---

## 📦 包里装了什么（现场会收到的材料）

```
├── data/                          ← 模拟现场材料
│   ├── draft_reviewer_A.csv       ← 复核人A草稿（字段名：工程量、单价、合价）
│   ├── draft_reviewer_B.csv       ← 复核人B草稿（字段名：数量、综合单价、总价）
│   ├── draft_manual_entry.csv     ← 小岑手动录入
│   ├── system_export.csv          ← ERP系统导出
│   └── boundary_cases.csv         ← 边界测试小样例（除零、负值、空值等）
├── examples/                      ← 报告输出目录
│   ├── executive_summary_*.txt    ← 执行摘要
│   ├── status_overview_*.png      ← 状态分布图
│   ├── comparison_*.png           ← 数值对比图
│   ├── audit_trail_*.txt          ← 审计历史报告
│   ├── audit_history_*.csv        ← 审计历史表格
│   ├── verification_results_*.csv ← 验算结果
│   └── details/                   ← 逐条计算草稿追溯
│       └── *_trace.txt
├── src/ip_checker/
│   ├── models.py                  ← 数据模型
│   ├── unit_system.py             ← 单位换算系统 ✅ 解决"单位一换就偏"
│   ├── field_mapper.py            ← 字段映射管理器 ✅ 解决"字段名前后不一"
│   ├── calculation_spec.py        ← 计算口径管理 ✅ 保住"来源和处理状态"
│   ├── verification_engine.py     ← 批量验算引擎 ✅ 处理"除零边界"等异常
│   ├── audit_trail.py             ← 审计历史系统 ✅ 留住"小岑改过的判断"
│   ├── report_generator.py        ← 报告生成器 ✅ 图表服务复核
│   └── pipeline.py                ← 完整流水线
├── tests/
│   └── test_core_features.py      ← 单元测试
├── cli.py                         ← 命令行入口
└── requirements.txt
```

---

## 🎯 核心特性

### 1. ✅ 单位换算自动处理
- 公式对了但单位一换就偏？**自动换算，标记量纲不一致**
- 支持：元 ↔ 万元 ↔ 亿元，千克 ↔ 吨 ↔ 斤，等等
- 每笔转换都留痕，可追溯

### 2. ✅ 字段名不一致自动映射
- 复核人A写"工程量"，复核人B写"数量"，系统导出"单位元"
- **自动映射到标准字段**，保住来源信息（`_src_xxx` 字段）
- 未映射字段保留原名，加前缀 `_unmapped_`

### 3. ✅ 除零边界等异常特殊标记
- 分母为0、接近0、负值、空值 → **标记为【异常】而非【失败】**
- 处理结果不会写得像正常通过
- 异常类型清晰标注：除零异常、空值异常、负值异常、单位转换异常...

### 4. ✅ 计算草稿完整追溯
- 点到异常时，能回到计算草稿和这次计算口径
- 每条记录生成 `details/{record_id}_trace.txt`
- 包含：原始输入 → 单位转换 → 每步计算 → 结果比对 → 最终判定
- 数字从哪来，线索清晰

### 5. ✅ 小岑的修改都留在历史里
- 临时调过容差？改过公式？调整过判断？
- **审计日志全部记录**，下一班不会只看到最终结果
- 支持按操作人、按记录、按字段查询历史
- 生成时间线报告，给不看代码的人也能讲清楚

### 6. ✅ 图表服务复核
- 状态分布柱状图、饼图
- 异常类型分布
- 各来源状态对比
- 计算值 vs 期望值对比（标注偏差）

---

## 📖 常用命令

```bash
# 完整演示（推荐先跑这个）
python cli.py demo

# 验算指定文件
python cli.py verify data/draft_reviewer_A.csv -s A
python cli.py verify data/*.csv -s A -f F001,F002

# 查看指定记录的追溯
python cli.py trace <record_id>

# 查看审计历史
python cli.py audit

# 列出计算规则
python cli.py list-rules

# 列出支持的单位
python cli.py list-units

# 运行测试
python cli.py test
```

---

## 🔍 异常追溯示例

当你看到一条标记为【异常】的记录：
1. 记下 `record_id`（如 `a1b2c3d4e5`）
2. 打开 `examples/details/a1b2c3d4e5_trace.txt`
3. 你会看到：
   ```
   【本次计算口径】
     计算时间: ...
     复核人: 小岑
     假设条件: {'税率默认': '13%', '容差设置': '2%'}
   
   【计算步骤追溯】
     步骤1: 读取原始输入
     步骤2: 检查字段 quantity(工程量) → 除零异常：分母为0
     ...
   
   【验算结果】
     状态: 【异常】
     异常类型: 公式计算异常
   ```

---

## 📝 给不看代码的人讲的版本

> "这系统帮我们做三件事：
>
> 1. **自动算账**：把各复核人交来的不同格式表格统一口径，自动算一遍
> 2. **盯着异常**：除以零、单位错、数字对不上，都会标红，不会混在正常结果里
> 3. **留好证据**：谁改过、什么时候改的、为什么改，都有记录。算出来的每一个数，都能一步步查回去是从哪个原始数据来的。
>
> 这样早会时就不用再卡在'单位怎么又错了'、'上次谁改的'这类问题上。"

---

## 🧪 运行测试

```bash
python cli.py test
# 或者
pytest -v tests/
```

---

## 📄 License

内部使用 · 建模助教小岑团队

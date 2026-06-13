# 🌊 海浪浮标报告导出系统

> 项目助理小宋专用：3步搞定报告导出

---

## 🚀 快速开始（小宋看这里）

### 第1步：安装依赖
```bash
pip install -e .
```

### 第2步：放样例数据（现场材料包）
```bash
buoy-report sample
```
会在 `./data/` 目录生成：
- 浮标数据CSV（含故意设置的重复数据和极端值）
- 维修备注JSON（含版本更新，验证不会无声覆盖）
- 参数配置文件
- `field_kit/` 现场材料包（照片、检测表等）

### 第3步：导出报告
```bash
buoy-report export
```
会在 `./output/` 目录生成3个文件：
| 文件 | 说明 | 小宋看哪个 |
|------|------|-----------|
| `BUOY-YYYYMMDD-XXXXXX.html` | 完整HTML报告 | ✅ 主要交付物 |
| `BUOY-YYYYMMDD-XXXXXX_data.xlsx` | Excel数据表 | 需要筛选时看 |
| `BUOY-YYYYMMDD-XXXXXX_api_response.json` | 接口返回 | 🔍 调试时看 |

---

## 🔍 常用操作

### 查看接口返回
```bash
buoy-report inspect BUOY-20260613-XXXXXX
```
加 `--full` 看完整JSON。

### 参数调一档复算
```bash
# 看所有可调选项
buoy-report rerun --list

# 调低浪高阈值后重跑
buoy-report rerun --adjustment "浪高阈值 -0.5m"
```
报告里会显示：公式、单位、边界样本为什么让结果变了。

### 带自定义参数跑
```bash
buoy-report export --params ./data/params_default.json
```

---

## ⚠️ 报告里的人工确认

如果报告开头出现红色「需要人工确认」区块：
1. 看清楚原因（重复数据/备注更新等）
2. 按「下一步」提示操作
3. 确认后重新导出

---

## 📁 项目结构

```
buoy_report/
├── models.py           # 数据模型
├── data_loader.py      # 数据加载+去重+版本追踪
├── anomaly_detector.py # 异常检测+高亮+边界样本
├── sensitivity.py      # 参数敏感性分析
├── report_generator.py # 报告导出
├── cli.py              # 命令行接口
└── templates/
    └── report.html     # HTML报告模板
```

---

## 💡 核心特性

1. **设备编号去重** - 重复数据自动卡控，触发人工确认
2. **维修备注版本追踪** - 后补材料不会无声覆盖，有变更必提示
3. **空间位置对应** - 异常、备注、位置三者关联显示
4. **极端值高亮** - 被平均掉的极端值单独标记，风险不隐藏
5. **参数敏感性分析** - 调档复算，说明白为什么结果变了
6. **公式/单位透明** - 报告里明明白白写清楚怎么算的
7. **现场材料包** - 导出时附带照片、检测表等原始材料

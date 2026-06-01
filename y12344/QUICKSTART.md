# 抛体运动风阻估计 - 快速上手

## 一、准备轨迹点

### 1. 生成示例数据
```bash
pest template data --with-anomalies
```
这会在 `./examples/` 目录下生成：
- `trajectory_normal.csv` - 正常轨迹
- `angle_normal.csv` - 正常角度记录
- `wind_normal.csv` - 正常风速记录
- `angle_with_overflow.csv` - 含角度越界 (t=1.5s 时 95°)
- `trajectory_with_reverse.csv` - 含坐标反向
- `wind_with_missing.csv` - 含风速缺测

### 2. 手动准备轨迹CSV
格式要求：
```csv
t,x,y,vx,vy
0.0,0.0,0.0,35.36,35.36
0.2,7.07,7.02,35.00,33.40
0.4,14.07,13.88,34.65,31.44
```
- **必需列**: `t`(时间s), `x`(m), `y`(m)
- **可选列**: `vx`, `vy` (m/s)
- 坐标系: x向右为正, y向上为正

查看完整格式说明:
```bash
pest format-info trajectory
```

### 3. 准备其他数据
角度记录: `t, angle_deg`
```bash
pest format-info angle
```

风速记录: `t, wind_speed, wind_direction_deg`
```bash
pest format-info wind
```

---

## 二、复现角度越界

### 方法1: 一键复现 (推荐)
```bash
pest reproduce-angle-overflow \
  -a examples/angle_with_overflow.csv \
  -t examples/trajectory_normal.csv
```

输出会显示：
- 越界点时间、角度值、超出多少
- 对应轨迹点位置和速度
- 从速度反推的理论角度对比
- 详细排查步骤

### 方法2: 完整分析后查看
```bash
pest analyze \
  -t examples/trajectory_normal.csv \
  -a examples/angle_with_overflow.csv \
  -w examples/wind_normal.csv \
  -f txt -f html
```

在报告中搜索 `angle_overflow` 即可定位。

### 方法3: 仅检测异常
```bash
pest check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv
```

---

## 三、查看报告导出

### 1. 报告格式
运行 `pest analyze` 后会在 `./reports/` 生成报告：

| 格式 | 用途 | 特点 |
|------|------|------|
| `.txt` | 人工查看 | 完整细节，所有中间量 |
| `.json` | 程序读取 | 结构化数据 |
| `.html` | 浏览器查看 | 带样式图表，异常高亮 |
| `.csv` | Excel分析 | 分三个文件: events/anomalies/errors |

生成所有格式:
```bash
pest analyze -t ... -a ... -w ... -f txt -f json -f html -f csv
```

### 2. 报告内容结构
1. **边界配置** - 所有阈值一目了然
2. **事件汇总** - 每个时刻关联了哪些材料的数据
3. **异常检测** - 哪份材料触发的、卡在哪里、下一步补什么
4. **轨迹拟合** - 公式、参数、R²、RMSE
5. **风阻估计** - 中间量、单位、估计过程
6. **误差分析** - 逐点对比实测 vs 模拟
7. **物理公式** - 所有用到的公式和参数说明

### 3. 重点查看异常
每个异常包含：
- 🔴 **触发材料**: 哪份文件出的问题
- 📍 **卡在哪里**: 时间点、数值、边界
- ✅ **下一步操作**: 具体排查步骤

---

## 四、完整工作流示例

```bash
# 1. 生成示例数据
pest template data --with-anomalies
pest template config -o config.json

# 2. 先检查异常
pest check \
  -t examples/trajectory_normal.csv \
  -a examples/angle_with_overflow.csv \
  -w examples/wind_with_missing.csv

# 3. 复现角度越界
pest reproduce-angle-overflow \
  -a examples/angle_with_overflow.csv \
  -t examples/trajectory_normal.csv

# 4. 完整分析并导出报告
pest analyze \
  -t examples/trajectory_normal.csv \
  -a examples/angle_normal.csv \
  -w examples/wind_normal.csv \
  -c config.json \
  --mass 0.1 --area 0.001 \
  -f txt -f json -f html -f csv \
  -o reports/

# 5. 用异常数据再跑一次
pest analyze \
  -t examples/trajectory_with_reverse.csv \
  -a examples/angle_with_overflow.csv \
  -w examples/wind_with_missing.csv \
  -f txt -f html
```

---

## 五、调整边界配置

编辑 `config.json` 或通过命令行参数:
```bash
# 放宽角度范围到 [-30°, 120°]
pest analyze -t ... -a ... --angle-min -30 --angle-max 120

# 使用多项式拟合 (阶数3)
pest analyze -t ... --fit-method polynomial --poly-degree 3
```

---

## 六、关键命令速查

```bash
pest --help                    # 查看所有命令
pest analyze --help            # 查看分析参数
pest template data --help      # 生成示例数据
pest format-info trajectory   # 查看轨迹格式
```

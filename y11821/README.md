# 农险灾损赔付测算命令行工具

## 快速开始

### 1. 安装依赖

```bash
pip install -e .
# 或者
pip install -r requirements.txt
```

### 2. 启动命令

使用样例数据运行测算：

```bash
agri-ins calculate \
  -f samples/farmers.yaml \
  -p samples/parcels.yaml \
  -s samples/signatures.yaml
```

指定输出目录并显示详细溯源：

```bash
agri-ins calculate \
  -f samples/farmers.yaml \
  -p samples/parcels.yaml \
  -s samples/signatures.yaml \
  -o ./output \
  -t
```

不执行面积去重：

```bash
agri-ins calculate \
  -f samples/farmers.yaml \
  -p samples/parcels.yaml \
  -s samples/signatures.yaml \
  --no-dedup
```

### 3. 样例数据位置

样例数据在 `samples/` 目录下：

```
samples/
├── farmers.yaml      # 农户档案（5户）
├── parcels.yaml      # 地块图斑（6块，含2处重叠）
└── signatures.yaml   # 签字表（5份，含1份缺失签字）
```

查看样例路径：

```bash
agri-ins sample-paths
```

### 4. 怎样看到等级变更

运行测算后，终端会直接显示等级变更记录表格。

命令行查看等级变更（需指定之前生成的JSON结果文件）：

```bash
# 先运行测算生成结果
agri-ins calculate -f samples/farmers.yaml -p samples/parcels.yaml -s samples/signatures.yaml

# 查看等级变更记录（替换为实际生成的文件名）
agri-ins list-changes -r output/BATCH-YYYYMMDDHHMMSS_YYYYMMDD_HHMMSS.json
```

等级变更记录也会保存在 `output/` 目录下的 CSV 文件中：

```
output/*_level_changes.csv
```

## 其他命令

查看已保存的测算结果：

```bash
agri-ins view -r output/BATCH-YYYYMMDDHHMMSS_YYYYMMDD_HHMMSS.json
```

按状态筛选查看：

```bash
agri-ins view -r output/BATCH-YYYYMMDDHHMMSS_YYYYMMDD_HHMMSS.json --filter-status "有争议"
```

从已有结果重新导出所有文件：

```bash
agri-ins export -r output/BATCH-YYYYMMDDHHMMSS_YYYYMMDD_HHMMSS.json -o ./output
```

## 输出文件说明

测算完成后，`output/` 目录会生成以下文件，三者数据一致：

- `*.json` - 机器可读完整结果
- `*_report.txt` - 人类可读报告
- `*_vouchers.csv` - 赔付清单
- `*_actions.csv` - 待办事项清单
- `*_dedup.csv` - 去重记录
- `*_level_changes.csv` - 等级变更记录
- `*_manifest.json` - 文件清单

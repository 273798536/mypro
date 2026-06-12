# 最短路径参数试算

CLI 工具，批量校验题目清单并统计最短路径参数。

## 快速开始

1. 放入题目清单 CSV，格式：`题目ID,起点,终点,距离,单位`
2. 运行：`node bin/sptrial.js 你的文件.csv`
3. 查看输出：已处理 / 坏行 / 跳过行 / 重复行 分列统计

## 坏材料来了看哪里

| 现象 | 看哪里 | 说明 |
|------|--------|------|
| 坏行数 > 0 | 输出中「坏行明细」 | 列出行号和具体错误，如距离非数字、必填项为空 |
| 跳过行 > 0 | 输出中「跳过行明细」 | 一般是空行，不影响计算 |
| 重复行 > 0 | 输出中「重复行明细」 | 同题目ID重复录入，已排除不参与统计 |
| 结果跳变 | 加 `-b baseline.json` 重跑 | 报告里会标注是阈值、单位还是单条记录造成的 |
| 单位乱 | 加 `-u km` 指定期望单位 | 不匹配的会单独计数 |
| 距离异常 | 加 `-t 500000` 设阈值（米） | 超阈值的会单独计数 |

## 命令选项

```
-t, --threshold <米>    距离阈值
-u, --unit <单位>       期望单位 (m/km/里)
-b, --baseline <文件>   基线 JSON，用于跳变分析
-d, --details           显示坏行原文
-h, --help              帮助
```

## 示例

```bash
# 基础试算
node bin/sptrial.js samples/question-list.csv

# 带阈值和单位校验
node bin/sptrial.js samples/question-list.csv -t 500000 -u km

# 带基线的跳变分析
node bin/sptrial.js samples/question-list.csv -b samples/baseline.json
```

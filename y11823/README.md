# 演出分成保底结算

## 启动命令

**日常操作（合同解析 + 分成试算）**
```bash
python3 main.py daily
```

**月底复盘（异常解释 + 结算导出）**
```bash
python3 main.py review
```

**运行测试**
```bash
python3 -m pytest settlement/tests/test_e2e.py -v
```

## 样例在哪

样例数据目录：`settlement/samples/`

| 文件 | 说明 | 边界场景 |
|------|------|----------|
| contracts.csv | 合同条款（保底、分成比例、赞助抵扣顺序、跨场退票开关） | 空值行、脏行 |
| box_office.csv | 场次票房、退票 | 保底触发、退票跨场、空值 |
| sponsorships.csv | 赞助款 | 巡演级/场次级、抵扣顺序、空值 |

## 怎样看到退票跨场

运行月底复盘命令：
```bash
python3 main.py review
```

输出末尾「退票跨场明细」区块：
```
=== 退票跨场明细 ===
  SHOW010 -> SHOW009: 50000.00  | 退票跨场: SHOW010 -> SHOW009
  SHOW010 -> SHOW012: 20000.00  | 退票跨场: SHOW010 -> SHOW012
```

**样例说明**：
- SHOW009（南京场）：票房 15 万，退票 20 万，超额 5 万需跨场
- SHOW012（常州场）：票房 10 万，退票 12 万，超额 2 万需跨场
- SHOW010（苏州场）：票房 80 万，承接跨场退票

## 输出文件

`review` 命令导出到 `output/` 目录：
- settlement_report.json - 完整结算报告
- settlement_summary.csv - 结算汇总表
- exception_report.json - 异常明细（含保底触发、主办倒贴）
- amendment_log.json - 修正留痕日志

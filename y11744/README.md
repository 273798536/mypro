# 直播打赏税费归集 CLI

## 功能

- 流水归集：按主播/周期聚合打赏流水
- 税费试算：支持多档位税率、版本化分成比例
- 退款回滚：跨期退款检测与提示
- 结算导出：生成清晰的结算报告
- 数据溯源：保留所有来源痕迹和修正历史

## 安装

```bash
pip install -e .
```

## 使用

```bash
lrt run --input ./data --output ./output
```

## 输入数据格式

支持 CSV 和 Excel 格式，需包含以下文件：
- `streamers.csv` - 主播账号信息
- `rewards.csv` - 打赏流水
- `platform_shares.csv` - 平台分成比例（支持版本）
- `refunds.csv` - 退款记录
- `tax_rules.csv` - 税率规则

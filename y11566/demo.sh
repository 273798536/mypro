#!/bin/bash

echo "========================================"
echo "城市照明抢修多源导入巡检 CLI - 完整演示"
echo "========================================"
echo ""

echo "步骤 1: 初始化数据库"
echo "------------------------"
python -m lighting_cli.main init --reset
echo ""

echo "步骤 2: 导入巡检照片"
echo "------------------------"
python -m lighting_cli.main import photo sample_data/photos --strategy append
echo ""

echo "步骤 3: 导入报修热线数据"
echo "------------------------"
python -m lighting_cli.main import hotline sample_data/hotline_records.csv --strategy append
echo ""

echo "步骤 4: 导入备件批次数据"
echo "------------------------"
python -m lighting_cli.main import spare_part sample_data/spare_parts.csv --strategy append
echo ""

echo "步骤 5: 导入审批邮件数据"
echo "------------------------"
python -m lighting_cli.main import approval_email sample_data/approval_emails.csv --strategy append
echo ""

echo "步骤 6: 导入坏数据（触发校验失败）"
echo "------------------------"
python -m lighting_cli.main import hotline sample_data/hotline_bad_data.csv --strategy ignore
echo ""

echo "步骤 7: 校验所有数据"
echo "------------------------"
python -m lighting_cli.main check
echo ""

echo "步骤 8: 查看导入批次历史"
echo "------------------------"
python -m lighting_cli.main history --batches
echo ""

echo "步骤 9: 人工修正坏数据"
echo "------------------------"
echo "修正第1条失败记录（补充故障地点）:"
python -m lighting_cli.main fix --id 7 --field location --value "人民路_008" --reason "补充缺失的故障地点"
echo ""
echo "修正第2条失败记录（补充故障类型）:"
python -m lighting_cli.main fix --id 8 --field issue_type --value "lighting_failure" --reason "补充缺失的故障类型"
echo ""
echo "修正第3条失败记录（修正严重级别）:"
python -m lighting_cli.main fix --id 9 --field severity --value "high" --reason "修正无效的严重级别"
echo ""

echo "步骤 10: 重新校验数据"
echo "------------------------"
python -m lighting_cli.main check
echo ""

echo "步骤 11: 查看工单变更历史"
echo "------------------------"
python -m lighting_cli.main history --work-order-id 7
echo ""

echo "步骤 12: 生成巡检报告"
echo "------------------------"
python -m lighting_cli.main report --format txt
echo ""

echo "步骤 13: 导出数据为CSV"
echo "------------------------"
python -m lighting_cli.main export --format csv
echo ""

echo ""
echo "========================================"
echo "演示完成！"
echo "========================================"
echo "查看生成的报告: reports/ 目录"
echo "查看导出的数据: exports/ 目录"
echo "查看配置文件: lighting_config.yaml"
echo "查看数据库: lighting_data.db"
echo ""

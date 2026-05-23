#!/bin/bash
set -e

echo "=========================================="
echo "社区团购售后巡检 CLI - 完整流程测试"
echo "=========================================="
echo ""

echo "【1/8】安装依赖..."
pip install -e . -q 2>/dev/null
echo "✅ 依赖安装完成"
echo ""

echo "【2/8】初始化数据库并创建批次..."
INIT_OUTPUT=$(aftersales init --desc "5月24日售后批次")
BATCH_NO=$(echo "$INIT_OUTPUT" | grep "新批次号" | awk '{print $NF}')
echo "✅ 批次创建完成: $BATCH_NO"
echo ""

echo "【3/8】导入团长退款表..."
aftersales import sample_data/团长退款表.csv --batch $BATCH_NO --type leader_refund --no-consolidate
echo ""

echo "【4/8】导入仓库复核表..."
aftersales import sample_data/仓库复核表.csv --batch $BATCH_NO --type warehouse_review --no-consolidate
echo ""

echo "【5/8】导入用户备注..."
aftersales import sample_data/用户备注.csv --batch $BATCH_NO --type user_remark
echo ""

echo "【6/8】执行合规性检查..."
aftersales check --batch $BATCH_NO
echo ""

echo "【7/8】生成巡检报告..."
aftersales report --batch $BATCH_NO
echo ""

echo "【8/8】导出最终数据..."
aftersales export --batch $BATCH_NO --output ./export_results
echo ""

echo "=========================================="
echo "测试完成！"
echo "批次号: $BATCH_NO"
echo "=========================================="
echo ""
echo "常用命令:"
echo "  aftersales history --batch $BATCH_NO   # 查看批次订单列表"
echo "  aftersales report                       # 查看所有批次"
echo "  aftersales fix amount <订单ID> <金额>   # 人工改判金额"
echo "  aftersales fix freeze --batch $BATCH_NO # 冻结失败订单"

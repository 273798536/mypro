#!/bin/bash

set -e

echo "================================================"
echo "  外协加工对账多源导入巡检 CLI - 完整演示"
echo "================================================"
echo ""

BATCH_ID="BATCH-2024-001"
CLI="python3 main.py"

echo "[1/12] 初始化数据库..."
$CLI init
echo ""

echo "[2/12] 导入外协送货单 (含部分失败数据)..."
$CLI import-file --batch-id $BATCH_ID --file-type delivery --file sample_data/delivery_note.csv --operator 张三
echo ""

echo "[3/12] 导入返修记录 (含多次返工数据)..."
$CLI import-file --batch-id $BATCH_ID --file-type repair --file sample_data/repair_record.csv --operator 李四
echo ""

echo "[4/12] 导入扣款明细..."
$CLI import-file --batch-id $BATCH_ID --file-type deduction --file sample_data/deduction_detail.csv --operator 王五
echo ""

echo "[5/12] 导入主管批注..."
$CLI import-file --batch-id $BATCH_ID --file-type comment --file sample_data/supervisor_comment.csv --operator 系统
echo ""

echo "[6/12] 对账检查..."
$CLI check --batch-id $BATCH_ID --operator 会计
echo ""

echo "[7/12] 测试重复导入检测..."
echo "尝试重复导入送货单..."
$CLI import-file --batch-id $BATCH_ID --file-type delivery --file sample_data/delivery_note.csv --operator 张三 || true
echo ""

echo "[8/12] 导入修正后的送货数据 (补充失败记录)..."
$CLI import-file --batch-id $BATCH_ID --file-type delivery --file sample_data/delivery_note_fixed.csv --operator 张三
echo ""

echo "[9/12] 人工改判 (根据主管批注修正P001结算数量)..."
$CLI fix --batch-id $BATCH_ID --product-code P001 --new-settlement 97 --reason "根据张主管批注，P001实际只返工1次，结算数修正为 100-3=97" --operator 财务主管
echo ""

echo "[10/12] 冻结对账数据 (导出前锁定)..."
$CLI freeze --batch-id $BATCH_ID --operator 财务经理
echo ""

echo "[11/12] 查看完整报告..."
$CLI report --batch-id $BATCH_ID
echo ""

echo "[12/12] 导出对账结果..."
$CLI export --batch-id $BATCH_ID --format csv
echo ""

echo "================================================"
echo "  演示完成！查看操作轨迹："
echo "  python3 main.py history --batch-id $BATCH_ID"
echo ""
echo "  生成的文件："
echo "  - ${BATCH_ID}_failures.csv (失败清单)"
echo "  - ${BATCH_ID}_reconciliation.csv (对账结果)"
echo "  - outsourcing_audit.db (完整数据库)"
echo "================================================"

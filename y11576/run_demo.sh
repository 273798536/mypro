#!/bin/bash

set -e

echo "================================================"
echo "  外协加工对账多源导入巡检 CLI - 完整演示"
echo "================================================"
echo ""

BATCH_ID="BATCH-2024-001"
CLI="python3 main.py"

echo "[0/14] 清理旧数据..."
rm -f outsourcing_audit.db "${BATCH_ID}_failures.csv" "${BATCH_ID}_reconciliation.csv"
echo "  已清理旧数据库和导出文件"
echo ""

echo "[1/14] 初始化数据库..."
$CLI init
echo ""

echo "[2/14] 导入外协送货单 (含2条失败数据: 缺少物料编码/送货数量)..."
$CLI import-file --batch-id $BATCH_ID --file-type delivery --file sample_data/delivery_note.csv --operator 张三
echo ""

echo "[3/14] 导入返修记录 (含多次返工数据)..."
$CLI import-file --batch-id $BATCH_ID --file-type repair --file sample_data/repair_record.csv --operator 李四
echo ""

echo "[4/14] 导入扣款明细..."
$CLI import-file --batch-id $BATCH_ID --file-type deduction --file sample_data/deduction_detail.csv --operator 王五
echo ""

echo "[5/14] 导入主管批注..."
$CLI import-file --batch-id $BATCH_ID --file-type comment --file sample_data/supervisor_comment.csv --operator 系统
echo ""

echo "[6/14] 对账检查..."
$CLI check --batch-id $BATCH_ID --operator 会计
echo ""

echo "[7/14] 测试重复导入检测 (应该被拒绝并记录轨迹)..."
echo "尝试重复导入送货单..."
$CLI import-file --batch-id $BATCH_ID --file-type delivery --file sample_data/delivery_note.csv --operator 张三 || true
echo ""

echo "[8/14] 演示撤回后再提交 (边界场景: 撤回返修记录后重新导入)..."
echo "  [8a] 撤回返修记录..."
$CLI withdraw --batch-id $BATCH_ID --file-type repair --operator 李四
echo ""
echo "  [8b] 重新导入修正后的返修记录..."
$CLI import-file --batch-id $BATCH_ID --file-type repair --file sample_data/repair_record.csv --operator 李四
echo ""

echo "[9/14] 导入修正后的送货数据 (补充之前的失败记录)..."
$CLI import-file --batch-id $BATCH_ID --file-type delivery --file sample_data/delivery_note_fixed.csv --operator 张三
echo ""

echo "[10/14] 重新对账检查 (补充后的数据)..."
$CLI check --batch-id $BATCH_ID --operator 会计
echo ""

echo "[11/14] 人工改判 (根据主管批注修正P001结算数量)..."
$CLI fix --batch-id $BATCH_ID --product-code P001 --new-settlement 97 --reason "根据张主管批注，P001实际只返工1次，结算数修正为 100-3=97" --operator 财务主管
echo ""

echo "[12/14] 冻结对账数据 (导出前锁定)..."
$CLI freeze --batch-id $BATCH_ID --operator 财务经理
echo ""

echo "[13/14] 查看完整报告 (失败清单+对账结果+改判标记)..."
$CLI report --batch-id $BATCH_ID
echo ""

echo "[14/14] 导出对账结果 (记录导出轨迹)..."
$CLI export --batch-id $BATCH_ID --format csv --operator 财务主管
echo ""

echo "================================================"
echo "  演示完成！查看完整操作轨迹："
echo "  python3 main.py history --batch-id $BATCH_ID"
echo ""
echo "  关键验证点："
echo "  1. 步骤[7] 重复导入被拒绝，history 可见 import_duplicate_rejected"
echo "  2. 步骤[8] 撤回后再提交，history 可见 withdraw + import"
echo "  3. 步骤[12] 冻结后再尝试 fix 会报错"
echo "  4. 步骤[14] 导出会在 history 留下 export 记录"
echo ""
echo "  生成的文件："
echo "  - ${BATCH_ID}_failures.csv (失败清单)"
echo "  - ${BATCH_ID}_reconciliation.csv (对账结果)"
echo "  - outsourcing_audit.db (完整数据库)"
echo "================================================"

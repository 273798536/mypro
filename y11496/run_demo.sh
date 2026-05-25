#!/bin/bash
# 财务报销稽核多源导入巡检 CLI - 一键演示脚本

set -e

export PATH="/Users/mac/Library/Python/3.9/bin:$PATH"

echo "=========================================="
echo "财务报销稽核多源导入巡检 CLI - 完整演示"
echo "=========================================="
echo ""

# 清理旧数据
echo "[0/9] 清理旧数据..."
rm -rf .audit-data
echo ""

# 1. 初始化系统
echo "[1/9] 1. 初始化稽核系统"
finance-audit init
echo ""

# 2. 导入差旅申请（关联共享行程）
echo "[2/9] 2. 导入差旅申请数据（关联共享行程 TRIP-BJ-202403）"
finance-audit import sample_data/travel_requests.csv --trip-id TRIP-BJ-202403
echo ""

# 3. 导入发票数据（会自动关联trip_id）
echo "[3/9] 3. 导入发票PDF数据（自动关联共享行程）"
finance-audit import sample_data/invoices.csv
echo ""

# 4. 导入付款流水（会自动关联trip_id）
echo "[4/9] 4. 导入付款流水数据（自动关联共享行程）"
finance-audit import sample_data/payment_flows.csv
echo ""

# 5. 查看当前记录（注意shared_trip_id）
echo "[5/9] 5. 查看所有导入记录（注意shared_trip_id列）"
finance-audit history
echo ""

# 6. 执行稽核检查
echo "[6/9] 6. 执行稽核检查（检测重复提交、共享行程重复等）"
finance-audit check
echo ""

# 7. 查看稽核报告和失败清单（含原始行号）
echo "[7/9] 7. 查看稽核报告和失败清单（显示原始证据行号）"
finance-audit report --show-evidence
echo ""

# 8. 列出所有快照
echo "[8/9] 8. 查看所有操作快照"
finance-audit history --list-snapshots
echo ""

# 9. 演示快照对比
echo "[9/9] 9. 演示快照对比（导入发票前后的差异）"
SNAPS=$(finance-audit history --list-snapshots 2>/dev/null | grep "SNAP-" | head -2 | awk '{print $1}')
SNAP1=$(echo "$SNAPS" | head -1)
SNAP2=$(echo "$SNAPS" | tail -1)
if [ -n "$SNAP1" ] && [ -n "$SNAP2" ] && [ "$SNAP1" != "$SNAP2" ]; then
    finance-audit history --snap1 "$SNAP1" --snap2 "$SNAP2"
fi
echo ""

echo "=========================================="
echo "演示完成！接下来可以尝试："
echo ""
echo "人工改判示例（将差旅申请标记为已批准）："
echo "  finance-audit override <记录ID> --reason '财务经理特批' --status approved"
echo ""
echo "冻结记录（导出前防止修改）："
echo "  finance-audit freeze <记录ID> --reason '导出前冻结'"
echo ""
echo "导出数据："
echo "  finance-audit export --status checked --format json"
echo "  finance-audit export --status approved --format csv"
echo ""
echo "查看单条记录完整历史和审计轨迹："
echo "  finance-audit history <记录ID>"
echo "=========================================="

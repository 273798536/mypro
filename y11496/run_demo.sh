#!/bin/bash
# 财务报销稽核多源导入巡检 CLI - 一键演示脚本

set -e

export PATH="/Users/mac/Library/Python/3.9/bin:$PATH"

echo "=========================================="
echo "财务报销稽核多源导入巡检 CLI - 完整演示"
echo "=========================================="
echo ""

# 清理旧数据
echo "[0/12] 清理旧数据..."
rm -rf .audit-data
echo ""

# 1. 初始化系统
echo "[1/12] 1. 初始化稽核系统"
finance-audit init
echo ""

# 2. 导入差旅申请（关联共享行程）
echo "[2/12] 2. 导入差旅申请数据（关联共享行程 TRIP-BJ-202403）"
finance-audit import sample_data/travel_requests.csv --trip-id TRIP-BJ-202403
echo ""

# 3. 导入发票数据（会自动关联trip_id）
echo "[3/12] 3. 导入发票PDF数据（自动关联共享行程）"
finance-audit import sample_data/invoices.csv
echo ""

# 4. 导入付款流水（会自动关联trip_id）
echo "[4/12] 4. 导入付款流水数据（自动关联共享行程）"
finance-audit import sample_data/payment_flows.csv
echo ""

# 5. 执行稽核检查
echo "[5/12] 5. 执行稽核检查（检测重复提交、共享行程重复等）"
finance-audit check
echo ""

# 6. 查看稽核报告和失败清单（含原始行号）
echo "[6/12] 6. 查看稽核报告和失败清单（显示原始证据行号）"
finance-audit report --show-evidence
echo ""

# 7. 导入主管批注（使用match_criteria匹配）
echo "[7/12] 7. 导入主管批注（按员工+费用类型自动匹配）"
finance-audit import sample_data/supervisor_notes.csv --no-snapshot
echo ""

# 8. 演示撤回记录
echo "[8/12] 8. 演示撤回记录（赵六交通费用撤回）"
ZHAOLIU_REC=$(finance-audit report --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); f=d.get('failures',[]); r=[x for x in f if '赵六' in x.get('employee_name','')]; print(r[0]['record_id'] if r else '')")
if [ -n "$ZHAOLIU_REC" ]; then
    echo "  撤回记录: $ZHAOLIU_REC"
    finance-audit withdraw "$ZHAOLIU_REC" --reason '发票有误，需重新开具' --operator '赵六' --no-snapshot
else
    echo "  警告: 未找到赵六的记录"
fi
echo ""

# 9. 演示重新提交
echo "[9/12] 9. 演示撤回后重新提交"
if [ -n "$ZHAOLIU_REC" ]; then
    finance-audit resubmit sample_data/resubmit_invoice.csv --parent-record-id "$ZHAOLIU_REC" --operator '赵六' --no-snapshot
fi
echo ""

# 10. 再次执行稽核检查
echo "[10/12] 10. 再次执行稽核检查（检测撤回重提关联）"
finance-audit check --no-snapshot
echo ""

# 11. 查看最终报告
echo "[11/12] 11. 查看最终稽核报告"
finance-audit report --show-evidence
echo ""

# 12. 列出所有快照
echo "[12/12] 12. 查看所有操作快照"
finance-audit history --list-snapshots
echo ""

echo "=========================================="
echo "演示完成！接下来可以尝试："
echo ""
echo "人工改判示例："
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

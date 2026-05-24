#!/bin/bash
set -e

echo "========================================"
echo "  小厂质检返工多源导入巡检 CLI - 演示"
echo "========================================"
echo ""

export QC_OPERATOR="生产经理-王总"

echo "[1/10] 清理旧数据..."
rm -f qc_inspector.db
echo ""

echo "[2/10] 安装依赖..."
python3 -m pip install -q -r requirements.txt
echo "  ✓ 依赖安装完成"
echo ""

echo "[3/10] 初始化数据库..."
python3 -m qc_inspector.cli init
echo ""

echo "[4/10] 导入返工单数据..."
python3 -m qc_inspector.cli import rework samples/rework_sample.xlsx --operator "质检员-小张"
echo ""

echo "[5/10] 导入抽检表数据..."
python3 -m qc_inspector.cli import inspection samples/inspection_sample.xlsx --operator "质检员-小李"
echo ""

echo "[6/10] 导入机台班次数据..."
python3 -m qc_inspector.cli import shift samples/shift_sample.xlsx --operator "车间主任-老赵"
echo ""

echo "[7/10] 导入供应商对账单数据..."
python3 -m qc_inspector.cli import supplier samples/supplier_sample.xlsx --operator "采购-小陈"
echo ""

echo "[8/10] 导入审批邮件数据..."
python3 -m qc_inspector.cli import approval samples/approval_sample.xlsx --operator "行政-小周"
echo ""

echo "[9/10] 导入含坏数据的返工单（触发数据校验失败）..."
python3 -m qc_inspector.cli import rework samples/rework_bad_data.xlsx --operator "新员工-小王"
echo ""

echo "[10/10] 查看当前任务状态..."
python3 -m qc_inspector.cli check --all-tasks
echo ""

echo "========================================"
echo "  多源数据统计："
echo "========================================"
python3 -c "
from qc_inspector.database import get_db
from qc_inspector.models import ReworkRecord, InspectionRecord, ShiftRecord, SupplierRecord, ApprovalRecord

with get_db() as db:
    print(f'  返工单记录: {db.query(ReworkRecord).count()} 条')
    print(f'  抽检表记录: {db.query(InspectionRecord).count()} 条')
    print(f'  机台班次记录: {db.query(ShiftRecord).count()} 条')
    print(f'  供应商对账单: {db.query(SupplierRecord).count()} 条')
    print(f'  审批邮件记录: {db.query(ApprovalRecord).count()} 条')
" 2>&1
echo ""

echo "========================================"
echo "  接下来你可以尝试以下操作："
echo "========================================"
echo ""
echo "1. 查看失败清单（生产经理视图）："
echo "   python3 -m qc_inspector.cli report"
echo ""
echo "2. 修复一条坏数据（良率150修正为75）："
echo "   python3 -m qc_inspector.cli fix 1 yield_rate 75 --reason '良率录入错误，实际为75%' --operator '质检主管'"
echo ""
echo "3. 查看变更历史（审计日志）："
echo "   python3 -m qc_inspector.cli history"
echo ""
echo "4. 重新导入同一文件用不同策略："
echo "   python3 -m qc_inspector.cli import rework samples/rework_sample.xlsx --strategy overwrite --operator '数据专员'"
echo ""
echo "5. 导出修正后的数据："
echo "   python3 -m qc_inspector.cli export rework cleaned_rework.xlsx"
echo ""
echo "6. 重试待处理任务："
echo "   python3 -m qc_inspector.cli check --retry"
echo ""

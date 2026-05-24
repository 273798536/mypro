#!/bin/bash
set -e

echo "========================================"
echo "  小厂质检返工多源导入巡检 CLI - 演示"
echo "========================================"
echo ""

export QC_OPERATOR="生产经理-王总"

echo "[1/8] 清理旧数据..."
rm -f qc_inspector.db
echo ""

echo "[2/8] 安装依赖..."
python3 -m pip install -q -r requirements.txt
echo "  ✓ 依赖安装完成"
echo ""

echo "[3/8] 初始化数据库..."
python3 -m qc_inspector.cli init
echo ""

echo "[4/8] 导入正常返工单数据..."
python3 -m qc_inspector.cli import rework samples/rework_sample.xlsx --operator "质检员-小张"
echo ""

echo "[5/8] 导入抽检表数据..."
python3 -m qc_inspector.cli import inspection samples/inspection_sample.xlsx --operator "质检员-小李"
echo ""

echo "[6/8] 导入机台班次数据..."
python3 -m qc_inspector.cli import shift samples/shift_sample.xlsx --operator "车间主任-老赵"
echo ""

echo "[7/8] 导入含坏数据的返工单（触发数据校验失败）..."
python3 -m qc_inspector.cli import rework samples/rework_bad_data.xlsx --operator "新员工-小王"
echo ""

echo "[8/8] 查看当前任务状态..."
python3 -m qc_inspector.cli check --all-tasks
echo ""

echo "========================================"
echo "  接下来你可以尝试以下操作："
echo "========================================"
echo ""
echo "1. 查看失败清单（生产经理视图）："
echo "   python3 -m qc_inspector.cli report"
echo ""
echo "2. 修复一条坏数据（良率105修正为85）："
echo "   python3 -m qc_inspector.cli fix 1 yield_rate 85 --reason '良率录入错误，实际为85%' --operator '质检主管'"
echo ""
echo "3. 查看变更历史："
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

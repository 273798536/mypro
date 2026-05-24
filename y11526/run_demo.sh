#!/bin/bash
set -e

echo "================================================"
echo "跨境小包清关多源导入巡检 CLI - 完整演示流程"
echo "================================================"
echo ""

echo "[1/7] 安装依赖..."
pip install -q -r requirements.txt
echo "依赖安装完成"
echo ""

echo "[2/7] 生成样例数据..."
python sample_data/generate_samples.py
echo ""

echo "[3/7] 初始化数据库..."
python main.py init --force
echo ""

echo "[4/7] 导入申报表（包含1行坏数据）..."
python main.py import sample_data/declarations.csv --type declaration --user demo_user
echo ""

echo "[5/7] 导入其他数据源..."
python main.py import sample_data/tracking_nodes.csv --type tracking --user demo_user
python main.py import sample_data/tax_notices.csv --type tax_notice --user demo_user
python main.py import sample_data/supplier_statements.csv --type supplier_statement --user demo_user
python main.py import sample_data/approval_emails.csv --type approval_email --user demo_user
echo ""

echo "[6/7] 运行数据一致性校验..."
python main.py check
echo ""

echo "[7/7] 生成巡检报告..."
python main.py report
echo ""

echo "================================================"
echo "演示完成！接下来可以尝试："
echo ""
echo "查看导入历史:"
echo "  python main.py history sources"
echo ""
echo "查看审计轨迹:"
echo "  python main.py history"
echo ""
echo "查看异常列表:"
echo "  python main.py fix list"
echo ""
echo "人工修正数据（示例）:"
echo "  python main.py fix edit packages 1 --field supplier --value 新供应商 --user 张三 --remark 人工修正供应商名称"
echo ""
echo "导出数据:"
echo "  python main.py export all --output all_data.xlsx"
echo ""
echo "异步任务演示:"
echo "  python main.py import sample_data/declarations.csv --type declaration --async"
echo "  python main.py task list"
echo "  python main.py task run --all"
echo "================================================"

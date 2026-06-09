#!/bin/bash
# ====================================================================
# 二分搜索边界审计 - 一键全流程演示脚本
# 运营同事直接运行此脚本，即可从空目录跑通完整流程
# ====================================================================

set -e

echo "============================================"
echo "  二分搜索边界审计 - 完整流程演示"
echo "============================================"
echo ""

# Step 0: 安装依赖
echo "[Step 0/7] 安装依赖..."
pip3 install -q click tabulate
echo "  ✓ 依赖已安装"
echo ""

# Step 1: 清理旧数据库（可选）
echo "[Step 1/7] 初始化环境（清理旧数据库）..."
rm -f audit.db
echo "  ✓ 环境已准备"
echo ""

# Step 2: 导入样例数据
echo "[Step 2/7] 导入学生答题数据（含真实坏数据样例）..."
python3 audit_cli.py import-batch --file sample_data.json --name "周报审计第1批"
echo ""

# Step 3: 查看批次列表
echo "[Step 3/7] 查看导入批次..."
python3 audit_cli.py list-batches
echo ""

# Step 4: 列出错题（带复核入口）
echo "[Step 4/7] 列出错题/异常题（含复核入口和边界案例）..."
python3 audit_cli.py wrong --review
echo ""

# Step 5: 列出缺失答案缺口
echo "[Step 5/7] 列出缺失答案缺口（待风控分析师补充）..."
python3 audit_cli.py missing
echo ""

# Step 6: 单个修正 + 确认（演示复核入口）
echo "[Step 6/7] 演示单题修正与确认..."
echo "  → 修正 MATH005 的正确答案（原为空）..."
python3 audit_cli.py correct --id 5 --field correct_answer --new-value "5" --note "风控补充: 15/3=5"
echo ""
echo "  → 确认 MATH001 无误..."
python3 audit_cli.py confirm --id 1 --note "已审核，正确"
echo ""

# Step 7: 批量复核（改变判断会记录历史对比）
echo "[Step 7/7] 批量复核（含历史对比）..."
python3 audit_cli.py review --batch 1 --corrections sample_corrections.json --note "周报第1次复核"
echo ""

# 额外: 查看复核历史对比
echo "============================================"
echo "  额外 - 查看复核历史对比"
echo "============================================"
python3 audit_cli.py list-reviews --batch 1
echo ""

# 额外: 查看单题完整历史
echo "============================================"
echo "  额外 - 查看第 2 题完整历史（导入→修正→边界）"
echo "============================================"
python3 audit_cli.py history --id 2
echo ""

echo "============================================"
echo "  ✓ 完整流程演示完成！"
echo "============================================"
echo ""
echo "常用命令速查:"
echo "  # 导入数据"
echo "  python3 audit_cli.py import-batch --file your_data.json --name '批次名'"
echo ""
echo "  # 看错题（带复核入口）"
echo "  python3 audit_cli.py wrong --review"
echo ""
echo "  # 看缺失答案缺口"
echo "  python3 audit_cli.py missing"
echo ""
echo "  # 单题修正"
echo "  python3 audit_cli.py correct --id <DB_ID> --field correct_answer --new-value '值'"
echo ""
echo "  # 批量复核（会记录历史对比）"
echo "  python3 audit_cli.py review --batch 1 --corrections corrections.json"
echo ""
echo "  # 看单题完整历史"
echo "  python3 audit_cli.py history --id <DB_ID>"
echo ""
echo "  数据库文件: audit.db (SQLite, 可用 DB Browser 打开)"

#!/usr/bin/env bash
set -euo pipefail

echo "=== 极地航线冰情评估 - 从空目录跑完全流程 ==="

STEP1_DB="polar_ice.db"
if [ -f "$STEP1_DB" ]; then
  echo "[1] 删除旧数据库..."
  rm -f "$STEP1_DB"
fi

echo "[1] 初始化数据库..."
python3 main.py init --db "$STEP1_DB"

echo ""
echo "[2] 导入潮汐表（第一批）..."
python3 main.py import-tide sample_tide.csv --operator 海洋老师

echo ""
echo "[3] 导入船舶轨迹..."
python3 main.py import-track sample_track.csv --operator 海洋老师

echo ""
echo "[4] 检测潮汐-轨迹冲突..."
python3 main.py detect-conflicts

echo ""
echo "[5] 创建评估记录..."
python3 main.py assess-create \
  --route "东北航道" \
  --date "2025-06-01" \
  --ice "轻度冰情，浮冰覆盖率15%" \
  --wind "6级偏北风，浪高2-3m" \
  --risk "medium" \
  --operator 海洋老师

echo ""
echo "[6] 查看风险分层（日常入口）..."
python3 main.py risk

echo ""
echo "[7] 人工修正 - 修改风险等级并留痕..."
python3 main.py assess-revise 1 \
  --risk "high" \
  --ice "中度冰情，浮冰覆盖率35%，风浪叠加" \
  --operator 海洋老师 \
  --reason "结合风浪预报修正冰情判断"

echo ""
echo "[8] 状态变更：待确认 -> 通过..."
python3 main.py assess-status 1 approved \
  --operator 海洋老师 \
  --reason "人工复核完成，数据已核实"

echo ""
echo "[9] 查看变更解释（前后差异）..."
python3 main.py explain 1

echo ""
echo "[10] 导入第二批潮汐表（模拟风浪预报晚到的补录场景）..."
python3 main.py import-tide sample_tide_batch2.csv --operator 海洋老师

echo ""
echo "[11] 再次检测冲突（验证补录后不会出现两份矛盾结论）..."
python3 main.py detect-conflicts

echo ""
echo "[12] 查看审计日志（完整留痕）..."
python3 main.py audit-log 1

echo ""
echo "=== 全流程完成 ==="

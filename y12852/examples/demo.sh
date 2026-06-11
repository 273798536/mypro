#!/bin/bash
# 端到端演示脚本：从空目录开始，跑通海上风电巡检排程全流程
#
# 使用方法:
#   cd /path/to/project
#   bash examples/demo.sh

set -e

echo "=========================================="
echo "  海上风电巡检排程工具 - 端到端演示"
echo "=========================================="
echo ""

echo "📦 第1步: 初始化数据库"
echo "----------------------------"
python3 owi.py init
echo ""

echo "📦 第2步: 导入风浪预报数据"
echo "----------------------------"
python3 owi.py import wave_forecast --file examples/wave_forecasts.json
echo ""

echo "📦 第3步: 导入水质监测数据"
echo "----------------------------"
python3 owi.py import water_quality --file examples/water_quality.json
echo ""

echo "📦 第4步: 创建巡检任务"
echo "----------------------------"
python3 owi.py task create \
  --code XJ-20260615-001 \
  --wind-farm "东海一号风场" \
  --date 2026-06-15 \
  --tide-start "2026-06-15 06:00" \
  --tide-end "2026-06-15 18:00" \
  --ship "海巡01号"

python3 owi.py task create \
  --code XJ-20260616-001 \
  --wind-farm "东海一号风场" \
  --date 2026-06-16 \
  --tide-start "2026-06-16 07:00" \
  --tide-end "2026-06-16 19:00" \
  --ship "海巡01号"

python3 owi.py task create \
  --code XJ-20260617-001 \
  --wind-farm "东海一号风场" \
  --date 2026-06-17 \
  --tide-start "2026-06-17 05:30" \
  --tide-end "2026-06-17 17:30" \
  --ship "海巡02号"

python3 owi.py task create \
  --code XJ-20260615-002 \
  --wind-farm "南海二号风场" \
  --date 2026-06-15 \
  --tide-start "2026-06-15 06:30" \
  --tide-end "2026-06-15 18:30" \
  --ship "海巡03号"

echo ""
echo "📋 任务列表:"
python3 owi.py task list
echo ""

echo "📦 第5步: 导入船舶轨迹"
echo "----------------------------"
python3 owi.py track import --task-id 1 --file examples/ship_tracks.json --source "AIS系统"
echo ""

echo "📦 第6步: 批量风险评估"
echo "----------------------------"
python3 owi.py assess --batch
echo ""

echo "📦 第7步: 生成单个任务报告"
echo "----------------------------"
python3 owi.py report --task XJ-20260615-001
echo ""

echo "📦 第8步: 生成批量汇总报告"
echo "----------------------------"
python3 owi.py report --batch
echo ""

echo "📦 第9步: 查看晚到预报（复核入口）"
echo "----------------------------"
python3 owi.py review list-delayed
echo ""

echo "📦 第10步: 追溯演示 - 从晚到预报任务往回查"
echo "----------------------------"
echo "  验收场景: 顺着一条异常（风浪预报晚到）往回查"
echo ""
echo "  从任务 XJ-20260617-001 追溯（含风浪预报晚到）:"
python3 owi.py trace --task XJ-20260617-001
echo ""

echo "📦 第11步: 复核晚到预报对应的风险评估"
echo "----------------------------"
echo "  场景：风浪预报晚到，海洋监测员核实后调整风险等级"
echo ""

RISK_ID=$(python3 -c "
import sqlite3
conn = sqlite3.connect('owi_data.db')
row = conn.execute(\"SELECT id FROM risk_assessments WHERE task_code='XJ-20260617-001' ORDER BY assessment_date DESC LIMIT 1\").fetchone()
print(row[0] if row else '')
conn.close()
")

echo "  找到风险评估ID: $RISK_ID"
python3 owi.py review do "$RISK_ID" \
  --type risk_level \
  --value high \
  --reviewer "李监测员" \
  --reason "风浪预报晚到，经与现场核实实际浪高4.2米，上调风险等级"
echo ""

echo "📦 第12步: 复核后再次追溯验证"
echo "----------------------------"
echo "  验证：复核记录能在追溯链路中看到"
python3 owi.py trace --risk "$RISK_ID"
echo ""

echo "=========================================="
echo "  ✅ 端到端演示完成！"
echo "=========================================="
echo ""
echo "常用命令速查:"
echo "  owi task list                    查看任务列表"
echo "  owi assess --task <任务编号>     单个任务风险评估"
echo "  owi report --task <任务编号>     生成任务报告"
echo "  owi trace --alert <预警ID>       从预警追溯"
echo "  owi review list-delayed          查看晚到预报"
echo ""

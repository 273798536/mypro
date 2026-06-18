#!/bin/bash
# ============================================================
# 报表口径血缘追踪系统 - Curl 示例大全
# ============================================================
# 使用前请先启动服务: python run_server.py
# 服务地址: http://localhost:5000
# ============================================================

API_BASE="http://localhost:5000"

echo "============================================================"
echo "  报表口径血缘追踪系统 - Curl 示例"
echo "============================================================"
echo ""

# ------------------------------------------------------------
# 1. 基础操作
# ------------------------------------------------------------
echo "[1] 健康检查"
curl -s "$API_BASE/health" | python3 -m json.tool
echo ""

echo "[2] 获取系统统计"
curl -s "$API_BASE/api/stats" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 2. 数据导入 - 三种模式演示
# ------------------------------------------------------------
echo "============================================================"
echo "  一、数据导入（重复运行）"
echo "============================================================"
echo ""

echo "[2.1] 首次导入慢查询日志 (standard模式 - 跳过已存在)"
curl -s -X POST "$API_BASE/api/import/slow-logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"mode": "standard"}' | python3 -m json.tool
echo ""

echo "[2.2] 重复运行导入 (standard模式 - 全部跳过)"
curl -s -X POST "$API_BASE/api/import/slow-logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"mode": "standard"}' | python3 -m json.tool
echo ""

echo "[2.3] 覆盖模式重新导入 (overwrite模式)"
curl -s -X POST "$API_BASE/api/import/slow-logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"mode": "overwrite"}' | python3 -m json.tool
echo ""

echo "[2.4] 导入数据字典"
curl -s -X POST "$API_BASE/api/import/dictionary" | python3 -m json.tool
echo ""

echo "[2.5] 导入迁移脚本"
curl -s -X POST "$API_BASE/api/import/migrations" | python3 -m json.tool
echo ""

echo "[2.6] 导入权限配置"
curl -s -X POST "$API_BASE/api/import/permissions" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 3. 数据补录
# ------------------------------------------------------------
echo "============================================================"
echo "  二、数据补录"
echo "============================================================"
echo ""

echo "[3.1] 补录模式导入 (supplement模式 - 补充缺失字段)"
curl -s -X POST "$API_BASE/api/import/slow-logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"mode": "supplement"}' | python3 -m json.tool
echo ""

echo "[3.2] 查看补录记录"
curl -s "$API_BASE/api/manual-confirmations" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 4. 人工确认
# ------------------------------------------------------------
echo "============================================================"
echo "  三、人工确认脏数据"
echo "============================================================"
echo ""

echo "[4.1] 查看所有慢查询日志（包含脏数据）"
curl -s "$API_BASE/api/slow-logs?include_dirty=true" | python3 -m json.tool
echo ""

echo "[4.2] 人工确认脏数据 - 修正SQL语法错误"
curl -s -X POST "$API_BASE/api/slow-logs/SQ2025060600012-BAD-SQL/confirm" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{
    "corrected_fields": {
      "query_sql": "SELECT report_date, SUM(stock_qty) FROM warehouse.inventory WHERE report_date = '\''2025-05-31'\'' GROUP BY report_date",
      "report_name": "库存汇总查询"
    },
    "reason": "修正SQL语法错误，补充逗号，确认数据可用"
  }' | python3 -m json.tool
echo ""

echo "[4.3] 人工确认脏数据 - 修正表名拼写"
curl -s -X POST "$API_BASE/api/slow-logs/SQ2025060400008-BAD-TABLE/confirm" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{
    "corrected_fields": {
      "source_table": "warehouse.inventory",
      "query_sql": "SELECT * FROM warehouse.inventory WHERE report_date = '\''2025-05-31'\''",
      "report_name": "库存查询"
    },
    "reason": "修正表名拼写错误: inventroy -> inventory"
  }' | python3 -m json.tool
echo ""

echo "[4.4] 查看人工确认记录"
curl -s "$API_BASE/api/manual-confirmations" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 5. 血缘分析
# ------------------------------------------------------------
echo "============================================================"
echo "  四、血缘分析"
echo "============================================================"
echo ""

echo "[5.1] 分析单条日志的血缘"
curl -s -X POST "$API_BASE/api/analyze/SQ2025060100001" \
  -H "X-User-Id: U001" | python3 -m json.tool
echo ""

echo "[5.2] 批量分析所有干净数据"
curl -s -X POST "$API_BASE/api/analyze/all" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"include_dirty": false}' | python3 -m json.tool
echo ""

echo "[5.3] 查看所有血缘分析结果"
curl -s "$API_BASE/api/lineage" | python3 -m json.tool
echo ""

echo "[5.4] 查看指定报表的所有版本血缘"
curl -s "$API_BASE/api/lineage/report/日报库存汇总" | python3 -m json.tool
echo ""

echo "[5.5] 人工确认血缘分析结果"
FIRST_LINEAGE_ID=$(curl -s "$API_BASE/api/lineage" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['lineage_id'])")
curl -s -X POST "$API_BASE/api/lineage/$FIRST_LINEAGE_ID/confirm" \
  -H "X-User-Id: U001" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 6. 迁移管理 - 状态变更与回滚
# ------------------------------------------------------------
echo "============================================================"
echo "  五、迁移管理 - 状态变更与回滚"
echo "============================================================"
echo ""

echo "[6.1] 查看迁移列表"
curl -s "$API_BASE/api/migrations" | python3 -m json.tool
echo ""

echo "[6.2] 模拟执行迁移（查看影响范围）"
curl -s -X POST "$API_BASE/api/migration/MIG20250601001/execute" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"simulate": true}' | python3 -m json.tool
echo ""

echo "[6.3] 真正执行迁移 - 状态从pending变为executed"
curl -s -X POST "$API_BASE/api/migration/MIG20250601001/execute" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"simulate": false}' | python3 -m json.tool
echo ""

echo "[6.4] 重新分析受影响的血缘（迁移后自动触发，这里演示手动触发）"
curl -s -X POST "$API_BASE/api/analyze/all" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"include_dirty": false}' | python3 -m json.tool
echo ""

echo "[6.5] 回滚迁移 - 状态从executed变为rolled_back，记录前后差别"
curl -s -X POST "$API_BASE/api/migration/MIG20250601001/rollback" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"reason": "口径调整方案需要重新评估，先回滚"}' | python3 -m json.tool
echo ""

echo "[6.6] 查看回滚历史"
curl -s "$API_BASE/api/rollback-history" | python3 -m json.tool
echo ""

echo "[6.7] 查看回滚的前后差别（并排对比）"
FIRST_ROLLBACK_ID=$(curl -s "$API_BASE/api/rollback-history" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['rollback_history'][0]['id'])")
curl -s "$API_BASE/api/rollback/$FIRST_ROLLBACK_ID/diff" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 7. 快照与新旧结论并排对比
# ------------------------------------------------------------
echo "============================================================"
echo "  六、快照与新旧结论并排对比"
echo "============================================================"
echo ""

echo "[7.1] 创建基线快照（迁移前）"
curl -s -X POST "$API_BASE/api/snapshot" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"snapshot_type": "baseline", "report_name": "日报库存汇总"}' | python3 -m json.tool
echo ""

echo "[7.2] 执行迁移后创建新快照"
# 先执行另一个迁移
curl -s -X POST "$API_BASE/api/migration/MIG20250610003/execute" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"simulate": false}' | python3 -m json.tool
echo ""

curl -s -X POST "$API_BASE/api/analyze/all" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"include_dirty": false}' | python3 -m json.tool
echo ""

curl -s -X POST "$API_BASE/api/snapshot" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"snapshot_type": "post_migration", "report_name": "日报库存汇总"}' | python3 -m json.tool
echo ""

echo "[7.3] 查看所有快照"
curl -s "$API_BASE/api/snapshots" | python3 -m json.tool
echo ""

echo "[7.4] 新旧快照并排对比"
SNAPSHOTS=$(curl -s "$API_BASE/api/snapshots" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ids=[s['snapshot_id'] for s in d['data']]
print(ids[0], ids[1])
")
SNAP1=$(echo $SNAPSHOTS | cut -d' ' -f1)
SNAP2=$(echo $SNAPSHOTS | cut -d' ' -f2)

curl -s -X POST "$API_BASE/api/snapshot/compare" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d "{\"snapshot_id_1\": \"$SNAP2\", \"snapshot_id_2\": \"$SNAP1\"}" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 8. 权限越权边界测试
# ------------------------------------------------------------
echo "============================================================"
echo "  七、权限越权边界测试"
echo "============================================================"
echo ""

echo "[8.1] 查看所有边界测试用例"
curl -s "$API_BASE/api/permission/boundary-test" | python3 -m json.tool
echo ""

echo "[8.2] 测试CASE-001: 分析师执行迁移（正常权限检查 - 拒绝）"
curl -s -X POST "$API_BASE/api/permission/boundary-test/CASE-001/run" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"override": false}' | python3 -m json.tool
echo ""

echo "[8.3] 测试CASE-001: 分析师执行迁移（越权覆盖 - 允许）"
curl -s -X POST "$API_BASE/api/permission/boundary-test/CASE-001/run" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"override": true}' | python3 -m json.tool
echo ""

echo "[8.4] 测试CASE-002: 工程师执行回滚（越权覆盖 - 允许）"
curl -s -X POST "$API_BASE/api/permission/boundary-test/CASE-002/run" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: U001" \
  -d '{"override": true}' | python3 -m json.tool
echo ""

echo "[8.5] 查看权限越权审计日志"
curl -s "$API_BASE/api/permission/audit-log" | python3 -m json.tool
echo ""

# ------------------------------------------------------------
# 9. 数据字典
# ------------------------------------------------------------
echo "============================================================"
echo "  八、数据字典"
echo "============================================================"
echo ""

echo "[9.1] 查看所有数据字典"
curl -s "$API_BASE/api/dictionary" | python3 -m json.tool
echo ""

echo "[9.2] 查看指定表的数据字典"
curl -s "$API_BASE/api/dictionary?table_name=warehouse.inventory" | python3 -m json.tool
echo ""

echo "============================================================"
echo "  示例执行完成！"
echo "============================================================"

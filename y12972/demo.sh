#!/usr/bin/env bash
set -e

BASE="http://127.0.0.1:5000"

echo "=== 1. 健康检查 ==="
curl -s "$BASE/api/health" | python3 -m json.tool
echo

echo "=== 2. 查看工单列表（首次启动有示例工单） ==="
curl -s "$BASE/api/work-orders" | python3 -m json.tool
echo

echo "=== 3. 创建一条新工单 ==="
curl -s -X POST "$BASE/api/work-orders" \
  -H "Content-Type: application/json" \
  -d '{"title":"演示-用户等级订正","applicant":"demo","target_table":"user_info","sql_statement":"UPDATE user_info SET level = \"V2\" WHERE uid = 8888"}' \
  | python3 -m json.tool
echo

echo "=== 4. 查看异常列表（含示例的 backup_gap 与 fk_broken） ==="
curl -s "$BASE/api/anomalies" | python3 -m json.tool
echo

echo "=== 5. 顺着异常 #2 反查：详情 + 处理记录 + 审计日志 ==="
curl -s "$BASE/api/anomalies/2" | python3 -m json.tool
echo

echo "=== 6. 复核异常 #1（backup_gap），模拟 DBA 口头约定→现在写入审计日志 ==="
curl -s -X POST "$BASE/api/anomalies/1/review" \
  -H "Content-Type: application/json" \
  -d '{"operator":"dba_zhang","reason":"备份缺口在可接受时间窗口内，备库已手动校验数据一致性"}' \
  | python3 -m json.tool
echo

echo "=== 7. 追加一条处理动作（执行订正），注意 rollback_available=true ==="
curl -s -X POST "$BASE/api/anomalies/1/process" \
  -H "Content-Type: application/json" \
  -d '{"action_type":"execute_correction","operator":"dba_zhang","detail":"备库执行订正 SQL，影响行数校验通过","affected_rows":1,"rollback_available":true,"rollback_sql":"UPDATE user_profile SET phone = \"OLD_VALUE\" WHERE id = 1001"}' \
  | python3 -m json.tool
echo

echo "=== 8. 导出该批次的报告 CSV（与回滚共用同一批处理记录） ==="
curl -s -o /tmp/demo_report.csv "$BASE/api/report/export?batch_id=BATCH-20260618-001"
echo "已导出到 /tmp/demo_report.csv，内容："
head -5 /tmp/demo_report.csv
echo

echo "=== 9. 查看批次全貌，用于验收：异常→处理记录→指标报表一条龙 ==="
curl -s "$BASE/api/batch/BATCH-20260618-001" | python3 -m json.tool
echo

echo "=== 演示完毕。可 curl $BASE/api/anomalies/1 再确认审计日志已写入。 ==="

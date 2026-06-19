#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "  图数据库关系巡检 - curl 示例脚本"
echo "=========================================="
echo ""

case "$1" in
  health)
    echo "--- 检查服务健康状态 ---"
    curl -s "$BASE_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/health"
    ;;

  dashboard)
    echo "--- 获取看板统计数据 ---"
    curl -s "$BASE_URL/api/statistics/dashboard" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/statistics/dashboard"
    ;;

  slow-queries)
    echo "--- 获取慢查询列表 ---"
    STATUS="${2:-}"
    SEVERITY="${3:-}"
    URL="$BASE_URL/api/slow-queries"
    PARAMS=""
    [ -n "$STATUS" ] && PARAMS="${PARAMS}status=$STATUS&"
    [ -n "$SEVERITY" ] && PARAMS="${PARAMS}severity=$SEVERITY&"
    [ -n "$PARAMS" ] && URL="$URL?${PARAMS%&}"
    curl -s "$URL" | python3 -m json.tool 2>/dev/null || curl -s "$URL"
    ;;

  items)
    echo "--- 获取巡检条目列表 ---"
    STATUS="${2:-pending}"
    curl -s "$BASE_URL/api/inspection-items?status=$STATUS" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/inspection-items?status=$STATUS"
    ;;

  item-detail)
    if [ -z "$2" ]; then
      echo "用法: $0 item-detail <条目ID>"
      echo "示例: $0 item-detail ITEM-001"
      exit 1
    fi
    echo "--- 巡检条目详情（含审计历史）---"
    curl -s "$BASE_URL/api/inspection-items/$2" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/inspection-items/$2"
    ;;

  handle-item)
    if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ]; then
      echo "用法: $0 handle-item <条目ID> <状态> <处理人> <处理意见>"
      echo "状态: resolved | approved | ignored | pending"
      echo "示例: $0 handle-item ITEM-003 approved zhangwei \"月底盘点期间批量操作为正常业务\""
      exit 1
    fi
    echo "--- 处理巡检条目 ---"
    curl -s -X PUT "$BASE_URL/api/inspection-items/$2/status" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"$3\",\"handler\":\"$4\",\"handle_opinion\":\"$5\",\"operator\":\"$4\"}" \
      | python3 -m json.tool 2>/dev/null || curl -s -X PUT "$BASE_URL/api/inspection-items/$2/status" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"$3\",\"handler\":\"$4\",\"handle_opinion\":\"$5\",\"operator\":\"$4\"}"
    echo ""
    echo ""
    echo "提示：处理完成后，可以通过 item-detail 查看审计历史"
    ;;

  batches)
    echo "--- 获取巡检批次列表 ---"
    curl -s "$BASE_URL/api/batches" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/batches"
    ;;

  batch-detail)
    if [ -z "$2" ]; then
      echo "用法: $0 batch-detail <批次ID>"
      echo "示例: $0 batch-detail BATCH-2026-06-19-001"
      exit 1
    fi
    echo "--- 批次详情（含慢查询、备份记录）---"
    curl -s "$BASE_URL/api/batches/$2" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/batches/$2"
    ;;

  create-batch)
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "用法: $0 create-batch <批次类型> <操作人> [备注]"
      echo "批次类型: daily_inspection | backup_verification | special_inspection"
      echo "示例: $0 create-batch backup_verification zhangwei \"夜间备份校验\""
      exit 1
    fi
    REMARK="${4:-}"
    echo "--- 创建巡检批次 ---"
    curl -s -X POST "$BASE_URL/api/batches" \
      -H "Content-Type: application/json" \
      -d "{\"batch_type\":\"$2\",\"operator\":\"$3\",\"remark\":\"$REMARK\"}" \
      | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/batches" \
      -H "Content-Type: application/json" \
      -d "{\"batch_type\":\"$2\",\"operator\":\"$3\",\"remark\":\"$REMARK\"}"
    ;;

  reports)
    echo "--- 获取巡检报告列表 ---"
    curl -s "$BASE_URL/api/reports" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/reports"
    ;;

  report-detail)
    if [ -z "$2" ]; then
      echo "用法: $0 report-detail <报告ID>"
      echo "示例: $0 report-detail REPORT-2026-06-19-001"
      exit 1
    fi
    echo "--- 报告详情（含普通话解释）---"
    curl -s "$BASE_URL/api/reports/$2" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/reports/$2"
    ;;

  audit)
    echo "--- 审计追踪记录 ---"
    TARGET_TYPE="${2:-}"
    OPERATOR="${3:-}"
    URL="$BASE_URL/api/audit-trail"
    PARAMS=""
    [ -n "$TARGET_TYPE" ] && PARAMS="${PARAMS}target_type=$TARGET_TYPE&"
    [ -n "$OPERATOR" ] && PARAMS="${PARAMS}operator=$OPERATOR&"
    [ -n "$PARAMS" ] && URL="$URL?${PARAMS%&}"
    curl -s "$URL" | python3 -m json.tool 2>/dev/null || curl -s "$URL"
    ;;

  backups)
    echo "--- 备份校验记录 ---"
    curl -s "$BASE_URL/api/backup-records" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/api/backup-records"
    ;;

  trace-back)
    if [ -z "$2" ]; then
      echo "用法: $0 trace-back <条目ID>"
      echo "功能：顺着一条异常往回查，关联慢查询日志和处理意见"
      echo "示例: $0 trace-back ITEM-003"
      exit 1
    fi
    echo "=========================================="
    echo "  异常追溯：$2"
    echo "=========================================="
    echo ""
    echo "--- 第一步：查看巡检条目详情 ---"
    ITEM_DATA=$(curl -s "$BASE_URL/api/inspection-items/$2")
    echo "$ITEM_DATA" | python3 -m json.tool 2>/dev/null || echo "$ITEM_DATA"
    echo ""

    BATCH_ID=$(echo "$ITEM_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['item']['batch_id'])" 2>/dev/null)
    if [ -n "$BATCH_ID" ]; then
      echo "--- 第二步：追溯所属批次 [$BATCH_ID] ---"
      echo "关联备份校验与慢查询归因共用同一批次"
      curl -s "$BASE_URL/api/batches/$BATCH_ID" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'  批次号: {data[\"batch\"][\"batch_id\"]}')
print(f'  类型: {data[\"batch\"][\"batch_type\"]}')
print(f'  操作人: {data[\"batch\"][\"operator\"]}')
print(f'  慢查询数: {data[\"batch\"][\"slow_query_count\"]}')
print(f'  备份校验: {data[\"batch\"][\"backup_verified\"]}/{data[\"batch\"][\"backup_total\"]}')
print(f'  备注: {data[\"batch\"][\"remark\"]}')
" 2>/dev/null || echo "批次数据获取失败"
      echo ""
    fi

    SQ_ID=$(echo "$ITEM_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin)['item']; print(d.get('slow_query_id',''))" 2>/dev/null)
    if [ -n "$SQ_ID" ]; then
      echo "--- 第三步：追溯原始慢查询日志 ---"
      curl -s "$BASE_URL/api/slow-queries/$SQ_ID" | python3 -c "
import sys, json
q = json.load(sys.stdin)
print(f'  查询ID: {q[\"query_id\"]}')
print(f'  类型: {q[\"query_type\"]}')
print(f'  执行时间: {q[\"execution_time_ms\"]/1000:.2f}s')
print(f'  锁等待: {q[\"lock_wait_time_ms\"]/1000:.2f}s')
print(f'  扫描行数: {q.get(\"rows_scanned\",0):,}')
print(f'  数据库: {q[\"database_name\"]}')
print(f'  调用方: {q[\"caller_user\"]} @ {q[\"caller_ip\"]}')
print(f'  严重程度: {q[\"severity\"]}')
print(f'  查询语句: {q[\"query_text\"][:100]}...')
" 2>/dev/null || echo "慢查询数据获取失败"
      echo ""
    fi

    echo "--- 第四步：审计操作历史 ---"
    curl -s "$BASE_URL/api/audit-trail?target_type=inspection_item&target_id=$2" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['data']:
    print(f'  [{item[\"created_at\"]}] {item[\"operator\"]}')
    print(f'    动作: {item[\"action_type\"]}')
    print(f'    {item[\"old_value\"]} -> {item[\"new_value\"]}')
    print(f'    原因: {item.get(\"reason\",\"无\")}')
    print()
" 2>/dev/null || echo "审计记录获取失败"
    ;;

  *)
    echo "可用命令："
    echo ""
    echo "基础查询："
    echo "  $0 health              检查服务状态"
    echo "  $0 dashboard           看板统计数据"
    echo "  $0 slow-queries [状态] [严重度]  慢查询列表"
    echo "  $0 items [状态]        巡检条目列表 (默认pending)"
    echo "  $0 batches             巡检批次列表"
    echo "  $0 reports             巡检报告列表"
    echo "  $0 backups             备份校验记录"
    echo "  $0 audit [类型] [操作人]  审计追踪记录"
    echo ""
    echo "详情查询："
    echo "  $0 item-detail <ID>    巡检条目详情（含审计历史）"
    echo "  $0 batch-detail <ID>   批次详情（含慢查询+备份）"
    echo "  $0 report-detail <ID>  报告详情（含普通话解释）"
    echo ""
    echo "操作命令："
    echo "  $0 handle-item <ID> <状态> <处理人> <意见>  处理巡检条目"
    echo "  $0 create-batch <类型> <操作人> [备注]      创建巡检批次"
    echo ""
    echo "审计追溯（核心功能）："
    echo "  $0 trace-back <条目ID> 顺着一条异常往回查（完整链路）"
    echo ""
    echo "示例："
    echo "  $0 trace-back ITEM-003"
    echo "  $0 handle-item ITEM-005 approved liming \"业务高峰期正常操作\""
    echo "  $0 slow-queries critical pending"
    ;;
esac

echo ""

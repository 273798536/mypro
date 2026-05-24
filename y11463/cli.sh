#!/bin/bash

BASE_URL="http://localhost:8000"

show_help() {
    echo "口腔门诊材料验收回放链路服务 - 命令行工具"
    echo ""
    echo "用法: $0 <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  create <batch_no>           - 创建批次"
    echo "  submit <batch_id>           - 提交审核"
    echo "  withdraw <batch_id> <原因>  - 撤回批次"
    echo "  verify <batch_id> <pass|reject> [原因]"
    echo "  judge <batch_id> <new_status> <原因> - 人工改判"
    echo "  freeze <batch_id> <原因>    - 冻结批次"
    echo "  reconcile <batch_id>        - 对账"
    echo "  export <batch_id>           - 导出"
    echo "  history <batch_id>          - 查看操作历史"
    echo "  list                        - 列出所有批次"
    echo "  get <batch_id>              - 查看批次详情"
    echo ""
    echo "  test-idempotent             - 测试幂等性"
    echo "  test-workflow               - 测试完整流程"
    echo "  test-abnormal               - 制造异常并对账"
}

call_api() {
    method=$1
    path=$2
    data=$3
    operator=${4:-"cli-user"}
    
    if [ -n "$data" ]; then
        curl -s -X $method "$BASE_URL$path" \
            -H "Content-Type: application/json" \
            -H "X-Operator: $operator" \
            -d "$data"
    else
        curl -s -X $method "$BASE_URL$path" \
            -H "X-Operator: $operator"
    fi
    echo ""
}

case "$1" in
    create)
        if [ -z "$2" ]; then
            echo "请提供批次号"
            exit 1
        fi
        data=$(python3 scripts/generate_data.py normal | sed "s/BATCH-001/$2/")
        call_api POST "/batches" "$data" "cli-creator"
        ;;
    submit)
        call_api POST "/batches/$2/submit" "" "cli-submitter"
        ;;
    withdraw)
        call_api POST "/batches/$2/withdraw?reason=$3" "" "cli-withdrawer"
        ;;
    verify)
        is_pass="true"
        if [ "$3" = "reject" ]; then
            is_pass="false"
        fi
        call_api POST "/batches/$2/verify?is_pass=$is_pass&reject_reason=$4" "" "cli-verifier"
        ;;
    judge)
        data="{\"new_status\": \"$3\", \"judge_reason\": \"$4\"}"
        call_api POST "/batches/$2/judge" "$data" "cli-director"
        ;;
    freeze)
        call_api POST "/batches/$2/freeze?freeze_reason=$3" "" "cli-admin"
        ;;
    reconcile)
        call_api POST "/batches/$2/reconcile" "" "cli-auditor"
        ;;
    export)
        curl -s -X GET "$BASE_URL/batches/$2/export" \
            -H "X-Operator: cli-exporter" \
            -o "batch_$2_export.xlsx"
        echo "已导出到 batch_$2_export.xlsx"
        ;;
    history)
        call_api GET "/batches/$2/history"
        ;;
    list)
        call_api GET "/batches"
        ;;
    get)
        call_api GET "/batches/$2"
        ;;
    test-idempotent)
        echo "=== 测试幂等性: 重复提交同一批次 ==="
        data=$(python3 scripts/generate_data.py normal)
        
        echo ""
        echo "第1次提交:"
        call_api POST "/batches" "$data" "tester"
        
        echo ""
        echo "第2次提交 (replay_strategy=ignore):"
        call_api POST "/batches" "$data" "tester"
        
        echo ""
        echo "第3次提交 (replay_strategy=overwrite):"
        data_overwrite=$(echo "$data" | sed 's/"replay_strategy": "ignore"/"replay_strategy": "overwrite"/')
        call_api POST "/batches" "$data_overwrite" "tester"
        ;;
    test-workflow)
        echo "=== 测试完整流程 ==="
        
        echo ""
        echo "1. 创建批次:"
        create_result=$(call_api POST "/batches" "$(python3 scripts/generate_data.py normal)" "nurse-zhang")
        batch_id=$(echo "$create_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('batch_id',''))")
        echo "批次ID: $batch_id"
        
        sleep 1
        
        echo ""
        echo "2. 提交审核:"
        call_api POST "/batches/$batch_id/submit" "" "nurse-zhang"
        
        sleep 1
        
        echo ""
        echo "3. 审核通过:"
        call_api POST "/batches/$batch_id/verify?is_pass=true" "" "doctor-wang"
        
        sleep 1
        
        echo ""
        echo "4. 对账:"
        call_api POST "/batches/$batch_id/reconcile" "" "auditor-li"
        
        sleep 1
        
        echo ""
        echo "5. 冻结 (导出前):"
        call_api POST "/batches/$batch_id/freeze?freeze_reason=导出前锁定" "" "admin"
        
        sleep 1
        
        echo ""
        echo "6. 导出:"
        curl -s -X GET "$BASE_URL/batches/$batch_id/export" -H "X-Operator: admin" -o "workflow_test_export.xlsx"
        echo "已导出到 workflow_test_export.xlsx"
        
        echo ""
        echo "7. 查看操作历史:"
        call_api GET "/batches/$batch_id/history"
        ;;
    test-abnormal)
        echo "=== 制造异常并对账 ==="
        
        echo ""
        echo "1. 创建异常批次 (型号变更但未更新病历/库存):"
        data=$(python3 scripts/generate_data.py abnormal)
        create_result=$(call_api POST "/batches" "$data" "nurse-zhang")
        batch_id=$(echo "$create_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('batch_id',''))")
        echo "批次ID: $batch_id"
        
        sleep 1
        
        echo ""
        echo "2. 提交并通过:"
        call_api POST "/batches/$batch_id/submit" "" "nurse-zhang"
        sleep 1
        call_api POST "/batches/$batch_id/verify?is_pass=true" "" "doctor-wang"
        
        sleep 1
        
        echo ""
        echo "3. 对账 (应发现异常):"
        call_api POST "/batches/$batch_id/reconcile" "" "auditor-li"
        
        echo ""
        echo "4. 查看异常状态的批次:"
        call_api GET "/batches/$batch_id"
        ;;
    *)
        show_help
        ;;
esac

#!/bin/bash

BASE_URL="http://localhost:8000"
API_PREFIX="/api/v1"
ADMIN_TOKEN="admin-token-bid-2024"
READ_TOKEN="read-token-bid-2024"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

api_get() {
    local endpoint=$1
    local token=${2:-$ADMIN_TOKEN}
    curl -s -H "X-Auth-Token: $token" "$BASE_URL$API_PREFIX$endpoint"
}

api_post() {
    local endpoint=$1
    local data=$2
    local token=${3:-$ADMIN_TOKEN}
    curl -s -X POST \
        -H "X-Auth-Token: $token" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$BASE_URL$API_PREFIX$endpoint"
}

api_post_file() {
    local endpoint=$1
    local file_path=$2
    local form_data=$3
    local token=${4:-$ADMIN_TOKEN}
    
    local form_parts=()
    form_parts+=("-F" "file=@$file_path")
    
    if [ -n "$form_data" ]; then
        IFS=';' read -ra pairs <<< "$form_data"
        for pair in "${pairs[@]}"; do
            IFS='=' read -r key value <<< "$pair"
            form_parts+=("-F" "$key=$value")
        done
    fi
    
    curl -s -X POST \
        -H "X-Auth-Token: $token" \
        "${form_parts[@]}" \
        "$BASE_URL$API_PREFIX$endpoint"
}

api_put() {
    local endpoint=$1
    local data=$2
    local token=${3:-$ADMIN_TOKEN}
    curl -s -X PUT \
        -H "X-Auth-Token: $token" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$BASE_URL$API_PREFIX$endpoint"
}

wait_for_service() {
    echo "等待服务启动..."
    for i in {1..30}; do
        if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
            print_success "服务已启动"
            return 0
        fi
        sleep 1
    done
    print_error "服务启动超时"
    return 1
}

case "$1" in
    start)
        print_header "启动服务"
        python3 main.py
        ;;
    
    install)
        print_header "安装依赖"
        pip3 install -r requirements.txt
        print_success "依赖安装完成"
        ;;
    
    test)
        print_header "运行自动化检查"
        python3 auto_check.py
        ;;
    
    health)
        print_header "健康检查"
        result=$(curl -s "$BASE_URL$API_PREFIX/health")
        echo "$result" | python3 -m json.tool
        ;;
    
    list-docs)
        print_header "文档列表"
        api_get "/documents" | python3 -m json.tool
        ;;
    
    create-doc)
        print_header "创建文档"
        DOC_NO=${2:-"BID-$(date +%Y%m%d%H%M%S)"}
        TITLE=${3:-"测试文档"}
        TYPE=${4:-"qualification"}
        
        data="{\"document_no\": \"$DOC_NO\", \"title\": \"$TITLE\", \"document_type\": \"$TYPE\", \"created_by\": \"cli\"}"
        api_post "/documents" "$data" | python3 -m json.tool
        print_success "文档已创建: $DOC_NO"
        ;;
    
    get-doc)
        print_header "文档详情"
        api_get "/documents/$2" | python3 -m json.tool
        ;;
    
    list-versions)
        print_header "版本历史"
        api_get "/documents/$2/versions" | python3 -m json.tool
        ;;
    
    import)
        print_header "导入文件"
        FILE_PATH=$2
        DOC_TYPE=${3:-"qualification"}
        IMPORTED_BY=${4:-"cli"}
        
        if [ ! -f "$FILE_PATH" ]; then
            print_error "文件不存在: $FILE_PATH"
            exit 1
        fi
        
        api_post_file "/import" "$FILE_PATH" "document_type=$DOC_TYPE;imported_by=$IMPORTED_BY" | python3 -m json.tool
        print_success "文件导入完成"
        ;;
    
    list-imports)
        print_header "导入记录"
        api_get "/imports" | python3 -m json.tool
        ;;
    
    export)
        print_header "导出数据"
        EXPORT_TYPE=${2:-"all"}
        EXPORTED_BY=${3:-"cli"}
        
        data="{\"export_type\": \"$EXPORT_TYPE\", \"exported_by\": \"$EXPORTED_BY\"}"
        api_post "/export" "$data" | python3 -m json.tool
        print_success "导出任务已提交"
        ;;
    
    list-exports)
        print_header "导出记录"
        api_get "/exports" | python3 -m json.tool
        ;;
    
    list-tasks)
        print_header "任务列表"
        STATUS=${2:-""}
        if [ -n "$STATUS" ]; then
            api_get "/tasks?status=$STATUS" | python3 -m json.tool
        else
            api_get "/tasks" | python3 -m json.tool
        fi
        ;;
    
    get-task)
        print_header "任务详情"
        api_get "/tasks/$2" | python3 -m json.tool
        ;;
    
    replay-task)
        print_header "回放异常任务"
        api_post "/tasks/$2/replay" "{}" | python3 -m json.tool
        print_success "任务回放请求已发送"
        ;;
    
    reconcile)
        print_header "对账对比"
        LEFT_ID=$2
        RIGHT_ID=$3
        RECONCILED_BY=${4:-"cli"}
        
        data="{\"left_document_id\": $LEFT_ID, \"right_document_id\": $RIGHT_ID, \"reconciled_by\": \"$RECONCILED_BY\"}"
        api_post "/reconcile" "$data" | python3 -m json.tool
        print_success "对账完成"
        ;;
    
    audit-logs)
        print_header "审计日志"
        api_get "/audit-logs?limit=$2" | python3 -m json.tool
        ;;
    
    generate-test)
        print_header "生成测试数据"
        COUNT=${2:-5}
        data="{\"document_count\": $COUNT, \"with_tasks\": true, \"generated_by\": \"cli\"}"
        api_post "/test-data/generate" "$data" | python3 -m json.tool
        print_success "测试数据生成完成"
        ;;
    
    manual-handle)
        print_header "人工处理任务"
        TASK_ID=$2
        NOTE=${3:-"人工处理备注"}
        HANDLER=${4:-"cli"}
        NEW_STATUS=${5:-"waiting_manual"}
        
        data="{\"manual_note\": \"$NOTE\", \"handled_by\": \"$HANDLER\", \"new_status\": \"$NEW_STATUS\"}"
        api_post "/tasks/$TASK_ID/manual-handle" "$data" | python3 -m json.tool
        print_success "人工处理已记录"
        ;;
    
    cross-check)
        print_header "跨材料核对"
        PROJECT_NO=${2:-"default"}
        RECONCILED_BY=${3:-"cli"}
        
        api_post "/cross-material-reconcile?project_no=$PROJECT_NO&reconciled_by=$RECONCILED_BY" "{}" | python3 -m json.tool
        print_success "跨材料核对完成"
        ;;
    
    who-changed)
        print_header "谁改了哪页"
        DOC_ID=$2
        api_get "/documents/$DOC_ID/field-changes" | python3 -m json.tool
        print_success "变更记录查询完成"
        ;;
    
    update-with-track)
        print_header "追踪式更新"
        DOC_ID=$2
        FIELD=$3
        NEW_VALUE=$4
        REASON=${5:-"更新内容"}
        UPDATER=${6:-"cli"}
        
        data="{\"content\": {\"$FIELD\": \"$NEW_VALUE\"}, \"change_reason\": \"$REASON\", \"updated_by\": \"$UPDATER\"}"
        api_put "/documents/$DOC_ID/with-tracking" "$data" | python3 -m json.tool
        print_success "追踪式更新完成"
        ;;
    
    export-chain)
        print_header "导出完整历史链路"
        DOC_ID=$2
        EXPORTED_BY=${3:-"cli"}
        api_post "/export-full-chain/$DOC_ID?exported_by=$EXPORTED_BY" "{}" | python3 -m json.tool
        print_success "链路导出完成"
        ;;
    
    view-chain)
        print_header "查看完整历史链路"
        DOC_ID=$2
        api_get "/documents/$DOC_ID/export-full-chain" | python3 -m json.tool
        ;;
    
    docs)
        print_header "API文档"
        echo "Swagger UI: $BASE_URL/docs"
        echo "ReDoc: $BASE_URL/redoc"
        open "$BASE_URL/docs" 2>/dev/null || echo "请在浏览器中打开: $BASE_URL/docs"
        ;;
    
    help|*)
        echo "投标资料封版验收回放链路服务 - 命令行工具"
        echo ""
        echo "用法: ./cli.sh <命令> [参数]"
        echo ""
        echo "服务命令:"
        echo "  start              启动服务"
        echo "  install            安装依赖"
        echo "  test               运行自动化检查"
        echo "  health             健康检查"
        echo "  docs               打开API文档"
        echo ""
        echo "文档命令:"
        echo "  list-docs                  文档列表"
        echo "  create-doc [编号] [标题] [类型]  创建文档"
        echo "  get-doc <id>               文档详情"
        echo "  list-versions <id>         版本历史"
        echo "  update-with-track <id> <字段> <新值> [原因] [操作人]  追踪式更新"
        echo "  who-changed <id>           谁改了哪页/哪个字段"
        echo ""
        echo "导入导出:"
        echo "  import <文件路径> [类型] [导入人]  导入文件 (支持csv/xlsx/zip/tar.gz)"
        echo "  list-imports               导入记录"
        echo "  export [类型] [导出人]     导出数据列表"
        echo "  export-chain <id> [导出人]  导出完整历史链路"
        echo "  view-chain <id>            查看完整历史链路"
        echo "  list-exports               导出记录"
        echo ""
        echo "任务命令:"
        echo "  list-tasks [状态]          任务列表"
        echo "  get-task <task_id>         任务详情"
        echo "  replay-task <task_id>      回放异常任务"
        echo "  manual-handle <task_id> [备注] [处理人] [状态]  人工处理任务"
        echo ""
        echo "核对回放:"
        echo "  reconcile <左id> <右id>    文档对账对比"
        echo "  cross-check [项目号] [核对人]  跨材料核对(资质+报价+盖章)"
        echo ""
        echo "其他命令:"
        echo "  audit-logs [条数]          审计日志"
        echo "  generate-test [数量]       生成测试数据"
        echo ""
        echo "文档类型: qualification(资质), quotation(报价), stamped(盖章)"
        echo "         history_archive(历史压缩包), supplement(临时补录)"
        echo "任务状态: pending, running, waiting_retry, waiting_manual"
        echo "         permanent_failed, completed"
        echo ""
        echo "示例:"
        echo "  ./cli.sh install"
        echo "  ./cli.sh start"
        echo "  ./cli.sh test"
        echo "  ./cli.sh create-doc DOC-001 \"资质文件\" qualification"
        echo "  ./cli.sh import data.csv qualification admin"
        echo "  ./cli.sh import history.zip history_archive admin"
        echo "  ./cli.sh update-with-track 1 company_name \"新公司名\" \"发票抬头变更\" admin"
        echo "  ./cli.sh who-changed 1"
        echo "  ./cli.sh cross-check"
        echo "  ./cli.sh export-chain 1"
        ;;
esac

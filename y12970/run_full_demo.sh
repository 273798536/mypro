#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
APP="$PROJECT_DIR/app.py"
LOG="$PROJECT_DIR/server.log"
PID_FILE="$PROJECT_DIR/.server.pid"
DB="$PROJECT_DIR/audit_platform.db"
PORT=5001

cd "$PROJECT_DIR"

echo "============================================================"
echo " 事务隔离异常演示 - 一键运行脚本"
echo "============================================================"
echo

cleanup() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo
            echo "🛑 停止服务 (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            sleep 1
        fi
        rm -f "$PID_FILE"
    fi
}
trap cleanup EXIT

step() {
    echo
    echo "[$(date '+%H:%M:%S')] ▶ $1"
}

step_ok() {
    echo "  ✅ $1"
}

step_fail() {
    echo "  ❌ $1"
    exit 1
}

echo "📋 [步骤 1/6] 检查环境..."

if [ ! -d "$VENV_DIR" ]; then
    echo "  ⚠️  未检测到虚拟环境，正在创建..."
    python3 -m venv "$VENV_DIR"
    step_ok "虚拟环境创建完成"
else
    step_ok "虚拟环境已存在"
fi

source "$VENV_DIR/bin/activate"

echo "  正在检查依赖..."
pip install -q Flask Flask-SQLAlchemy openpyxl pandas 2>/dev/null
step_ok "依赖检查完成"

if [ -f "$DB" ]; then
    echo "  ⚠️  检测到旧数据库，备份为 audit_platform.db.bak"
    cp -f "$DB" "$DB.bak" 2>/dev/null || true
    rm -f "$DB"
fi

rm -rf "$PROJECT_DIR/reports"
mkdir -p "$PROJECT_DIR/reports"

echo
echo "📋 [步骤 2/6] 启动服务..."

nohup python "$APP" > "$LOG" 2>&1 &
echo $! > "$PID_FILE"
SERVER_PID=$(cat "$PID_FILE")

echo "  服务PID: $SERVER_PID"
echo "  日志文件: $LOG"
echo "  等待服务启动..."

for i in $(seq 1 15); do
    sleep 1
    if curl -s "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
        step_ok "服务已启动 http://127.0.0.1:$PORT"
        break
    fi
    if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
        echo "  ❌ 服务启动失败，查看日志:"
        cat "$LOG"
        exit 1
    fi
    echo -n "."
done

echo
echo "📋 [步骤 3/6] 运行功能测试（含重复导入场景）..."

TEST_OUTPUT="$PROJECT_DIR/test_output.txt"
python "$PROJECT_DIR/scripts/test_core_logic.py" 2>&1 | tee "$TEST_OUTPUT"
TEST_EXIT=${PIPESTATUS[0]}

if [ $TEST_EXIT -ne 0 ]; then
    step_fail "功能测试失败，详见 $TEST_OUTPUT"
fi
step_ok "所有功能测试通过"

echo
echo "📋 [步骤 4/6] 运行 curl 完整示例..."

bash "$PROJECT_DIR/scripts/curl_examples.sh"
step_ok "curl 示例执行完成"

echo
echo "📋 [步骤 5/6] 检查生成产物..."

REPORT_COUNT=$(ls -1 "$PROJECT_DIR/reports" 2>/dev/null | wc -l | tr -d ' ')
echo "  reports/ 目录下文件数: $REPORT_COUNT"
ls -lh "$PROJECT_DIR/reports" 2>/dev/null || true

if [ -f "$PROJECT_DIR/audit_report.xlsx" ]; then
    step_ok "curl示例导出的报告: $PROJECT_DIR/audit_report.xlsx"
fi

echo
echo "📋 [步骤 6/6] 展示最终成果..."
echo
echo "============================================================"
echo "  🎉 事务隔离异常演示 - 完整流程跑通！"
echo "============================================================"
echo
echo "  📁 项目目录: $PROJECT_DIR"
echo "  🗄️  数据库: $DB"
echo "  📊 测试报告: $TEST_OUTPUT"
echo "  📄 审计报告(Excel):"
for f in "$PROJECT_DIR/reports"/*.xlsx "$PROJECT_DIR"/audit_report.xlsx 2>/dev/null; do
    [ -f "$f" ] && echo "       - $f ($(du -h "$f" | cut -f1))"
done
echo
echo "  📖 主要API:"
echo "     GET  /api/health                 - 健康检查"
echo "     POST /api/import/permissions     - 导入权限清单"
echo "     POST /api/import/<batch>/rollback- 回滚批次"
echo "     POST /api/detect/violations      - 越权检测"
echo "     GET  /api/violations             - 违规列表(含可用性标记)"
echo "     POST /api/backup/register        - 注册备份"
echo "     POST /api/backup/<id>/verify     - 备份校验(缺字段时给可操作建议)"
echo "     POST /api/schema/compare         - Schema对比"
echo "     GET  /api/report/export          - 导出审计报告给审计组"
echo
echo "  💡 同事从空目录跑通流程的方法:"
echo "     1. 拷贝当前整个目录"
echo "     2. 执行: bash $PROJECT_DIR/run_full_demo.sh"
echo "     3. 查看 reports/ 下的审计报告即可"
echo
echo "============================================================"

echo
echo "按任意键停止服务并退出..."
read -r _

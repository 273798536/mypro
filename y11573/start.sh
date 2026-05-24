#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================="
echo "客服工单升级验收回放链路系统 - 启动脚本"
echo "Customer Service Ticket Playback System"
echo "=============================================="

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "=============================================="
echo "可用命令:"
echo "  ./start.sh init      - 初始化数据库"
echo "  ./start.sh data      - 生成测试数据"
echo "  ./start.sh server    - 启动API服务"
echo "  ./start.sh checks    - 运行自动化检查"
echo "  ./start.sh all       - 完整初始化并启动"
echo "  ./start.sh import <file> - 导入JSON/CSV文件"
echo "=============================================="
echo ""

COMMAND="${1:-all}"

case $COMMAND in
    init)
        echo "初始化数据库..."
        python3 -c "from app.database import init_database; init_database(); print('数据库初始化完成!')"
        ;;
        
    data)
        echo "生成测试数据..."
        python3 scripts/generate_data.py --tickets 50 --json-file data/test_import.json --json-count 20
        ;;
        
    server)
        echo "启动API服务..."
        python3 run.py
        ;;
        
    checks)
        echo "运行自动化检查..."
        python3 scripts/automated_checks.py
        ;;
        
    import)
        if [ -z "$2" ]; then
            echo "错误: 请指定要导入的文件路径"
            exit 1
        fi
        echo "导入文件: $2"
        python3 -c "
import sys
sys.path.insert(0, '.')
from app.services.import_service import ImportService
result = ImportService.import_from_file('$2', imported_by='script')
import json
print(json.dumps(result, ensure_ascii=False, indent=2))
"
        ;;
        
    all)
        echo "完整初始化..."
        echo ""
        
        echo "[1/4] 初始化数据库..."
        python3 -c "from app.database import init_database; init_database()"
        
        echo ""
        echo "[2/4] 生成测试数据..."
        python3 scripts/generate_data.py --tickets 30
        
        echo ""
        echo "[3/4] 生成导入测试文件..."
        python3 scripts/generate_data.py --json-file data/test_import.json --json-count 15
        
        echo ""
        echo "[4/4] 启动服务..."
        echo ""
        python3 run.py
        ;;
        
    *)
        echo "未知命令: $COMMAND"
        echo "使用 './start.sh help' 查看可用命令"
        exit 1
        ;;
esac

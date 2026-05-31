#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "  运行电动车续航衰减诊断系统测试"
echo "========================================"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt -q

echo ""
echo "Running tests..."
echo ""

python -m pytest battery_diagnosis/tests/test_diagnosis.py -v --tb=short $@

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 所有测试通过!"
else
    echo "❌ 部分测试失败，退出码: $TEST_EXIT_CODE"
fi

exit $TEST_EXIT_CODE

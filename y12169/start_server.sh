#!/bin/bash

cd "$(dirname "$0")"

echo "========================================"
echo "  电动车续航衰减诊断系统"
echo "========================================"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt -q

echo "Starting server on http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""

python -m uvicorn battery_diagnosis.api.main:app --host 0.0.0.0 --port 8000 --reload

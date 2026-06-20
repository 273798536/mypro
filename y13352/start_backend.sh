#!/bin/bash
cd "$(dirname "$0")/backend"
echo "Starting backend on http://127.0.0.1:8000..."
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000

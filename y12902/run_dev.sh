#!/bin/bash
set -e
cd "$(dirname "$0")"
[ -f eval_platform.db ] && rm -f eval_platform.db
source venv/bin/activate
streamlit run app.py --server.headless true --server.port 8502 2>&1

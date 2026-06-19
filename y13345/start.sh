#!/bin/bash
cd "$(dirname "$0")"
export FLASK_APP=backend/app.py
export FLASK_DEBUG=1
python3 -m flask run --port 5000

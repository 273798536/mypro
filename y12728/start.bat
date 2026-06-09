@echo off
cd /d "%~dp0"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt
set PYTHONPATH=%cd%
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

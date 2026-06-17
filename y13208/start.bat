@echo off
echo ========================================
echo   🎙️  录音棚时码异常提醒后端服务
echo ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 python，请先安装 Python 3.8+
    exit /b 1
)

echo 📦 检查依赖...
python -c "import fastapi, uvicorn, pydantic" 2>nul || (
    echo 📦 安装依赖...
    pip install -r requirements.txt
)

if not exist uploads mkdir uploads
if not exist reports mkdir reports
if not exist static mkdir static

set TIMECODE_DB=timecode_anomaly_api.db
set TIMECODE_UPLOAD_DIR=uploads
set TIMECODE_REPORT_DIR=reports
set TIMECODE_STATIC_DIR=static

echo.
echo 🚀 启动服务...
echo    API 文档:  http://localhost:8000/docs
echo    前端页面:  http://localhost:8000/static/index.html
echo    健康检查:  http://localhost:8000/api/health
echo.
echo 按 Ctrl+C 停止服务
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

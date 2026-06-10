@echo off
REM ============================================================
REM 反应热安全预警系统 - 快速启动脚本 (Windows)
REM ============================================================

echo ============================================
echo   反应热安全预警系统 - 快速启动
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js 18+ 版本
    echo    下载地址: https://nodejs.org/
    exit /b 1
)

if not exist node_modules (
    echo 📦 正在安装依赖...
    call npm install
    echo.
)

echo 🚀 启动开发服务器...
echo    - 前端地址: http://localhost:5173
echo    - 后端地址: http://localhost:3001
echo.
echo 💡 第一份样例位置: samples\weighing_success.csv
echo.

call npm run dev

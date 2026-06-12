#!/bin/bash
set -e

echo "=============================================="
echo "  海上施工禁区核查系统 - 完整演示流程"
echo "=============================================="

echo ""
echo "[1/5] 激活虚拟环境..."
source venv/bin/activate

echo ""
echo "[2/5] 加载样例数据（含风浪预报晚到场景）..."
python3 sample_data.py

echo ""
echo "[3/5] 启动 API 服务（后台运行）..."
if [ -f "app.pid" ]; then
    OLD_PID=$(cat app.pid)
    if kill -0 $OLD_PID 2>/dev/null; then
        kill $OLD_PID
        echo "已停止旧服务 (PID: $OLD_PID)"
    fi
fi

python3 app.py > app.log 2>&1 &
echo $! > app.pid
APP_PID=$(cat app.pid)
echo "服务已启动 (PID: $APP_PID)"

echo ""
echo "[4/5] 等待服务就绪..."
for i in {1..10}; do
    if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
        echo "服务已就绪 ✓"
        break
    fi
    echo "等待中... ($i/10)"
    sleep 1
done

echo ""
echo "[5/5] 执行完整演示流程..."
echo ""
echo "--------------------------------------------------"
echo "  步骤 1: 检查服务状态"
echo "--------------------------------------------------"
curl -s http://localhost:5001/api/health | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  步骤 2: 查看所有核查记录"
echo "--------------------------------------------------"
curl -s http://localhost:5001/api/records | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  步骤 3: 执行风险评估"
echo "--------------------------------------------------"
curl -s -X POST http://localhost:5001/api/assess \
    -H "Content-Type: application/json" \
    -d '{"assessor": "demo_user"}' | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  步骤 4: 查看异常汇总（含下一步操作建议）"
echo "--------------------------------------------------"
curl -s http://localhost:5001/api/anomalies | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  步骤 5: 查看 HJ202606003 详情（风浪预报晚到案例）"
echo "--------------------------------------------------"
curl -s http://localhost:5001/api/records/3 | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  步骤 6: 模拟补录气象预报（更新 HJ202606005）"
echo "--------------------------------------------------"
curl -s -X POST http://localhost:5001/api/forecasts/import \
    -H "Content-Type: application/json" \
    -d '{
        "record_id": 5,
        "forecast_date": "2026-06-13",
        "wind_level": 4,
        "wave_height": 1.2,
        "visibility": 8,
        "forecast_source": "浙江省海洋监测站",
        "forecast_time": "2026-06-12 08:00:00",
        "is_delayed": 0
    }' | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  步骤 7: 导出完整报告"
echo "--------------------------------------------------"
curl -s "http://localhost:5001/api/export?format=json" | python3 -m json.tool

echo ""
echo "--------------------------------------------------"
echo "  演示完成！"
echo "--------------------------------------------------"
echo ""
echo "  常用操作："
echo "  • 停止服务: ./stop.sh"
echo "  • 导出TXT报告: curl -OJ http://localhost:5001/api/export"
echo "  • 导入新记录: 参考 curl_examples.txt"
echo ""
echo "  查看日志: tail -f app.log"
echo "=============================================="

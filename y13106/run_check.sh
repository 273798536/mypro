#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "==> 检查 Python 环境..."
if ! command -v python3 &>/dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3.8+"
    exit 1
fi

echo "==> 安装依赖..."
python3 -m pip install --quiet -r requirements.txt

echo ""
echo "================================================"
echo "  矩阵条件数边界校验 - 一键运行完整样例"
echo "  (首次校验 + 晚到附件复算)"
echo "================================================"
echo ""

python3 -m matrix_cond_check.cli --sample
exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ 全部校验通过，退出码 0"
elif [ $exit_code -eq 1 ]; then
    echo "⚠️  存在非外推类异常，退出码 1"
elif [ $exit_code -eq 2 ]; then
    echo "❌ 存在外推越界，退出码 2 —— 请查看上方『外推越界卡在哪』定位详情"
else
    echo "⚠️  存在异常，退出码 $exit_code"
fi

exit $exit_code

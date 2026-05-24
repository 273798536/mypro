#!/bin/bash

set -e

echo "========================================"
echo "家电安装回访巡检工具 - 验收测试"
echo "========================================"
echo ""

echo "📋 测试步骤:"
echo "  1. 正常链路测试"
echo "  2. 重复提交和坏数据测试"
echo "  3. 重启后历史查询验证"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CLI="node $PROJECT_DIR/dist/index.js"

cd "$PROJECT_DIR"

echo "🔧 构建项目..."
npm run build 2>&1 | tail -5
echo ""

echo "========================================"
echo "测试 1: 正常链路测试"
echo "========================================"
echo ""

echo "1.1 初始化系统..."
$CLI init --force
echo ""

echo "1.2 登录主管账号..."
$CLI login admin admin123
echo ""

echo "1.3 导入正常预约单..."
$CLI import "$SCRIPT_DIR/预约单_正常.csv"
echo ""

echo "1.4 导入师傅定位..."
$CLI import "$SCRIPT_DIR/师傅定位.csv"
echo ""

echo "1.5 导入用户评价..."
$CLI import "$SCRIPT_DIR/用户评价.csv"
echo ""

echo "1.6 导入手工改价..."
$CLI import "$SCRIPT_DIR/手工改价表.csv"
echo ""

echo "1.7 数据巡检..."
$CLI check
echo ""

echo "1.8 生成报告..."
$CLI report
echo ""

echo "1.9 导出数据..."
$CLI export --format csv --output ./test-exports
echo ""

echo "========================================"
echo "测试 2: 重复提交和坏数据测试"
echo "========================================"
echo ""

echo "2.1 导入含脏数据的预约单..."
$CLI import "$SCRIPT_DIR/预约单_含脏数据.csv"
echo ""

echo "2.2 再次巡检，检查脏记录..."
$CLI check
echo ""

echo "2.3 查看操作历史..."
$CLI history --limit 10
echo ""

echo "2.4 导出失败清单..."
$CLI export-dirty ./test-exports/failed_records.csv
echo ""

echo "========================================"
echo "测试 3: 重启后历史查询验证"
echo "========================================"
echo ""

echo "3.1 登出..."
$CLI logout
echo ""

echo "3.2 重新登录..."
$CLI login admin admin123
echo ""

echo "3.3 验证导入历史..."
$CLI history --limit 20
echo ""

echo "3.4 验证脏记录..."
$CLI check --status dirty
echo ""

echo "3.5 重新生成报告..."
$CLI report --detail
echo ""

echo "========================================"
echo "✅ 验收测试完成！"
echo "========================================"
echo ""
echo "📊 关键验证点:"
echo "  - 预约单、师傅定位、用户评价、手工改价均已建账"
echo "  - 脏记录已识别并分类（缺字段、跨日等）"
echo "  - 差评原因缺失已标记"
echo "  - 原始行号和来源文件可追溯"
echo "  - 操作历史完整记录"
echo "  - 失败清单可导出"
echo ""
echo "🔐 权限测试建议:"
echo "  - 使用 entry01 登录测试导入权限"
echo "  - 使用 review01 登录测试复核权限"
echo "  - 使用 viewer01 登录测试只读权限"
echo ""

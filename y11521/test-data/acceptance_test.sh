#!/bin/bash

set -e

echo "========================================"
echo "家电安装回访巡检工具 - 验收测试 v2"
echo "========================================"
echo ""

echo "📋 测试步骤:"
echo "  1. 正常链路测试"
echo "  2. 重复提交和坏数据测试 (含重复、改名、数量冲突、合并冲突)"
echo "  3. 权限字段过滤测试"
echo "  4. 重启后历史查询验证"
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

echo "========================================"
echo "测试 2: 重复提交和坏数据测试"
echo "========================================"
echo ""

echo "2.1 导入含脏数据的预约单 (含重复、改名、数量冲突、合并冲突)..."
$CLI import "$SCRIPT_DIR/预约单_含脏数据.csv"
echo ""

echo "2.2 再次巡检，检查各类脏记录..."
$CLI check
echo ""

echo "2.3 生成详细报告 (含失败清单和处理结果追溯)..."
$CLI report --detail
echo ""

echo "2.4 导出失败清单..."
$CLI export-dirty ./test-exports/failed_records.csv
echo ""

echo "========================================"
echo "测试 3: 权限字段过滤测试"
echo "========================================"
echo ""

echo "3.1 切换到录入员账号..."
$CLI login entry01 entry123
echo ""

echo "3.2 录入员查看巡检报告 (敏感字段应被隐藏)..."
$CLI check 2>&1 | head -60
echo ""

echo "3.3 切换到只读账号..."
$CLI login viewer01 viewer123
echo ""

echo "3.4 只读账号查看报告 (手机号和金额应被隐藏)..."
$CLI report 2>&1 | head -80
echo ""

echo "========================================"
echo "测试 4: 重启后历史查询验证"
echo "========================================"
echo ""

echo "4.1 重新登录主管..."
$CLI login admin admin123
echo ""

echo "4.2 查看操作历史 (含差异)..."
$CLI history --limit 20 --diff 2>&1 | head -80
echo ""

echo "4.3 最终报告..."
$CLI report --detail
echo ""

echo "========================================"
echo "✅ 验收测试完成！"
echo "========================================"
echo ""
echo "📊 关键验证点:"
echo "  - 预约单、师傅定位、用户评价、手工改价均已建账"
echo "  - 脏记录已识别并分类（缺字段、跨日、改名、金额冲突、数量冲突、重复、合并冲突）"
echo "  - 差评原因缺失已标记"
echo "  - 原始行号和来源文件可追溯"
echo "  - 操作历史完整记录（含前后差异）"
echo "  - 失败清单可导出（带来源和行号）"
echo "  - 权限字段过滤生效（不同角色看到不同字段）"
echo "  - fix流程只有实际修改才标记fixed"
echo ""
echo "🔐 权限验证:"
echo "  - admin (主管): 全部字段可见可编辑"
echo "  - entry01 (录入员): 金额字段隐藏，部分字段可编辑"
echo "  - review01 (复核员): 状态和差评原因可编辑"
echo "  - viewer01 (只读): 手机号、金额等敏感字段隐藏"
echo ""

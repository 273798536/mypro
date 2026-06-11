#!/usr/bin/env bash
# 信用卡争议款异常回放 - 快速演示脚本
# 供清算运营阿禾演示给他人使用

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

export DB_PATH="$PROJECT_DIR/demo_cc_dispute.db"
export OUTPUT_DIR="$PROJECT_DIR/demo_output"

echo "========================================="
echo " 信用卡争议款异常回放 - 快速演示"
echo "========================================="
echo

# 0. 清理旧演示数据
rm -f "$DB_PATH"
rm -rf "$OUTPUT_DIR"

# 1. 安装依赖
echo "[1/8] 检查依赖..."
pip install -q click tabulate

# 2. 初始化数据库
echo "[2/8] 初始化数据库..."
python main.py --db-path "$DB_PATH" init-db

# 3. 维护审批人名单
echo "[3/8] 维护审批人名单..."
python main.py --db-path "$DB_PATH" add-approver --name "张伟"
python main.py --db-path "$DB_PATH" add-approver --name "李娜"
python main.py --db-path "$DB_PATH" add-approver --name "王芳"
python main.py --db-path "$DB_PATH" add-approver --name "赵敏"
python main.py --db-path "$DB_PATH" add-approver --name "钱伟"
python main.py --db-path "$DB_PATH" add-approver --name "张小明" --prev-names '["张伟明"]'

echo "   审批人名单:"
python main.py --db-path "$DB_PATH" list-approver

# 4. 导入托管回执（保留脏数据）
echo
echo "[4/8] 导入托管回执 CSV（含脏数据，不清洗）..."
python main.py --db-path "$DB_PATH" import-receipt \
    --csv-file "$PROJECT_DIR/examples/sample_trust_receipts.csv" \
    --source-label "2026年6月第一批托管回执"

echo "   回执清单（含脏数据标记）:"
python main.py --db-path "$DB_PATH" list-receipt

# 5. 异常回放 - 生成争议处理记录
echo
echo "[5/8] 异常回放 - 根据托管回执生成争议处理记录..."
python main.py --db-path "$DB_PATH" replay-create

echo "   处理记录一览:"
python main.py --db-path "$DB_PATH" list-record

# 6. 复核人日常处理
echo
echo "[6/8] 复核人处理 - 确认结论/追加备注..."
# 正常确认
python main.py --db-path "$DB_PATH" confirm-record \
    --record-id 1 --conclusion "已核实，非持卡人本人交易，同意退款" \
    --operator "复核人-阿芳" \
    --new-note "已与持卡人电话核实，调阅签购单笔迹不符"

# 有脏数据的先补证据
python main.py --db-path "$DB_PATH" mark-evidence \
    --record-id 3 --operator "复核人-阿芳" \
    --note "金额字段格式异常，需联系托管行索取原始凭证"

# 挂起记录：审批人不明确（ID5 无审批人），先标记待补证据
python main.py --db-path "$DB_PATH" resume-suspended \
    --record-id 5 --operator "复核人-阿芳" --need-evidence

echo "   当前处理状态:"
python main.py --db-path "$DB_PATH" list-record

# 7. 模拟改判 - 记录历史
echo
echo "[7/8] 模拟补录后改判（自动记录旧材料+新备注+改判原因）..."
python main.py --db-path "$DB_PATH" confirm-record \
    --record-id 1 --conclusion "经复核为持卡人本人交易，驳回退款" \
    --operator "复核主管-阿禾" \
    --change-reason "补录监控录像，显示为持卡人本人操作，签购单签字真实" \
    --new-note "监控录像时间戳与交易时间吻合，家属确认在场"

echo "   记录 1 的完整历史档案:"
python main.py --db-path "$DB_PATH" record-detail --record-id 1

# 8. 模拟审批人改名 - 自动挂起相关记录
echo
echo "[8/8] 模拟审批人改名（自动挂起相关记录，等复核人确认）..."
python main.py --db-path "$DB_PATH" rename-approver --approver-id 1 --new-name "张伟(更名)"

echo "   改名后挂起的记录:"
python main.py --db-path "$DB_PATH" list-record --suspended-only

# 9. 导出完整交付包
echo
echo "[导出] 一键导出完整交付包（阿禾给别人看用）..."
python main.py --db-path "$DB_PATH" export-package --output-dir "$OUTPUT_DIR"

echo
echo "========================================="
echo " 演示完成！交付包文件:"
echo "========================================="
ls -la "$OUTPUT_DIR/"
echo
echo "数据库文件: $DB_PATH"
echo "交付目录:   $OUTPUT_DIR"

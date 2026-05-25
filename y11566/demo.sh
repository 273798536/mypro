#!/bin/bash

echo "========================================"
echo "城市照明抢修多源导入巡检 CLI - 完整演示"
echo "========================================"
echo ""

PY_CMD="python3 -m lighting_cli.main"

echo "步骤 1: 初始化数据库"
echo "------------------------"
$PY_CMD init --reset
echo ""

echo "步骤 2: 导入巡检照片"
echo "------------------------"
$PY_CMD import photo sample_data/photos --strategy append
echo ""

echo "步骤 3: 导入报修热线数据 (正常数据)"
echo "------------------------"
$PY_CMD import hotline sample_data/hotline_records.csv --strategy append
echo ""

echo "步骤 4: 导入备件批次数据"
echo "------------------------"
$PY_CMD import spare_part sample_data/spare_parts.csv --strategy append
echo ""

echo "步骤 5: 导入审批邮件数据"
echo "------------------------"
$PY_CMD import approval_email sample_data/approval_emails.csv --strategy append
echo ""

echo "步骤 6: 导入坏数据（触发校验失败）"
echo "------------------------"
$PY_CMD import hotline sample_data/hotline_bad_data.csv --strategy ignore
echo ""

echo "步骤 7: 校验所有数据"
echo "------------------------"
$PY_CMD check
echo ""

echo "步骤 8: 查看导入批次历史"
echo "------------------------"
$PY_CMD history --batches
echo ""

echo "步骤 9: 动态获取并修正坏数据"
echo "------------------------"
python3 << 'PYTHON_SCRIPT'
import sys
sys.path.insert(0, '.')
from lighting_cli.database import Database
from lighting_cli.config import load_config
from lighting_cli.fixer import DataFixer
from lighting_cli.checker import DataChecker

config = load_config()
db = Database()
session = db.get_session()

checker = DataChecker(session, config)
failed_wos = checker.get_failed_work_orders(error_category='manual')

fixer = DataFixer(session, config)

print(f"找到 {len(failed_wos)} 条待人工处理的失败工单:")
for wo in failed_wos:
    print(f"  - 工单ID: {wo.id}, 位置: {wo.location}, 错误: {wo.check_error}")
print()

fix_results = []

for wo in failed_wos:
    errors = wo.check_error or ''
    fixes = {}
    
    if '缺少必填字段: location' in errors:
        fixes['location'] = f'人民路_{wo.pole_number or "000"}'
        print(f"修正工单 {wo.id}: 补充 location = {fixes['location']}")
    
    if '缺少必填字段: issue_type' in errors:
        fixes['issue_type'] = 'lighting_failure'
        print(f"修正工单 {wo.id}: 补充 issue_type = {fixes['issue_type']}")
    
    if '无效的严重级别' in errors:
        fixes['severity'] = 'high'
        print(f"修正工单 {wo.id}: 修正 severity = {fixes['severity']}")
    
    if fixes:
        result = fixer.fix_work_order(
            wo.id, 
            fixes, 
            fixed_by='demo_script',
            reason='演示脚本自动修正坏数据'
        )
        fix_results.append(result)

print()
print(f"已自动修正 {len([r for r in fix_results if r['success']])} 条工单")
session.close()
PYTHON_SCRIPT
echo ""

echo "步骤 10: 重新校验数据"
echo "------------------------"
$PY_CMD check
echo ""

echo "步骤 11: 查看工单变更历史 (第一条修正的工单)"
echo "------------------------"
python3 << 'PYTHON_SCRIPT'
import sys
sys.path.insert(0, '.')
from lighting_cli.database import Database
from lighting_cli.config import load_config
from lighting_cli.history import HistoryManager

config = load_config()
db = Database()
session = db.get_session()
manager = HistoryManager(session)

from lighting_cli.database import AuditLog
logs = session.query(AuditLog).filter(AuditLog.change_reason == '演示脚本自动修正坏数据').order_by(AuditLog.changed_at).limit(1).all()

if logs:
    wo_id = logs[0].work_order_id
    print(f"查看工单 {wo_id} 的变更历史:")
    print()
    hist_logs = manager.get_work_order_history(work_order_id=wo_id)
    print(manager.format_history_table(hist_logs))
else:
    print("没有找到变更历史")

session.close()
PYTHON_SCRIPT
echo ""

echo "步骤 12: 生成巡检报告"
echo "------------------------"
$PY_CMD report --format txt
echo ""

echo "步骤 13: 导出数据为CSV"
echo "------------------------"
$PY_CMD export --format csv
echo ""

echo ""
echo "========================================"
echo "演示完成！"
echo "========================================"
echo "查看生成的报告: reports/ 目录"
echo "查看导出的数据: exports/ 目录"
echo "查看配置文件: lighting_config.yaml"
echo "查看数据库: lighting_data.db"
echo ""
echo "=== 核心闭环验证 ==="
echo "1. fact_id 去重: 同一路段同故障跨数据源共享同一 fact_id"
echo "2. 失败分类: 可重试 / 待人工 / 永久失败"
echo "3. 审计追踪: 所有变更记录在 history 中可查"
echo "4. 报告格式: 原始行号 + 失败清单 + 修正指引"
echo ""

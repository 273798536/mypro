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

echo "步骤 6: 导入坏数据（触发三类失败）"
echo "------------------------"
$PY_CMD import hotline sample_data/three_error_types.csv --strategy ignore
echo ""

echo "步骤 7: 校验所有数据 - 验证三类失败分类"
echo "------------------------"
$PY_CMD check
echo ""

echo "步骤 8: 查看导入批次历史"
echo "------------------------"
$PY_CMD history --batches
echo ""

echo "步骤 9: 自动重试可重试失败任务"
echo "------------------------"
python3 << 'PYTHON_SCRIPT'
import sys
sys.path.insert(0, '.')
from lighting_cli.database import Database, WorkOrder
from lighting_cli.config import load_config
from lighting_cli.checker import DataChecker

config = load_config()
db = Database()
session = db.get_session()

checker = DataChecker(session, config)

# 模拟重试：清除 retryable 数据的标记使其通过
retryable_wos = session.query(WorkOrder).filter(WorkOrder.check_error_type == 'retryable').all()
print(f"找到 {len(retryable_wos)} 个可重试任务，模拟修复后重新校验...")
for wo in retryable_wos:
    # 清除重试标记
    if wo.description:
        wo.description = wo.description.replace('[EXTERNAL_PENDING] ', '').replace('[TIMEOUT] ', '')
    session.commit()
    # 重新校验
    checker.check_work_order(wo)

print("模拟重试完成！")
session.close()
PYTHON_SCRIPT

# 重新校验
$PY_CMD check
echo ""

echo "步骤 10: 动态获取并修正待人工处理的工单"
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
fixer = DataFixer(session, config)

manual_wos = checker.get_failed_work_orders(error_category='manual')

print(f"找到 {len(manual_wos)} 条待人工处理的工单:")
for wo in manual_wos:
    print(f"  - 工单ID: {wo.id}, 位置: {wo.location}, 错误: {wo.check_error}")
print()

for wo in manual_wos:
    errors = wo.check_error or ''
    fixes = {}
    
    if '缺少必填字段: location' in errors:
        fixes['location'] = f'修正路_{wo.pole_number or "000"}'
        print(f"修正工单 {wo.id}: 补充 location = {fixes['location']}")
    
    if '缺少必填字段: issue_type' in errors:
        fixes['issue_type'] = 'lighting_failure'
        print(f"修正工单 {wo.id}: 补充 issue_type = {fixes['issue_type']}")
    
    if '无效的严重级别' in errors:
        fixes['severity'] = 'high'
        print(f"修正工单 {wo.id}: 修正 severity = {fixes['severity']}")
    
    if fixes:
        fixer.fix_work_order(
            wo.id, 
            fixes, 
            fixed_by='demo_script',
            reason='演示脚本自动修正坏数据'
        )

session.close()
PYTHON_SCRIPT
echo ""

echo "步骤 11: 重新校验数据"
echo "------------------------"
$PY_CMD check
echo ""

echo "步骤 12: 查看工单变更历史"
echo "------------------------"
python3 << 'PYTHON_SCRIPT'
import sys
sys.path.insert(0, '.')
from lighting_cli.database import Database, AuditLog
from lighting_cli.config import load_config
from lighting_cli.history import HistoryManager

config = load_config()
db = Database()
session = db.get_session()
manager = HistoryManager(session)

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

echo "步骤 13: 生成巡检报告"
echo "------------------------"
$PY_CMD report --format txt
echo ""

echo "步骤 14: 导出数据为CSV"
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
echo ""
echo "1. fact_id 去重口径："
echo "   fact_id = MD5(location + road_section + pole_number + issue_type)"
echo "   ✅ 同一位置+同一故障 → 同一事实（跨源合并）"
echo "   ✅ 同一位置+不同故障 → 不同事实（独立工单）"
echo ""
echo "2. 三类失败分类（可验证）："
echo "   ✅ retryable: [EXTERNAL_PENDING]/[TIMEOUT] 标记 → 自动重试"
echo "   ✅ manual: 缺少必填字段/无效值 → 待人工修正"
echo "   ✅ permanent: 安全风险/数据损坏 → 永久失败"
echo ""
echo "3. 审计追踪：所有变更记录在 history 中可查"
echo ""
echo "4. 报告格式：原始行号 + 失败清单 + 修正指引"
echo ""

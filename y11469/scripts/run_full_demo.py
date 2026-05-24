#!/usr/bin/env python3
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.enums import DataSourceType, RoleType, RecordStatus
from app.services.import_service import ImportService
from app.services.ledger_service import LedgerService
from app.services.chain_service import ChainService
from app.services.view_service import ViewService
from app.data.sample_data import (
    SAMPLE_STYLE_CODE,
    BAD_DATA_EXAMPLES
)


def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_subsection(title):
    print(f"\n  --- {title} ---")


def run_full_demo():
    db = SessionLocal()
    try:
        import_service = ImportService(db)
        ledger_service = LedgerService(db)
        chain_service = ChainService(db)
        view_service = ViewService(db)

        print_section("服装打版样衣权限追责台账 - 完整演示")
        print(f"测试款号: {SAMPLE_STYLE_CODE}")

        record = ledger_service.get_record(1)
        if not record:
            print("\n[错误] 请先运行: python scripts/load_sample_data.py")
            return

        ledger_id_1 = 1
        ledger_id_2 = 2

        print_section("步骤1: 状态流转演示 (草稿→提交→驳回→二次确认→审计)")

        print_subsection("1.1 提交审核 (草稿 → 已提交)")
        record = ledger_service.submit(ledger_id_1, "王设计", RoleType.DESIGNER, "初版样衣数据核对完成")
        print(f"  记录 {record.record_no}: {RecordStatus.DRAFT} → {record.status}")
        print(f"  操作人: 王设计 ({RoleType.DESIGNER})")

        print_subsection("1.2 驳回 (已提交 → 已驳回)")
        record = ledger_service.reject(ledger_id_1, "李质检", RoleType.QUALITY, "面料编码不匹配，需要补充信息")
        print(f"  记录 {record.record_no}: {RecordStatus.SUBMITTED} → {record.status}")
        print(f"  驳回原因: 面料编码不匹配")

        print_subsection("1.3 补充信息后重新提交 (已驳回 → 已提交)")
        record = ledger_service.transition_status(
            ledger_id_1, RecordStatus.SUBMITTED,
            "补充面料批次信息后重新提交",
            "王设计", RoleType.DESIGNER
        )
        print(f"  记录 {record.record_no}: {RecordStatus.REJECTED} → {record.status}")

        print_subsection("1.4 二次确认通过 (已提交 → 二次确认)")
        record = ledger_service.second_confirm(ledger_id_1, "张主管", RoleType.AUDITOR, "数据复核通过")
        print(f"  记录 {record.record_no}: {RecordStatus.SUBMITTED} → {record.status}")

        print_subsection("1.5 进入只读审计状态")
        record = ledger_service.audit_only(ledger_id_1, "系统自动", RoleType.ADMIN, "二次确认通过，进入审计状态")
        print(f"  记录 {record.record_no}: {RecordStatus.SECOND_CONFIRM} → {record.status}")

        print_section("步骤2: 边界情况测试")

        print_subsection("2.1 重复提交检测")
        is_duplicate = ledger_service.check_duplicate_submission(SAMPLE_STYLE_CODE, 1)
        print(f"  款号 {SAMPLE_STYLE_CODE} 版本1 是否已提交: {is_duplicate}")
        print(f"  检测结果: {'检测到重复提交' if is_duplicate else '可以提交'}")

        print_subsection("2.2 撤回功能测试")
        try:
            record = ledger_service.withdraw(ledger_id_1, "普通用户", RoleType.DESIGNER, "测试撤回")
        except PermissionError as e:
            print(f"  设计师尝试撤回: {e}")

        record = ledger_service.withdraw(ledger_id_1, "审计员", RoleType.AUDITOR, "审计发现问题，需要修正")
        print(f"  审计员撤回成功: {record.status}")

        print_subsection("2.3 部分失败导入测试")
        bad_records = [
            {"transfer_no": "TRF-TEST-001", "style_code": SAMPLE_STYLE_CODE, "version": 99},
            BAD_DATA_EXAMPLES[1],
        ]
        try:
            batch = import_service.batch_import(
                DataSourceType.SAMPLE_TRANSFER,
                "错误数据测试.xlsx",
                bad_records,
                "测试用户"
            )
        except Exception as e:
            print(f"  部分导入结果: {e}")

        print_subsection("2.4 人工改判测试")
        record = ledger_service.manual_adjust(
            ledger_id_1,
            "根据实际情况调整面料数量",
            "管理员",
            RoleType.ADMIN,
            {"fabric_quantity": 18.5, "remarks": "人工调整：补记3.5米损耗"}
        )
        print(f"  人工改判后面料数量: {record.fabric_quantity} 米")
        print(f"  改判次数: {record.adjust_count}, 改判人: {record.last_adjusted_by}")

        print_subsection("2.5 冻结/解冻测试")
        record = ledger_service.submit(ledger_id_1, "王设计", RoleType.DESIGNER, "修正后重新提交")
        record = ledger_service.second_confirm(ledger_id_1, "审计员", RoleType.AUDITOR, "复核通过")
        record = ledger_service.audit_only(ledger_id_1, "系统", RoleType.ADMIN)
        record = ledger_service.freeze_record(
            ledger_id_1,
            "导出前冻结，防止数据变动",
            "系统",
            RoleType.ADMIN
        )
        print(f"  冻结后状态: {record.status}, 是否冻结: {record.is_frozen}")

        try:
            record = ledger_service.submit(ledger_id_1, "测试", RoleType.DESIGNER)
        except Exception as e:
            print(f"  冻结后修改尝试被拒绝: {e.message}")

        record = ledger_service.unfreeze_record(ledger_id_1, "管理员", RoleType.ADMIN)
        print(f"  解冻后状态: {record.status}")

        print_section("步骤3: 处理链还原 - 旧面料检测")

        print_subsection("3.1 构建处理链")
        chain = chain_service.build_processing_chain(SAMPLE_STYLE_CODE)
        print(f"  链条编号: {chain.chain_no}")
        print(f"  版本路径: {chain.version_path}")
        print(f"  是否存在旧面料问题: {chain.has_old_fabric_issue}")

        if chain.has_old_fabric_issue:
            print(f"\n  发现 {len(chain.old_fabric_records)} 条旧面料领用记录:")
            for issue in chain.old_fabric_records:
                print(f"    - 版本{issue['version']}: {issue['fabric_name']} ({issue['quantity']}米)")
                print(f"      领用者: {issue['receiver']}, 操作人: {issue['operator']}")
                print(f"      来源: {issue['source_file']} 第{issue['source_row']}行")

        print_subsection("3.2 责任分析")
        if chain.responsibility_analysis:
            for line in chain.responsibility_analysis.split('\n'):
                print(f"  {line}")

        print_subsection("3.3 完整时间线")
        timeline = chain_service.get_chain_timeline(SAMPLE_STYLE_CODE)
        print(f"  共 {len(timeline)} 个事件点:")
        for event in timeline[:8]:
            date_str = event['date'].strftime('%Y-%m-%d %H:%M') if event['date'] else '未知'
            print(f"    [{date_str}] {event['type']:12} - {event['description']} ({event['person']})")
        if len(timeline) > 8:
            print(f"    ... 还有 {len(timeline) - 8} 条记录")

        print_section("步骤4: 角色视图演示")

        roles_to_test = [
            RoleType.DESIGNER,
            RoleType.BRAND_PLANNER,
            RoleType.WAREHOUSE,
            RoleType.AUDITOR,
        ]

        for role in roles_to_test:
            print_subsection(f"4.1 {role} 视角")
            view = view_service.get_role_view(role, page_size=5)
            print(f"  可见记录数: {view['total']}")
            if view['records']:
                record = view['records'][0]
                visible_fields = [k for k, v in record.items() if v != "***" and v is not None]
                print(f"  可见字段示例: {', '.join(visible_fields[:8])}")
                masked_fields = [k for k, v in record.items() if v == "***"]
                if masked_fields:
                    print(f"  脱敏字段: {', '.join(masked_fields)}")

        print_subsection("4.2 品牌企划看板")
        dashboard = view_service.get_brand_planner_dashboard()
        print(f"  总记录数: {dashboard['overview']['total_records']}")
        print(f"  人工改判数: {dashboard['overview']['manual_adjusted_count']}")
        print(f"  有问题的处理链: {dashboard['overview']['chains_with_issues']}")
        print(f"  状态分布: {dashboard['status_breakdown']}")

        print_subsection("4.3 审计追踪")
        trail = view_service.get_change_audit_trail(ledger_id_1)
        print(f"  记录 {ledger_id_1} 共有 {len(trail)} 次状态变更:")
        for step in trail:
            print(f"    {step['sequence']}. [{step['time'][:16]}] {step['from_status'] or '初始'} → {step['to_status']}")
            print(f"       {step['operator']} ({step['operator_role']}): {step['reason']}")

        print_section("步骤5: 导出演示")

        print_subsection("5.1 脱敏导出")
        exported = view_service.export_records(
            [ledger_id_1, ledger_id_2],
            mask_sensitive=True,
            operator_role=RoleType.BRAND_PLANNER
        )
        print(f"  导出记录数: {len(exported)}")
        print(f"  脱敏标记: {exported[0]['_masked']}")
        print(f"  导出时间: {exported[0]['_exported_at'][:19]}")

        record = ledger_service.get_record(ledger_id_1)
        print(f"  导出次数已更新: {record.export_count} 次")

        print_section("步骤6: 原始证据保护验证")

        print_subsection("6.1 查看原始导入证据")
        evidence = import_service.get_original_evidence(DataSourceType.FABRIC_INVENTORY, 3)
        print(f"  来源文件: {evidence['source_file']}")
        print(f"  原始行号: {evidence['source_row_number']}")
        print(f"  导入批次: {evidence['import_batch_id']}")
        print(f"  原始数据已保存，不可修改")

        try:
            import_service.update_parsed_data(DataSourceType.FABRIC_INVENTORY, 1, {}, "测试")
        except Exception as e:
            print(f"  尝试修改原始数据被拒绝: {e.message}")

        print_section("演示完成！")
        print("\n核心功能验证总结:")
        print("  ✓ 完整状态流转 (草稿→提交→驳回→二次确认→审计→冻结→导出)")
        print("  ✓ 边界情况处理 (重复提交检测、撤回权限、部分失败、人工改判、冻结保护)")
        print("  ✓ 处理链还原 (多版本追踪、旧面料检测、责任分析、时间线)")
        print("  ✓ 角色权限视图 (8种角色、敏感字段脱敏、品牌企划看板)")
        print("  ✓ 原始证据保护 (来源文件、行号、原始数据不可篡改)")
        print("  ✓ 审计追踪 (完整变更历史、时间戳、操作人、原因)")

        print("\nAPI 服务启动命令: python main.py")
        print("API 文档地址: http://localhost:8000/docs")

    except Exception as e:
        print(f"\n演示过程出错: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    run_full_demo()

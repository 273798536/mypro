#!/usr/bin/env python3
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from green_bond_reconciliation.models import ReconciliationStatus
from green_bond_reconciliation.engine import ReconciliationEngine
from green_bond_reconciliation.storage import Storage, CsvExporter


def run_demo():
    output_dir = os.path.join(os.path.dirname(__file__), "..", "demo_output")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("绿色债券募集款口径对账 - 演示流程")
    print("=" * 60)

    print("\n[步骤1] 加载两个字段名不一致的CSV文件...")
    engine = ReconciliationEngine()

    csv1 = os.path.join(os.path.dirname(__file__), "清算运营组_标准字段.csv")
    count1, errors1 = engine.load_csv(csv1, source_tag="清算运营组-阿禾")
    print(f"  文件1（标准字段）: 加载 {count1} 条记录, 错误 {len(errors1)} 条")

    csv2 = os.path.join(os.path.dirname(__file__), "算法值班组_字段别名.csv")
    count2, errors2 = engine.load_csv(csv2, source_tag="算法值班组")
    print(f"  文件2（字段别名）: 加载 {count2} 条记录, 错误 {len(errors2)} 条")

    print(f"\n  字段映射结果: {json.dumps(engine.field_mappings, ensure_ascii=False)}")

    print("\n[步骤2] 执行自动对账...")
    summary = engine.run_reconciliation()
    print(f"  总计: {summary['total']} 条")
    print(f"    已确认: {summary['confirmed']} 条")
    print(f"    待补件: {summary['pending_document']} 条")
    print(f"    退回:   {summary['rejected']} 条")
    print(f"    未匹配: {summary['unmatched']} 条")
    print(f"  凭证晚到标记: {summary['late_document']} 条")
    print(f"  含字段映射: {summary['with_field_mappings']} 条")

    state_file = os.path.join(output_dir, "reconciliation_state.json")
    Storage.save_records(engine.records, state_file)
    print(f"\n  状态已保存到: {state_file}")

    print("\n[步骤3] 导出CSV明细（按状态分类）...")
    status_counts = CsvExporter.export_by_status(engine.records, output_dir)
    CsvExporter.export_details(engine.records, os.path.join(output_dir, "全部明细.csv"))
    CsvExporter.export_history(engine.records, os.path.join(output_dir, "变更历史.csv"))
    for status_name, count in status_counts.items():
        print(f"  {status_name}: {count} 条  -> {status_name}_明细.csv")

    print("\n[步骤4] 人工改判场景 - 算法值班人提供了新材料，把一条'待补件'改为'已确认'...")
    pending_records = engine.get_records_by_status(ReconciliationStatus.PENDING_DOCUMENT)
    if pending_records:
        target = pending_records[0]
        old_status = target.status.value
        print(f"  选择记录: {target.record_id[:8]}... 债券: {target.bond_name}")
        print(f"  原状态: {old_status}")
        engine.manual_confirm(
            record_id=target.record_id,
            operator="清算运营-阿禾",
            new_status=ReconciliationStatus.CONFIRMED,
            remark="算法值班人补充了完整材料，核对无误",
            late_document=False,
            tax_amount=1250000.00,
        )
        print(f"  新状态: {target.status.value}")
        print(f"  税费已确认: {target.tax_amount}")
        print(f"  变更类型: {target.history[-1].change_type.value}")

    print("\n[步骤5] 凭证晚到场景 - 一条晚到凭证到达，更新状态...")
    late_records = [r for r in engine.records if r.late_document and r.status == ReconciliationStatus.PENDING_DOCUMENT]
    if late_records:
        target = late_records[0]
        print(f"  选择记录: {target.record_id[:8]}... 债券: {target.bond_name}")
        print(f"  原状态: {target.status.value}, 凭证晚到: {target.late_document}")
        engine.manual_confirm(
            record_id=target.record_id,
            operator="清算运营-阿禾",
            new_status=ReconciliationStatus.CONFIRMED,
            remark="凭证已到达，补充核对通过",
            late_document=False,
        )
        print(f"  新状态: {target.status.value}, 凭证晚到: {target.late_document}")
        print(f"  变更类型: {target.history[-1].change_type.value}")

    print("\n[步骤6] 保存人工处理后的状态并重新导出...")
    Storage.save_records(engine.records, state_file)
    status_counts = CsvExporter.export_by_status(engine.records, output_dir)
    CsvExporter.export_details(engine.records, os.path.join(output_dir, "全部明细.csv"))
    CsvExporter.export_history(engine.records, os.path.join(output_dir, "变更历史.csv"))

    summary = engine.run_reconciliation()
    print(f"  最终统计:")
    print(f"    已确认: {summary['confirmed']} 条")
    print(f"    待补件: {summary['pending_document']} 条")
    print(f"    退回:   {summary['rejected']} 条")

    print("\n[步骤7] 打印变更历史（评审会复盘用）...")
    for r in engine.records:
        if len(r.history) > 1:
            print(f"\n  债券: {r.bond_name} ({r.bond_code})")
            print(f"  来源行: {r.source_file} 第{r.source_row}行")
            for h in r.history:
                old = h.old_status.value if h.old_status else "-"
                print(f"    [{h.timestamp[11:19]}] {h.change_type.value}: {old} -> {h.new_status.value}")
                print(f"      操作人: {h.operator}, 备注: {h.remark}")
                if h.new_values:
                    print(f"      变更内容: {json.dumps(h.new_values, ensure_ascii=False)}")

    print("\n" + "=" * 60)
    print(f"演示完成！所有输出文件位于: {os.path.abspath(output_dir)}")
    print("=" * 60)


if __name__ == "__main__":
    run_demo()

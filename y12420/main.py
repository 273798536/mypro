#!/usr/bin/env python3
import sys
from pathlib import Path

from sample_data import create_sample_data
from settlement_engine import SettlementEngine
from storage_manager import StorageManager, IdempotencyManager
from report_generator import ReportGenerator, SettlementQuery


def main():
    print("=" * 80)
    print("                    音乐版权邻接权分账系统")
    print("=" * 80)
    print()

    print(">>> 步骤1: 加载示例数据...")
    ownerships, playbacks, contracts = create_sample_data()
    print(f"    - 权属记录: {len(ownerships)} 条")
    print(f"    - 播放量记录: {len(playbacks)} 条")
    print(f"    - 合同记录: {len(contracts)} 份")
    print()

    print(">>> 步骤2: 初始化系统组件...")
    engine = SettlementEngine()
    storage = StorageManager()
    idempotency = IdempotencyManager(storage)
    report_gen = ReportGenerator()
    print("    系统组件初始化完成")
    print()

    settlement_month = "2024-05"
    print(f">>> 步骤3: 执行分账计算 (结算月份: {settlement_month})...")
    print()

    def calculate_wrapper(settlement_month, ownerships, playbacks, contracts):
        return engine.calculate_settlement(
            settlement_month=settlement_month,
            ownerships=ownerships,
            playbacks=playbacks,
            contracts=contracts
        )

    result = idempotency.safe_calculate_settlement(
        settlement_month=settlement_month,
        ownerships=ownerships,
        playbacks=playbacks,
        contracts=contracts,
        calculate_func=calculate_wrapper
    )

    print(f"    {result['message']}")
    print()

    if result['is_new']:
        batch = result['batch']
        details = result['details']
        issues = result['issues']

        print(f">>> 步骤4: 生成结算报告...")
        report = engine.generate_report(batch, details, issues)
        print("    报告生成完成")
        print()

        print(f">>> 步骤5: 持久化存储...")
        storage_result = storage.save_all(
            ownerships=ownerships,
            playbacks=playbacks,
            contracts=contracts,
            batch=batch,
            details=details,
            report=report
        )
        print(f"    - 批次ID: {storage_result['batch_id']}")
        print(f"    - 保存明细: {storage_result['details_saved']} 条")
        print()

        print(f">>> 步骤6: 导出报告文件...")
        report_files = report_gen.save_report_files(report, details)
        print(f"    - 文本报告: {report_files['text_report']}")
        print(f"    - 明细CSV: {report_files['details_csv']}")
        print(f"    - 问题CSV: {report_files['issues_csv']}")
        print()

        print(">>> 步骤7: 查询演示...")
        query = SettlementQuery(details)
        print()

        print("    【按权属方汇总】")
        owner_summary = query.get_summary_by_owner()
        for owner_id, info in owner_summary.items():
            print(f"      {info['owner_name']}: ¥{info['total_amount']:,.2f} ({info['tracks_count']}首曲目, {info['details_count']}条明细)")
        print()

        print("    【华星音乐对账单】")
        owner_statement = query.export_owner_statement("OWN001")
        print(owner_statement)
        print()

        print("    【有问题的明细】")
        issue_details = query.filter_with_issues()
        for detail in issue_details[:3]:
            print(f"      {detail.track_name} - {detail.owner_name}: ¥{detail.settlement_amount:,.2f}")
            if detail.processing_notes:
                for note in detail.processing_notes:
                    print(f"        * {note}")
        print()

        print(">>> 步骤8: 幂等性测试 (再次运行相同数据)...")
        result2 = idempotency.safe_calculate_settlement(
            settlement_month=settlement_month,
            ownerships=ownerships,
            playbacks=playbacks,
            contracts=contracts,
            calculate_func=calculate_wrapper
        )
        print(f"    {result2['message']}")
        print()

    else:
        print(f"    已从历史记录加载: {result['batch_id']}")
        print()

    print("=" * 80)
    print("                    系统演示完成")
    print("=" * 80)
    print()
    print("输出文件位置:")
    print(f"  - 数据存储: {Path('./data').absolute()}")
    print(f"  - 报告输出: {Path('./reports').absolute()}")
    print()


if __name__ == "__main__":
    main()

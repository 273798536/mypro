#!/usr/bin/env python3
import sys
import json
from typing import Dict, List, Any
from datetime import datetime

from data_import import DataCleaner, InventoryImporter, SalesOrderImporter, ReturnRecordImporter
from exception_detector import ExceptionDetector
from profit_calculator import ProfitShareCalculator
from data_sync import DataSyncer
from sample_data import SampleDataGenerator
from base_client import BaseClient
from trace_query import TraceQuery


def run_full_workflow(use_sample_data: bool = True, 
                     inventory_file: str = None,
                     sales_file: str = None,
                     return_attachment: str = None):
    print("\n" + "="*70)
    print("🎨 艺术家版画库存分润系统 - 完整工作流")
    print("="*70 + "\n")

    cleaner = DataCleaner()
    detector = ExceptionDetector()
    calculator = ProfitShareCalculator()
    client = BaseClient()
    syncer = DataSyncer(client)

    if use_sample_data:
        print("📊 使用样例数据（含异常场景）...\n")
        data = SampleDataGenerator.generate_all_data()
        artist_contracts = data["artist_contracts"]
        exhibitions = data["exhibitions"]
        inventory_records = data["inventory_records"]
        sales_orders = data["sales_orders"]
        return_records = data["return_records"]
        examples = data["examples"]
        
        print(f"  艺术家合同: {len(artist_contracts)} 条")
        print(f"  展会信息: {len(exhibitions)} 条")
        print(f"  版画库存: {len(inventory_records)} 条（含重复编号）")
        print(f"  销售订单: {len(sales_orders)} 条（含合同比例错误）")
        print(f"  退货记录: {len(return_records)} 条（含跨展退货）")
        print()
    else:
        print("📂 从文件导入数据...\n")
        artist_contracts = []
        exhibitions = []
        inventory_records = []
        sales_orders = []
        return_records = []
        examples = {}

        if inventory_file:
            inv_importer = InventoryImporter(cleaner)
            if inventory_file.endswith('.xlsx'):
                inventory_records, inv_errors = inv_importer.import_from_excel(inventory_file)
            elif inventory_file.endswith('.csv'):
                inventory_records, inv_errors = inv_importer.import_from_csv(inventory_file)
            inventory_records = inv_importer.expand_batch_numbers(inventory_records)
            print(f"  库存导入: {len(inventory_records)} 条, 错误: {len(inv_errors)} 条")

        if sales_file:
            sales_importer = SalesOrderImporter(cleaner)
            import pandas as pd
            df = pd.read_excel(sales_file) if sales_file.endswith('.xlsx') else pd.read_csv(sales_file)
            sales_orders, sales_errors = sales_importer.import_from_manual(df.to_dict('records'))
            print(f"  订单导入: {len(sales_orders)} 条, 错误: {len(sales_errors)} 条")

        if return_attachment:
            return_importer = ReturnRecordImporter(cleaner)
            with open(return_attachment, 'r', encoding='utf-8') as f:
                attachment_text = f.read()
            return_records, return_errors = return_importer.import_from_attachment(attachment_text)
            print(f"  退货导入: {len(return_records)} 条, 错误: {len(return_errors)} 条")
        print()

    print("🔍 步骤1: 异常检测...")
    print("-" * 50)
    detection_result = detector.run_all_detections(
        inventory_records=inventory_records,
        sales_orders=sales_orders,
        return_records=return_records,
        artist_contracts=artist_contracts
    )
    
    normal_inventory = detection_result["normal_inventory"]
    duplicate_inventory = detection_result["duplicate_inventory"]
    exceptions = detection_result["exceptions"]
    
    print(f"\n  ✅ 正常库存: {len(normal_inventory)} 条")
    print(f"  ⚠️  重复编号库存: {len(duplicate_inventory)} 条（不进入分润计算）")
    print(f"  🚨 异常总数: {len(exceptions)} 条")
    print()

    print("🧮 步骤2: 分润计算...")
    print("-" * 50)
    all_inventory = normal_inventory + duplicate_inventory
    
    profit_shares = calculator.batch_calculate(
        sales_orders=sales_orders,
        artist_contracts=artist_contracts,
        inventories=all_inventory,
        return_records=return_records
    )
    
    summary = calculator.get_total_summary()
    print(f"\n📈 分润汇总:")
    print(f"  总记录数: {summary['total_records']}")
    print(f"  总销售金额: ¥{summary['total_sales_amount']:.2f}")
    print(f"  总艺术家分润: ¥{summary['total_artist_share']:.2f}")
    print(f"  总画廊分润: ¥{summary['total_gallery_share']:.2f}")
    print(f"  异常记录数: {summary['abnormal_count']}")
    print(f"  退货关联数: {summary['return_count']}")
    print()

    print("📋 按艺术家汇总:")
    for artist, stats in summary["artist_summary"].items():
        print(f"  {artist}: {stats['count']} 笔, 销售¥{stats['sales_amount']:.2f}, "
              f"艺术家分¥{stats['artist_share']:.2f}, 画廊分¥{stats['gallery_share']:.2f}")
    print()

    TraceQuery.save_to_cache(profit_shares)

    print("☁️  步骤3: 同步数据到飞书多维表格...")
    print("-" * 50)
    sync_result = syncer.sync_all(
        artist_contracts=artist_contracts,
        exhibitions=exhibitions,
        inventory_records=all_inventory,
        sales_orders=sales_orders,
        return_records=return_records,
        profit_shares=profit_shares,
        exceptions=exceptions
    )

    print("🔗 步骤4: 生成追溯链接...")
    print("-" * 50)
    if profit_shares:
        print("\n以下分润记录可通过追溯ID查询完整计算链路：")
        for i, ps in enumerate(profit_shares[:3]):
            print(f"  {i+1}. 追溯ID: {ps['追溯ID']}")
            print(f"     版画: {ps['版画编号']}, 艺术家分润: ¥{ps['艺术家分润金额']:.2f}")
            print(f"     命令: python trace_query.py {ps['追溯ID']}")
        if len(profit_shares) > 3:
            print(f"  ... 还有 {len(profit_shares) - 3} 条记录")
    print()

    if examples:
        print("📚 异常场景样例说明:")
        print("-" * 50)
        for key, example in examples.items():
            print(f"\n🔹 {example['场景']}:")
            print(f"   {example['描述']}")
            print(f"   风险点: {', '.join(example['风险点'][:2])}...")

    print("\n" + "="*70)
    print("✅ 工作流执行完成！")
    print("="*70)
    print("\n📌 后续操作:")
    print("  1. 查看异常预警表，处理待处理异常")
    print("  2. 审核分润明细，确认或驳回异常记录")
    print("  3. 使用追溯功能核查任意分润记录的完整链路")
    print("  4. 命令示例: python trace_query.py <追溯ID>")
    print()

    return {
        "profit_shares": profit_shares,
        "exceptions": exceptions,
        "summary": summary,
        "sync_result": sync_result
    }


def show_exception_examples():
    print("\n" + "="*70)
    print("📚 常见异常场景处理指南")
    print("="*70)
    
    examples = [
        SampleDataGenerator.get_cross_exhibition_return_example(),
        SampleDataGenerator.get_duplicate_print_no_example(),
        SampleDataGenerator.get_contract_ratio_error_example()
    ]
    
    for example in examples:
        print(f"\n{'🔴' if example['场景'] == '编号重复' else '🟠' if example['场景'] == '合同比例错误' else '🟡'} "
              f"【{example['场景']}】")
        print("-" * 50)
        print(f"📝 描述: {example['描述']}")
        print(f"\n⚠️  风险点:")
        for i, risk in enumerate(example['风险点'], 1):
            print(f"   {i}. {risk}")
        print(f"\n🔧 处理流程:")
        for step in example['处理流程']:
            print(f"   {step}")
        print(f"\n📊 样例数据:")
        for k, v in example['数据'].items():
            print(f"   {k}: {v}")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "examples":
            show_exception_examples()
        elif sys.argv[1] == "custom":
            run_full_workflow(
                use_sample_data=False,
                inventory_file=sys.argv[2] if len(sys.argv) > 2 else None,
                sales_file=sys.argv[3] if len(sys.argv) > 3 else None,
                return_attachment=sys.argv[4] if len(sys.argv) > 4 else None
            )
        else:
            print(f"用法:")
            print(f"  python main.py              # 使用样例数据运行完整流程")
            print(f"  python main.py examples     # 查看异常场景处理指南")
            print(f"  python main.py custom [库存文件] [订单文件] [退货附件]")
    else:
        run_full_workflow(use_sample_data=True)

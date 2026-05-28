#!/usr/bin/env python3
"""演示脚本 - 直接运行核心功能"""

import sys
import os
sys.path.insert(0, '.')

import pandas as pd
from datetime import datetime

from crowdpay_frozen.data_merge import DataMerger
from crowdpay_frozen.batch import BatchProcessor
from crowdpay_frozen.report import ReportGenerator
from crowdpay_frozen.models import RiderPayment, FreezeRecord, FreezeType


def generate_example_data(output_dir):
    """生成示例数据"""
    examples_dir = f"{output_dir}/examples"
    os.makedirs(examples_dir, exist_ok=True)

    ticket_df = pd.DataFrame([
        {
            "骑手ID": "R001",
            "姓名": "张三",
            "应发金额": 5200.0,
            "基本工资": 4000.0,
            "银行卡号": "6222021234567890123",
            "银行名称": "工商银行",
            "身份证号": "110101199001011234",
            "手机号": "13800138001",
        },
        {
            "骑手ID": "R002",
            "姓名": "李四",
            "应发金额": 4800.0,
            "基本工资": 3800.0,
            "银行卡号": "6222021234567890456",
            "银行名称": "建设银行",
            "身份证号": "110101199002025678",
            "手机号": "13800138002",
        },
        {
            "骑手ID": "R003",
            "姓名": "王五",
            "应发金额": 5500.0,
            "基本工资": 4200.0,
            "银行卡号": "6222021234567890789",
            "银行名称": "农业银行",
            "身份证号": "110101199003039012",
            "手机号": "13800138003",
        },
    ])
    ticket_path = f"{examples_dir}/客服工单.xlsx"
    ticket_df.to_excel(ticket_path, index=False)
    print(f"✓ 客服工单示例：{ticket_path}")

    salary_df = pd.DataFrame([
        {
            "骑手ID": "R001",
            "姓名": "张三",
            "应发金额": 5000.0,
            "基本工资": 4000.0,
            "银行卡号": "6222021234567890123",
            "银行名称": "工商银行",
            "身份证号": "110101199001011234",
            "手机号": "13800138001",
        },
        {
            "骑手ID": "R002",
            "姓名": "李四",
            "应发金额": 4800.0,
            "基本工资": 3800.0,
            "银行卡号": "6222021234567890456",
            "银行名称": "建设银行",
            "身份证号": "110101199002025678",
            "手机号": "13800138002",
        },
        {
            "骑手ID": "R004",
            "姓名": "赵六",
            "应发金额": 5100.0,
            "基本工资": 4000.0,
            "银行卡号": "6222021234567890321",
            "银行名称": "中国银行",
            "身份证号": "110101199004043456",
            "手机号": "13800138004",
        },
    ])
    salary_path = f"{examples_dir}/计薪流水.xlsx"
    salary_df.to_excel(salary_path, index=False)
    print(f"✓ 计薪流水示例：{salary_path}")

    freeze_df = pd.DataFrame([
        {
            "骑手ID": "R001",
            "冻结类型": "投诉冻结",
            "冻结金额": 500.0,
            "冻结原因": "客户投诉送餐超时",
            "投诉单号": "CMP202405001",
            "操作人": "客服小王",
        },
        {
            "骑手ID": "R001",
            "冻结类型": "投诉冻结",
            "冻结金额": 500.0,
            "冻结原因": "客户投诉送餐超时",
            "投诉单号": "CMP202405001",
            "操作人": "客服小李",
        },
        {
            "骑手ID": "R002",
            "冻结类型": "补贴追回",
            "冻结金额": 300.0,
            "冻结原因": "天气补贴重复发放",
            "投诉单号": "",
            "操作人": "财务小张",
        },
        {
            "骑手ID": "R003",
            "冻结类型": "银行卡失败",
            "冻结金额": 5500.0,
            "冻结原因": "卡号错误打款失败",
            "投诉单号": "",
            "操作人": "银行接口",
        },
    ])
    freeze_path = f"{examples_dir}/冻结名单.xlsx"
    freeze_df.to_excel(freeze_path, index=False)
    print(f"✓ 冻结名单示例：{freeze_path}")

    return ticket_path, salary_path, freeze_path


def main():
    output_dir = "./output"
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("众包工资冻结发放处理工具 - 演示模式")
    print("=" * 60)

    print("\n[1/5] 生成示例数据...")
    ticket_path, salary_path, freeze_path = generate_example_data(output_dir)

    print("\n[2/5] 加载并合并数据...")
    merger = DataMerger()
    ticket_data = merger.load_ticket_data(ticket_path)
    salary_data = merger.load_payment_salary(salary_path)
    freeze_records = merger.load_freeze_tickets(freeze_path)

    print(f"  ✓ 工单数据：{len(ticket_data)} 条")
    print(f"  ✓ 计薪流水：{len(salary_data)} 条")
    print(f"  ✓ 冻结记录：{len(freeze_records)} 条")

    print("\n[3/5] 对比差异并合并...")
    riders, diffs = merger.compare_and_merge(
        ticket_data, salary_data, freeze_records
    )
    diff_summary = merger.get_diff_summary()
    print(f"  ✓ 合并后骑手：{len(riders)} 人")
    print(f"  ✓ 发现差异：{diff_summary['total_diffs']} 处")

    print("\n[4/5] 执行批次处理...")
    processor = BatchProcessor(output_dir=output_dir)
    report = processor.process_batch(riders, diffs)

    print(f"  ✓ 批次号：{report.batch_id}")
    print(f"  ✓ 冻结人数：{report.frozen_count} 人")
    print(f"  ✓ 冻结金额：{report.frozen_amount:.2f} 元")
    print(f"  ✓ 银行卡失败：{len(report.bank_failures)} 人")
    print(f"  ✓ 重复冻结：{len(report.duplicate_freezes)} 条")

    print("\n[5/5] 生成报告...")
    reporter = ReportGenerator(output_dir=output_dir)
    txt_path = reporter.generate_human_readable_report(report)
    excel_path = reporter.generate_excel_report(report, riders)

    print(f"  ✓ 文本报告：{txt_path}")
    print(f"  ✓ Excel报告：{excel_path}")

    print("\n" + "=" * 60)
    print("处理完成！")
    print(f"批次号：{report.batch_id}")
    print(f"报告目录：{output_dir}/human_reports/")
    print("=" * 60)

    print("\n查看文本报告内容预览：")
    print("-" * 60)
    with open(txt_path, "r", encoding="utf-8") as f:
        print(f.read())


if __name__ == "__main__":
    main()

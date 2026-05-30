#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from report import run_full_analysis

print("🧪 运行完整分析流程测试\n")

report = run_full_analysis(
    './quick_test_data/original.wav',
    './quick_test_data/transposed.wav',
    './quick_test_output'
)

print("\n✅ 完整分析流程测试通过!")
print(f"   JSON报告: {report['output_files']['json_report']}")
print(f"   图表数量: {len(report['output_files']['plots'])}")
print(f"   CSV文件: {len(report['output_files']['csv_files'])}个")
print(f"\n📁 所有输出已保存至: {os.path.abspath('./quick_test_output')}")

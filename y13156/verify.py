"""端到端验证脚本：
1. 用边界样本复算一遍
2. 检查图表和明细是否同一个口径
3. 检查坏数据是否被正确排除
4. 检查采样缺口是否被正确标记
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from heatpump_alert.data_loader import load_nameplate, load_samples, load_note
from heatpump_alert.alert_engine import run_alert, calculate_cop
from heatpump_alert.output_writer import write_outputs, format_terminal_summary
from heatpump_alert.chart_generator import generate_charts


def test_boundary_sample():
    """测试边界样本：HP-A01 第7条（接近温度上限）"""
    input_dir = os.path.join(os.path.dirname(__file__), "input")
    output_dir = os.path.join(os.path.dirname(__file__), "output")

    nameplate_df = load_nameplate(input_dir)
    samples_df = load_samples(input_dir)
    note = load_note(input_dir)

    print("=" * 60)
    print("验证 1：设备铭牌加载")
    print(f"  设备数量：{len(nameplate_df)} 台")
    print(f"  设备编号：{nameplate_df['设备编号'].tolist()}")

    print("\n验证 2：样本数据加载")
    print(f"  样本总数：{len(samples_df)} 条")
    print(f"  坏数据数量：{samples_df['坏数据'].sum()} 条")
    print(f"  采样缺口数量：{samples_df['采样缺口'].sum()} 条")

    print("\n验证 3：边界样本检查")
    hp_a01 = samples_df[samples_df["设备编号"] == "HP-A01"]
    print(f"  HP-A01 样本数：{len(hp_a01)}")
    for _, row in hp_a01.iterrows():
        print(f"    循环{row['循环序号']}: 出水={row['出水温度(℃)']}℃, "
              f"坏数据={row['坏数据']}, 缺口={row['采样缺口']}")

    details_df, summary = run_alert(samples_df, nameplate_df)

    print("\n验证 4：预警结果概览")
    print(f"  有效样本数：{summary['有效样本数']}")
    print(f"  坏数据数：{summary['坏数据数']}")
    print(f"  采样缺口数：{summary['采样缺口数']}")
    print(f"  预警样本数：{summary['预警样本数']}")
    print(f"  预警类型：{summary['预警类型分布']}")

    print("\n验证 5：明细与统计口径一致性")
    valid_in_details = len(details_df[details_df["是否纳入统计"]])
    print(f"  明细中有效样本：{valid_in_details}")
    print(f"  汇总中有效样本：{summary['有效样本数']}")
    print(f"  口径一致：{valid_in_details == summary['有效样本数']}")

    alert_in_details = len(details_df[details_df["是否纳入统计"] & (details_df["预警级别"] == "预警")])
    print(f"  明细中预警数：{alert_in_details}")
    print(f"  汇总中预警数：{summary['预警样本数']}")
    print(f"  口径一致：{alert_in_details == summary['预警样本数']}")

    print("\n验证 6：坏数据是否被排除在统计外")
    bad_df = details_df[details_df["坏数据"]]
    print(f"  坏数据全部标记为不纳入统计：{(bad_df['是否纳入统计'] == False).all()}")

    print("\n验证 7：采样缺口是否被排除在统计外")
    gap_df = details_df[details_df["采样缺口"]]
    print(f"  采样缺口全部标记为不纳入统计：{(gap_df['是否纳入统计'] == False).all()}")

    print("\n验证 8：边界样本具体预警内容")
    boundary_row = details_df[(details_df["设备编号"] == "HP-A01") & (details_df["循环序号"] == 7)]
    if len(boundary_row) > 0:
        row = boundary_row.iloc[0]
        print(f"  HP-A01 循环7（边界样本-接近上限）：")
        print(f"    出水温度：{row['出水温度(℃)']}℃")
        print(f"    COP：{row['COP']}")
        print(f"    预警类型：{row['预警类型']}")
        print(f"    预警级别：{row['预警级别']}")
        print(f"    参考铭牌：{row['参考铭牌行']}")
        print(f"    是否纳入统计：{row['是否纳入统计']}")

    hp_b03_3 = details_df[(details_df["设备编号"] == "HP-B03") & (details_df["循环序号"] == 3)]
    if len(hp_b03_3) > 0:
        row = hp_b03_3.iloc[0]
        print(f"  HP-B03 循环3（边界样本-超温）：")
        print(f"    出水温度：{row['出水温度(℃)']}℃")
        print(f"    COP：{row['COP']}")
        print(f"    预警类型：{row['预警类型']}")
        print(f"    预警级别：{row['预警级别']}")
        print(f"    是否纳入统计：{row['是否纳入统计']}")

    print("\n验证 9：生成输出文件")
    files, summary_text, output_dirs = write_outputs(output_dir, details_df, summary, note)
    for name, path in files.items():
        print(f"  [{name}] {path}")

    charts = generate_charts(output_dirs, details_df, summary)
    for name, path in charts.items():
        print(f"  [图表-{name}] {path}")

    print("\n验证 10：终端摘要与文件摘要内容一致")
    summary_file = files["摘要文件"]
    with open(summary_file, "r", encoding="utf-8") as f:
        file_content = f.read()
    print(f"  摘要文件长度：{len(file_content)} 字符")
    print(f"  终端摘要长度：{len(summary_text)} 字符")
    print(f"  内容完全一致：{file_content == summary_text}")

    print("\n" + "=" * 60)
    print("验证全部完成 ✓")
    print("=" * 60)

    return details_df, summary


if __name__ == "__main__":
    test_boundary_sample()

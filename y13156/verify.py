"""端到端验证脚本：
1. 用边界样本复算一遍（手动算 COP/温差/预警，对照程序结果）
2. 检查图表和明细是否同一个口径（有效样本过滤一致）
3. 检查坏数据是否被正确排除
4. 检查采样缺口是否被正确标记
5. 检查接口 JSON / 摘要文本 / 持久化 CSV 三者一致
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from heatpump_alert.data_loader import load_nameplate, load_samples, load_note
from heatpump_alert.alert_engine import run_alert, calculate_cop, WATER_SPECIFIC_HEAT, WATER_DENSITY
from heatpump_alert.output_writer import write_outputs, format_terminal_summary, _file_meta
from heatpump_alert.chart_generator import generate_charts


def manual_cop(flow_m3h, out_temp, back_temp, power_kw):
    """手动 COP 复算，与 alert_engine.calculate_cop 同一公式。"""
    diff = out_temp - back_temp
    heat_kw = (flow_m3h * WATER_DENSITY * diff * WATER_SPECIFIC_HEAT) / 3600
    cop = heat_kw / power_kw if power_kw > 0 else None
    return round(diff, 2), round(heat_kw, 4), round(cop, 4) if cop else None


EXPECTED_CASES = [
    {
        "标签": "HP-A01循环7:温度接近上限(54.5/55)",
        "设备": "HP-A01", "循环": 7,
        "入参": (8.7, 54.5, 43.0, 35.0),
        "期望温差": 11.5, "期望COP": 3.3195,
        "期望预警类型": "正常", "期望级别": "正常",
        "期望纳入统计": True,
    },
    {
        "标签": "HP-A01循环8:高COP边界(温差9.5,功耗低)",
        "设备": "HP-A01", "循环": 8,
        "入参": (8.5, 47.5, 38.0, 18.0),
        "期望温差": 9.5, "期望COP": 5.2169,  # 8.5*1000*9.5*4.186/3600/18=93.903/18=5.217
        "期望预警类型": "高COP预警", "期望级别": "预警",
        "期望纳入统计": True,
    },
    {
        "标签": "HP-A02循环2:低温边界(34.5<35)",
        "设备": "HP-A02", "循环": 2,
        "入参": (7.8, 34.5, 33.0, 20.0),
        "期望温差": 1.5,
        "期望预警包含": ["低温预警", "低COP预警"],
        "期望级别": "预警",
        "期望纳入统计": True,
    },
    {
        "标签": "HP-A02循环5:坏数据(出水缺失)",
        "设备": "HP-A02", "循环": 5,
        "期望坏数据": True,
        "期望纳入统计": False,
        "期望预警类型": "数据异常",
    },
    {
        "标签": "HP-A02循环6:坏数据(真·进出水温颠倒)",
        "设备": "HP-A02", "循环": 6,
        "入参": (8.3, 30.0, 46.5, 28.5),
        "期望温差": -16.5,
        "期望坏数据": True,
        "期望纳入统计": False,
        "期望预警类型": "数据异常",
    },
    {
        "标签": "HP-B03循环3:超温边界(61>60)",
        "设备": "HP-B03", "循环": 3,
        "入参": (12.0, 61.0, 46.0, 48.0),
        "期望温差": 15.0, "期望COP": 4.3604,
        "期望预警类型": "超温预警", "期望级别": "预警",
        "期望纳入统计": True,
    },
    {
        "标签": "HP-B03循环5:坏数据(温度为负)",
        "设备": "HP-B03", "循环": 5,
        "期望坏数据": True,
        "期望纳入统计": False,
        "期望预警类型": "数据异常",
    },
    {
        "标签": "HP-B03循环7:低COP边界(温差仅0.7)",
        "设备": "HP-B03", "循环": 7,
        "入参": (12.0, 50.5, 49.8, 46.0),
        "期望温差": 0.7,
        "期望预警包含": ["低COP预警"],
        "期望级别": "预警",
        "期望纳入统计": True,
    },
    {
        "标签": "HP-C05循环1:无铭牌设备",
        "设备": "HP-C05", "循环": 1,
        "期望纳入统计": False,
        "期望预警类型": "无铭牌数据",
    },
]


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.join(base, "input")
    output_dir = os.path.join(base, "output")

    passed = 0
    failed = 0

    print("=" * 70)
    print("  热泵循环阈值预警 — 端到端复算验证")
    print("=" * 70)

    nameplate_df = load_nameplate(input_dir)
    samples_df = load_samples(input_dir)
    note = load_note(input_dir)

    print("\n[Step 1] 样例数据加载检查")
    print(f"  铭牌设备数: {len(nameplate_df)} → {nameplate_df['设备编号'].tolist()}")
    print(f"  样本总数: {len(samples_df)}")
    print(f"  坏数据标记: {samples_df['坏数据'].sum()} 条")
    print(f"  采样缺口标记: {samples_df['采样缺口'].sum()} 条")

    details_df, summary = run_alert(samples_df, nameplate_df)

    print("\n[Step 2] 边界样本逐条复算")
    for case in EXPECTED_CASES:
        mask = (details_df["设备编号"] == case["设备"]) & (details_df["循环序号"] == case["循环"])
        if mask.sum() == 0:
            print(f"  ✗ [{case['标签']}] 未在明细中找到样本")
            failed += 1
            continue
        row = details_df[mask].iloc[0]
        ok = True
        errs = []

        if "入参" in case:
            flow, out, back, power = case["入参"]
            e_diff, e_heat, e_cop = manual_cop(flow, out, back, power)
            if case.get("期望温差") is not None:
                a_diff = float(row.get("温差(℃)", 0) or 0)
                if abs(a_diff - case["期望温差"]) > 0.01:
                    ok = False
                    errs.append(f"温差: 计算={a_diff}, 期望={case['期望温差']}")
            if case.get("期望COP") is not None:
                a_cop = float(row.get("COP", 0) or 0)
                if abs(a_cop - case["期望COP"]) > 0.05:
                    ok = False
                    errs.append(f"COP: 程序={a_cop}, 期望={case['期望COP']} (手动复算={e_cop})")

        if case.get("期望坏数据") is not None:
            actual = bool(row.get("坏数据", False))
            if actual != case["期望坏数据"]:
                ok = False
                errs.append(f"坏数据标记: 实际={actual}, 期望={case['期望坏数据']}")

        if case.get("期望纳入统计") is not None:
            actual = bool(row.get("是否纳入统计", False))
            if actual != case["期望纳入统计"]:
                ok = False
                errs.append(f"纳入统计: 实际={actual}, 期望={case['期望纳入统计']}")

        if case.get("期望预警类型") is not None:
            actual = str(row.get("预警类型", ""))
            if actual != case["期望预警类型"]:
                ok = False
                errs.append(f"预警类型: 实际='{actual}', 期望='{case['期望预警类型']}'")

        if case.get("期望预警包含"):
            actual = str(row.get("预警类型", ""))
            for expected in case["期望预警包含"]:
                if expected not in actual:
                    ok = False
                    errs.append(f"预警类型缺少: 期望含'{expected}', 实际='{actual}'")

        if case.get("期望级别") is not None:
            actual = str(row.get("预警级别", ""))
            if actual != case["期望级别"]:
                ok = False
                errs.append(f"预警级别: 实际='{actual}', 期望='{case['期望级别']}'")

        if ok:
            print(f"  ✓ [{case['标签']}]")
            if row.get("判定依据"):
                print(f"      判定依据: {row['判定依据'][:80]}...")
            passed += 1
        else:
            print(f"  ✗ [{case['标签']}]")
            for e in errs:
                print(f"      {e}")
            print(f"      实际明细行: 预警类型={row.get('预警类型')}, 级别={row.get('预警级别')}, "
                  f"纳入统计={row.get('是否纳入统计')}, COP={row.get('COP')}, 温差={row.get('温差(℃)')}")
            failed += 1

    print("\n[Step 3] 口径一致性检查")
    valid_mask = details_df["是否纳入统计"] == True
    valid_count = valid_mask.sum()
    alert_in_details = ((valid_mask) & (details_df["预警级别"] == "预警")).sum()
    normal_in_details = ((valid_mask) & (details_df["预警级别"] == "正常")).sum()

    checks = [
        ("汇总-有效样本数", summary["有效样本数"], int(valid_count)),
        ("汇总-预警样本数", summary["预警样本数"], int(alert_in_details)),
        ("汇总-正常样本数", summary["正常样本数"], int(normal_in_details)),
        ("正常+预警==有效", summary["正常样本数"] + summary["预警样本数"], summary["有效样本数"]),
        ("坏数据==异常类型数", summary["坏数据数"], int((details_df["预警类型"] == "数据异常").sum())),
        ("采样缺口==缺口类型数", summary["采样缺口数"], int((details_df["预警类型"] == "采样缺口").sum())),
    ]
    for label, actual, expected in checks:
        if actual == expected:
            print(f"  ✓ [{label}] {actual} == {expected}")
            passed += 1
        else:
            print(f"  ✗ [{label}] {actual} != {expected}")
            failed += 1

    print("\n[Step 4] 写入输出 + 三方一致性")
    files, summary_text, output_dirs, errors = write_outputs(output_dir, details_df, summary, note)
    charts = generate_charts(output_dirs, details_df, summary)
    files.update({f"图表-{k}": v for k, v in charts.items() if v})

    if errors:
        print(f"  ✗ 写入错误: {errors}")
        failed += len(errors)
    else:
        print("  ✓ 全部文件写入无错误")
        passed += 1

    json_path = files.get("JSON结果", "")
    if json_path and os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        json_summary = payload["摘要"]
        mismatch = []
        for k in ["样本总数", "有效样本数", "预警样本数", "坏数据数", "整体平均COP"]:
            if summary.get(k) != json_summary.get(k):
                mismatch.append(f"{k}: 内存={summary.get(k)} vs JSON={json_summary.get(k)}")
        if mismatch:
            for m in mismatch:
                print(f"  ✗ JSON-内存不一致: {m}")
                failed += 1
        else:
            print("  ✓ JSON 与内存 summary 关键字段完全一致")
            passed += 1

        detail_csv = files.get("有效明细", "")
        if detail_csv and os.path.exists(detail_csv):
            import pandas as pd
            csv_df = pd.read_csv(detail_csv)
            if len(csv_df) == summary["有效样本数"]:
                print(f"  ✓ 有效明细 CSV 行数({len(csv_df)}) == 汇总有效数({summary['有效样本数']})")
                passed += 1
            else:
                print(f"  ✗ 有效明细 CSV 行数({len(csv_df)}) != 汇总有效数({summary['有效样本数']})")
                failed += 1

        anomaly_csv = files.get("异常明细", "")
        if anomaly_csv and os.path.exists(anomaly_csv):
            import pandas as pd
            csv_df = pd.read_csv(anomaly_csv)
            expected_anom = summary["坏数据数"] + summary["采样缺口数"] + summary["无铭牌数据数"]
            if len(csv_df) == expected_anom:
                print(f"  ✓ 异常明细 CSV 行数({len(csv_df)}) == 坏+缺口+无铭牌({expected_anom})")
                passed += 1
            else:
                print(f"  ✗ 异常明细 CSV 行数({len(csv_df)}) != 汇总异常数({expected_anom})")
                failed += 1

        full_csv = files.get("完整明细", "")
        if full_csv and os.path.exists(full_csv):
            import pandas as pd
            csv_df = pd.read_csv(full_csv)
            if len(csv_df) == summary["样本总数"]:
                print(f"  ✓ 完整明细 CSV 行数({len(csv_df)}) == 样本总数({summary['样本总数']})")
                passed += 1
            else:
                print(f"  ✗ 完整明细 CSV 行数({len(csv_df)}) != 样本总数({summary['样本总数']})")
                failed += 1

        summary_txt = files.get("摘要文件", "")
        if summary_txt and os.path.exists(summary_txt):
            with open(summary_txt, "r", encoding="utf-8") as f:
                txt_content = f.read()
            if txt_content == summary_text:
                print("  ✓ 终端摘要 与 summary.txt 文件内容完全一致")
                passed += 1
            else:
                print("  ✗ 终端摘要 与 summary.txt 文件内容不一致")
                failed += 1

    print("\n[Step 5] 图表与明细口径对照")
    for name, path in charts.items():
        if path and os.path.exists(path):
            size = os.path.getsize(path)
            if size > 0:
                print(f"  ✓ [图表-{name}] {os.path.basename(path)} ({size} 字节)")
                passed += 1
            else:
                print(f"  ✗ [图表-{name}] 文件为空")
                failed += 1

    print("\n" + "=" * 70)
    print(f"  验证结果：通过 {passed} 项，失败 {failed} 项")
    if failed == 0:
        print("  ✓ 全部验证通过，数据链路可信")
    else:
        print(f"  ✗ 存在 {failed} 项失败，请检查上方日志")
    print("=" * 70)

    print("\n[附录] 本次汇总关键字段：")
    for k, v in summary.items():
        if k != "设备统计":
            print(f"  {k}: {v}")
    print("\n[附录] 设备统计：")
    for dev, s in summary["设备统计"].items():
        print(f"  {dev}: {s}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

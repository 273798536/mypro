from __future__ import annotations

from datetime import datetime
from pathlib import Path

from engine import build_snapshot
from report import render_html_report


def main() -> None:
    base = Path(__file__).parent

    feature_sources = [
        (str(base / "sample_data_task1.csv"), "任务1-模型评测"),
        (str(base / "sample_data_task2.csv"), "任务2-特征评测"),
    ]

    boundary_overrides = {
        "PSI": (0.0, 0.25),
        "逾期率": (0.0, 0.050),
        "缺失率": (0.0, 0.080),
        "坏账率": (0.0, 0.060),
        "无效值计数": (0, 0),
        "迟到特征数": (0, 2),
    }

    formula_overrides = {
        "模型AUC": "mean(predict_score)",
        "模型KS": "max(|cum_pos - cum_neg|)",
        "PSI": "sum(p * ln(p/q))",
        "逾期率": "count(逾期) / count(总计)",
        "缺失率": "count(null) / count(总计)",
        "坏账率": "count(bad) / count(total)",
        "特征覆盖数": "count(non_null)",
        "迟到特征数": "count(late_flag)",
        "入模特征数": "count(selected_features)",
        "特征稳定性": "1 - std_feature / mean_feature",
        "样本量": "count(samples)",
    }

    unit_overrides = {
        "模型AUC": "—",
        "模型KS": "—",
        "PSI": "—",
        "逾期率": "—",
        "缺失率": "—",
        "坏账率": "—",
        "特征稳定性": "—",
    }

    screenshot_notes = {
        "模型AUC": "AUC=0.87，高于基线0.80，模型区分度合格",
        "模型KS": "KS=0.42，满足>0.30要求，可截图确认",
        "逾期率": "逾期率6.5%超出上限5.0%，需重点关注",
        "PSI": "PSI=0.15<0.25，分布稳定，可截图放行",
        "迟到特征数": "3条特征迟到，其中特征X12未到位，需与数据方确认",
        "坏账率": "坏账率8.9%远超6.0%上限，拉偏总指标，需解释原因",
        "特征X12": "特征X12标记为迟到，原始任务未提交该特征快照",
        "特征X15": "特征X15值为空，原始来源显示字段缺失",
    }

    snapshot = build_snapshot(
        version="2.4.1",
        client_name="联邦客户端A",
        snapshot_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        feature_sources=feature_sources,
        boundary_overrides=boundary_overrides,
        formula_overrides=formula_overrides,
        unit_overrides=unit_overrides,
        screenshot_notes=screenshot_notes,
    )

    snapshot.summary_note = (
        "本快照合并了任务1（模型评测）和任务2（特征评测）的特征数据。"
        "逾期率、坏账率、缺失率三项越界，特征X12迟到，特征X15缺失。"
        "坏账率贡献度最高，建议优先核实样本来源。"
    )

    output_path = base / "snapshot_report.html"
    result = render_html_report(snapshot, output_path)
    print(f"✅ 报告已生成: {result}")
    print(f"   特征总数: {snapshot.total_features}")
    print(f"   正常: {snapshot.clean_count}  异常: {snapshot.dirty_count}  越界: {snapshot.out_of_boundary_count}")
    print(f"   迟到特征: {sum(1 for f in snapshot.features if f.late_reason)}")
    print(f"   拉偏样本: {len(snapshot.skewed_samples)}")
    print(f"   坏数据指针: {len(snapshot.bad_data_pointers)}")


if __name__ == "__main__":
    main()

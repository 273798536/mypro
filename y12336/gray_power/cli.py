from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta

from .conflict import ConflictDetector
from .models import (
    DelayStatus,
    ExperimentGroup,
    MetricData,
    SampleInfo,
)
from .power import PowerAnalyzer
from .report import PowerReport
from .trace import TraceChain


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="gray-power",
        description="灰度发布实验功效分析工具",
    )
    parser.add_argument(
        "--experiment", "-e",
        required=True,
        help="实验名称",
    )
    parser.add_argument(
        "--config", "-c",
        help="实验配置 JSON 文件路径（包含分组、指标、样本信息）",
    )
    parser.add_argument(
        "--alpha",
        type=float,
        default=0.05,
        help="显著性水平 (默认: 0.05)",
    )
    parser.add_argument(
        "--power",
        type=float,
        default=0.8,
        help="目标功效 (默认: 0.8)",
    )
    parser.add_argument(
        "--mde",
        type=float,
        default=None,
        help="最小可检测效应（绝对值）",
    )
    parser.add_argument(
        "--mde-relative",
        type=float,
        default=None,
        help="最小可检测效应（相对值，如 0.05 表示 5%%）",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="运行示例数据演示",
    )
    parser.add_argument(
        "--output", "-o",
        help="输出报告文件路径（默认输出到标准输出）",
    )
    return parser.parse_args(argv)


def _load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _build_from_config(config: dict) -> tuple[list[ExperimentGroup], list[MetricData], list[SampleInfo]]:
    groups = []
    for g in config.get("groups", []):
        groups.append(
            ExperimentGroup(
                group_id=g["group_id"],
                group_name=g["group_name"],
                is_control=g.get("is_control", False),
                traffic_ratio=g.get("traffic_ratio", 1.0),
                channel_ids=g.get("channel_ids", []),
                city_ids=g.get("city_ids", []),
                description=g.get("description", ""),
            )
        )

    metrics = []
    for m in config.get("metrics", []):
        arrival_time = None
        expected_time = None
        if m.get("arrival_time"):
            arrival_time = datetime.fromisoformat(m["arrival_time"])
        if m.get("expected_time"):
            expected_time = datetime.fromisoformat(m["expected_time"])

        delay_hours = 0.0
        delay_status = DelayStatus.ON_TIME
        if arrival_time and expected_time:
            diff = (arrival_time - expected_time).total_seconds() / 3600
            if diff > 0:
                delay_hours = diff
                delay_status = DelayStatus.DELAYED
        elif m.get("delay_hours", 0) > 0:
            delay_hours = m["delay_hours"]
            delay_status = DelayStatus.DELAYED

        metrics.append(
            MetricData(
                metric_id=m["metric_id"],
                metric_name=m["metric_name"],
                unit=m["unit"],
                control_mean=m["control_mean"],
                control_std=m["control_std"],
                treatment_mean=m["treatment_mean"],
                treatment_std=m["treatment_std"],
                control_n=m["control_n"],
                treatment_n=m["treatment_n"],
                arrival_time=arrival_time,
                expected_time=expected_time,
                delay_status=delay_status,
                delay_hours=delay_hours,
                source_channel=m.get("source_channel", ""),
                source_city=m.get("source_city", ""),
            )
        )

    sample_infos = []
    for s in config.get("sample_infos", []):
        sample_infos.append(
            SampleInfo(
                group_id=s["group_id"],
                required_n=s["required_n"],
                actual_n=s["actual_n"],
                min_detectable_effect=s.get("min_detectable_effect", 0.0),
                unit=s.get("unit", "observations"),
            )
        )

    return groups, metrics, sample_infos


def _build_demo() -> tuple[list[ExperimentGroup], list[MetricData], list[SampleInfo]]:
    now = datetime.now()

    groups = [
        ExperimentGroup(
            group_id="ctrl",
            group_name="对照组-全渠道",
            is_control=True,
            traffic_ratio=0.5,
            channel_ids=["ch_all"],
            city_ids=["bj", "sh"],
        ),
        ExperimentGroup(
            group_id="treat_a",
            group_name="实验组A-指定渠道",
            is_control=False,
            traffic_ratio=0.3,
            channel_ids=["ch_new"],
            city_ids=["bj"],
        ),
        ExperimentGroup(
            group_id="treat_b",
            group_name="实验组B-指定城市",
            is_control=False,
            traffic_ratio=0.2,
            channel_ids=["ch_all"],
            city_ids=["gz"],
        ),
    ]

    metrics = [
        MetricData(
            metric_id="cvr",
            metric_name="转化率",
            unit="比例",
            control_mean=0.120,
            control_std=0.028,
            treatment_mean=0.135,
            treatment_std=0.030,
            control_n=4500,
            treatment_n=2700,
            arrival_time=now,
            expected_time=now,
            delay_status=DelayStatus.ON_TIME,
            delay_hours=0.0,
            source_channel="ch_all",
            source_city="bj",
        ),
        MetricData(
            metric_id="arpu",
            metric_name="ARPU",
            unit="元",
            control_mean=45.6,
            control_std=12.3,
            treatment_mean=48.2,
            treatment_std=13.1,
            control_n=4500,
            treatment_n=2700,
            arrival_time=now + timedelta(hours=6),
            expected_time=now,
            delay_status=DelayStatus.DELAYED,
            delay_hours=6.0,
            source_channel="ch_new",
            source_city="bj",
        ),
        MetricData(
            metric_id="retention",
            metric_name="次日留存率",
            unit="比例",
            control_mean=0.35,
            control_std=0.08,
            treatment_mean=0.33,
            treatment_std=0.07,
            control_n=4500,
            treatment_n=1800,
            arrival_time=now + timedelta(hours=14),
            expected_time=now,
            delay_status=DelayStatus.DELAYED,
            delay_hours=14.0,
            source_channel="ch_all",
            source_city="gz",
        ),
    ]

    sample_infos = [
        SampleInfo(
            group_id="ctrl",
            required_n=5000,
            actual_n=4500,
            min_detectable_effect=0.02,
            unit="observations",
        ),
        SampleInfo(
            group_id="treat_a",
            required_n=3000,
            actual_n=2700,
            min_detectable_effect=0.02,
            unit="observations",
        ),
        SampleInfo(
            group_id="treat_b",
            required_n=2500,
            actual_n=1800,
            min_detectable_effect=0.02,
            unit="observations",
        ),
    ]

    return groups, metrics, sample_infos


def run(argv: list[str] | None = None) -> str:
    args = _parse_args(argv)

    analyzer = PowerAnalyzer(
        alpha=args.alpha,
        desired_power=args.power,
        mde=args.mde,
        mde_relative=args.mde_relative,
    )
    conflict_detector = ConflictDetector()
    trace_chain = TraceChain()
    report_gen = PowerReport(analyzer, conflict_detector, trace_chain)

    if args.demo:
        groups, metrics, sample_infos = _build_demo()
    elif args.config:
        config = _load_config(args.config)
        groups, metrics, sample_infos = _build_from_config(config)
    else:
        print("错误: 请指定 --config 或 --demo", file=sys.stderr)
        sys.exit(1)

    report_text, snapshot = report_gen.generate(
        experiment_name=args.experiment,
        groups=groups,
        metrics=metrics,
        sample_infos=sample_infos,
    )

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report_text)
        print(f"报告已写入: {args.output}", file=sys.stderr)
    else:
        print(report_text)

    return report_text


def main():
    run()


if __name__ == "__main__":
    main()

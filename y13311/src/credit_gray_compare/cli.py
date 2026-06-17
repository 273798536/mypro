"""命令行入口：算法值班人可直接跑，材料一目了然。"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console

from .config import AppConfig
from .engine import (
    DuplicateDetector,
    GrayCompareEngine,
    HistoryTracker,
    ResultDecomposer,
)
from .models import (
    CorrectionStatus,
    InterfaceResponse,
    ManualCorrection,
    ModelVersion,
    Sample,
    SampleSet,
    ThresholdVersion,
)
from .report import ReportGenerator

console = Console()


def _build_demo_data() -> dict:
    """构造演示数据，值班人可直接运行看到完整链路。"""
    model = ModelVersion(version_id="mv_demo_001", name="credit_model_A")

    baseline_th = ThresholdVersion(
        version_id="th_baseline",
        model_version_id=model.version_id,
        thresholds={"pass": 0.8, "reject": 0.3},
        description="基线阈值",
    )
    candidate_th = ThresholdVersion(
        version_id="th_candidate",
        model_version_id=model.version_id,
        thresholds={"pass": 0.75, "reject": 0.25},
        description="灰度阈值：降低 pass 门槛",
    )

    samples = [
        Sample(sample_id="s_001", user_id="u_001", label=0, features={"age": 30}),
        Sample(sample_id="s_002", user_id="u_002", label=1, features={"age": 25}),
        Sample(sample_id="s_003", user_id="u_003", label=0, features={"age": 40}),
        Sample(sample_id="s_004", user_id="u_004", label=0, features={"age": 35}),
    ]
    sample_set = SampleSet(
        set_id="ss_demo_001", name="评审样本集_2026W25", samples=samples
    )

    responses = [
        InterfaceResponse(
            response_id="r_001", sample_id="s_001",
            model_version_id=model.version_id,
            threshold_version_id=candidate_th.version_id,
            score=0.82, decision="pass",
        ),
        InterfaceResponse(
            response_id="r_002", sample_id="s_002",
            model_version_id=model.version_id,
            threshold_version_id=candidate_th.version_id,
            score=0.28, decision="reject",
        ),
        InterfaceResponse(
            response_id="r_003", sample_id="s_003",
            model_version_id=model.version_id,
            threshold_version_id=candidate_th.version_id,
            score=0.77, decision="pass",
        ),
        InterfaceResponse(
            response_id="r_004", sample_id="s_004",
            model_version_id=model.version_id,
            threshold_version_id=candidate_th.version_id,
            score=0.60, decision="review",
        ),
    ]

    corrections = [
        ManualCorrection(
            correction_id="c_001",
            sample_id="s_003",
            original_decision="review",
            original_score=0.77,
            corrected_decision="pass",
            corrected_score=0.77,
            operator="xiaoqiao",
            reason="特征核验后确认可通过",
            status=CorrectionStatus.CONFIRMED,
        ),
    ]

    return {
        "model": model,
        "baseline_th": baseline_th,
        "candidate_th": candidate_th,
        "sample_set": sample_set,
        "responses": responses,
        "corrections": corrections,
    }


@click.group()
@click.version_option(package_name="credit-gray-compare")
def main() -> None:
    """信贷评分灰度对比工具。"""


@main.command()
@click.option("--sample-set", "sample_set_path", type=click.Path(path_type=Path), default=None)
@click.option("--operator", default="algorithm_oncall", help="值班人标识")
@click.option("--memo", default="", help="评审备注")
@click.option("--demo", is_flag=True, default=False, help="使用内置演示数据运行")
def run(
    sample_set_path: Optional[Path],
    operator: str,
    memo: str,
    demo: bool,
) -> None:
    """执行一次灰度对比并生成报告。"""
    cfg = AppConfig.load()

    if demo or sample_set_path is None:
        console.print("[cyan]使用演示数据运行...[/cyan]")
        data = _build_demo_data()
    else:
        console.print(f"[red]暂未实现从 {sample_set_path} 加载数据，请使用 --demo[/red]")
        sys.exit(1)

    engine = GrayCompareEngine(data["baseline_th"], data["candidate_th"])
    compare_result = engine.run(
        data["sample_set"], data["responses"], data["corrections"]
    )

    tracker = HistoryTracker()
    detector = DuplicateDetector(tracker.history)
    issues = detector.check(
        data["sample_set"],
        data["model"].version_id,
        data["candidate_th"].version_id,
    )

    decomposer = ResultDecomposer(engine)
    decomposed = decomposer.decompose(
        data["sample_set"], data["sample_set"], compare_result, data["corrections"]
    )

    record = engine.to_evaluation_record(
        compare_result, data["sample_set"].set_id, operator, memo
    )
    tracker.record_evaluation(record)
    for corr in data["corrections"]:
        tracker.record_correction(corr, source_record_id=record.record_id)

    report = ReportGenerator().generate(
        data["sample_set"],
        data["sample_set"],
        compare_result,
        decomposed,
        issues,
    )
    console.print(report)

    review = tracker.review_summary()
    console.print(
        f"[dim]评审复盘摘要：{review['records']} 次评测，"
        f"共 {review['total_changes']} 个决策变化，"
        f"按类型：{review['by_type']}[/dim]"
    )
    console.print(
        f"[green]材料位置：本工具所有输入输出均在 {cfg.data_dir.resolve()} 下，"
        f"可直接找算法值班人复跑。[/green]"
    )


@main.command()
def review() -> None:
    """输出评审复盘摘要。"""
    tracker = HistoryTracker()
    summary = tracker.review_summary()
    console.print(f"历史评测次数   : {summary['records']}")
    console.print(f"总决策变化数   : {summary['total_changes']}")
    console.print(f"变化类型分布   : {summary['by_type']}")


if __name__ == "__main__":
    main()

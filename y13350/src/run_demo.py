#!/usr/bin/env python3
"""向量索引任务追踪 · 主入口

运行方式：
    python -m src.run_demo
或：
    python src/run_demo.py

将输出复核报告到终端，并写入 vector_index_review_report.txt
"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from src.tracker.task import VectorIndexTrackerTask
from src.tracker.demo_samples import build_demo_samples
from src.tracker.report import render_report, write_report


def main():
    print("[1/4] 初始化向量索引任务追踪...")
    task = VectorIndexTrackerTask(task_name="向量索引任务追踪")

    print("[2/4] 装载演示数据（含边界样本 + 验证集污染 + 人工判断）...")
    specs = build_demo_samples()
    boundary_cnt = sum(1 for s in specs if s.is_boundary)
    contaminated_cnt = sum(1 for s in specs if s.is_contaminated)
    manual_cnt = sum(1 for s in specs if s.manual_label is not None)
    print(f"      总样本: {len(specs)} 条，"
          f"边界: {boundary_cnt} 条，"
          f"污染: {contaminated_cnt} 条，"
          f"已有人工判断: {manual_cnt} 条")

    print("[3/4] 执行双模型对比跑（旧版阈值 0.5 → 新版阈值 0.45）...")
    report = task.execute(
        specs=specs,
        old_name="vector-index-dense-v1",
        old_version="20250501-baseline",
        new_name="vector-index-dense-v2",
        new_version="20260615-finetuned",
        threshold_old=0.50,
        threshold_new=0.45,
        dataset_name="现场评测集_2026Q2_batch07_混合演示版"
    )

    print("[4/4] 生成复核报告...")
    text = render_report(report)
    out_path = write_report(text, str(ROOT / "vector_index_review_report.txt"))
    print()
    print(text)
    print()
    print(f"✅ 报告已写入: {out_path}")
    print("   关键点：")
    print("   · 边界样本 VI-2026-0003：旧版 score=0.48 < 0.5 → pred=0（漏召），"
          "新版 score=0.51 ≥ 0.45 → pred=1（召回）；人工判断=1 兜底")
    print("   · 边界样本 VI-2026-0009：旧版误召，新版阈值下调前已修正为 0；"
          "人工判断=0 兜底，阈值变化不会覆盖")
    print("   · 污染样本 VI-2026-0006：单独拎出，主指标已剔除")
    print("   · 所有样本均保留 source_file:source_row 与 raw_object.doc_id，可直接指认原始行")


if __name__ == "__main__":
    main()

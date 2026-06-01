import argparse
import sys
from pathlib import Path

from .importer import Importer
from .history import HistoryLog
from .checker import NoiseChecker, RepairActionType
from .problem_list import ProblemList
from .exporter import GradeExporter


def run_pipeline(
    clips_path: str,
    annotations_path: str,
    repairs_path: str,
    reports_path: str,
    output_path: str,
    sample_dir: str = "",
):
    print("═══════════════════════════════════════════")
    print("       黑胶噪声修复训练 - 流水线")
    print("═══════════════════════════════════════════")
    print()

    if sample_dir:
        clips_path = str(Path(sample_dir) / "audio_clips.json")
        annotations_path = str(Path(sample_dir) / "noise_annotations.json")
        repairs_path = str(Path(sample_dir) / "repair_actions.json")
        reports_path = str(Path(sample_dir) / "score_reports.json")

    print("── 第1步: 数据导入 ──")
    importer = Importer()
    clips_list = importer.load_audio_clips(clips_path)
    annotations_list = importer.load_noise_annotations(annotations_path)
    repairs_list = importer.load_repair_actions(repairs_path)
    reports_list = importer.load_score_reports(reports_path)

    print(f"  音频片段: {len(clips_list)} 条")
    print(f"  噪声标注: {len(annotations_list)} 条")
    print(f"  修复操作: {len(repairs_list)} 条")
    print(f"  评分报告: {len(reports_list)} 条")
    print()
    if importer.import_warnings:
        print(importer.get_warnings_summary())
        print()

    print("── 第2步: 噪声识别与修复预览 ──")
    history = HistoryLog()
    checker = NoiseChecker(history)

    for ann in annotations_list:
        state = checker.recognize(ann, confidence=0.95)
        print(f"  识别 {ann.annotation_id}: {ann.noise_type.value}/{ann.severity.value} (第{state.recognition_round}轮)")

    print()
    print("  修复预览:")
    for repair in repairs_list:
        ann = importer.annotations.get(repair.annotation_id)
        if ann:
            preview = checker.preview_repair(ann, repair.action_type)
            flag = ""
            if preview.mis_delete_detected:
                flag += " 🔴误删原声"
            if preview.beat_drift_detected:
                flag += " 🟡节拍漂移"
            print(f"    {repair.action_id}: {preview.before_description} → {preview.after_description}{flag}")

            new_state = checker.apply_repair(ann, repair)
            if new_state.playback_note != checker._generate_playback_note(ann):
                print(f"      ↳ 回放更新: {new_state.playback_note}")
            if new_state.error_explanation != checker._generate_error_explanation(ann):
                print(f"      ↳ 错因更新: {new_state.error_explanation}")

    print()

    print("── 第3步: 问题清单 ──")
    problem_list = ProblemList(history, checker)
    problem_list.build_from_data(
        importer.clips,
        importer.annotations,
        importer.repair_actions,
        importer.reports,
    )
    print(problem_list.format_problems())
    summary = problem_list.get_summary()
    print(f"\n  统计: 严重 {summary['critical']} | 警告 {summary['warning']} | 信息 {summary['info']}")
    print(f"  其中: 误删原声 {summary['mis_delete_count']} | 节拍漂移 {summary['beat_drift_count']}")
    print()

    print("── 第4步: 成绩导出 ──")
    exporter = GradeExporter(
        importer.clips,
        importer.annotations,
        importer.repair_actions,
        importer.reports,
        history,
        checker,
        problem_list,
    )
    saved_path = exporter.export(output_path)
    print(exporter.format_export_summary(saved_path))
    print()

    print("── 第5步: 历史留痕验证 ──")
    mis_delete_entries = history.get_mis_delete_entries()
    if mis_delete_entries:
        print(f"  误删原声事件共 {len(mis_delete_entries)} 条（历史中永久留痕，不可被节拍漂移或连续爆音掩盖）:")
        for entry in mis_delete_entries:
            print(f"    [{entry.timestamp}] {entry.annotation_id}: {entry.description}")
    else:
        print("  无误删原声事件")

    print()
    print(f"✅ 全部流程完成。成绩导出已保存至: {saved_path}")
    return saved_path


def main():
    parser = argparse.ArgumentParser(description="黑胶噪声修复训练工具")
    parser.add_argument(
        "--samples",
        type=str,
        default="samples",
        help="样例数据目录路径",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="output/grade_export.json",
        help="成绩导出路径",
    )
    parser.add_argument(
        "--clips",
        type=str,
        default="",
        help="音频片段数据文件路径（覆盖 --samples）",
    )
    parser.add_argument(
        "--annotations",
        type=str,
        default="",
        help="噪声标注数据文件路径（覆盖 --samples）",
    )
    parser.add_argument(
        "--repairs",
        type=str,
        default="",
        help="修复操作数据文件路径（覆盖 --samples）",
    )
    parser.add_argument(
        "--reports",
        type=str,
        default="",
        help="评分报告数据文件路径（覆盖 --samples）",
    )

    args = parser.parse_args()

    clips_path = args.clips
    annotations_path = args.annotations
    repairs_path = args.repairs
    reports_path = args.reports

    use_sample_dir = not (clips_path and annotations_path and repairs_path and reports_path)
    sample_dir = args.samples if use_sample_dir else ""

    run_pipeline(
        clips_path=clips_path,
        annotations_path=annotations_path,
        repairs_path=repairs_path,
        reports_path=reports_path,
        output_path=args.output,
        sample_dir=sample_dir,
    )


if __name__ == "__main__":
    main()

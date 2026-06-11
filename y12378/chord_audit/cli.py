import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chord_audit.audit_engine import AuditEngine
from chord_audit.models import SampleClassification, ConflictType
from chord_audit.sample_manager import load_sample_from_directory, save_sample


def _check_mido_available():
    try:
        import mido
        return True
    except ImportError:
        return False


def _get_midi_processor():
    from chord_audit.midi_processor import (
        analyze_midi_chords,
        generate_sample_midi,
        MIDIProcessingError,
        MIDINotAvailableError,
    )
    return analyze_midi_chords, generate_sample_midi, MIDIProcessingError, MIDINotAvailableError


def _print_mido_missing_hint():
    print("[!] 缺少依赖: mido 未安装")
    print("    安装命令: pip install -r requirements.txt")
    print("    或单独安装: pip install mido>=1.2.0")


def cmd_audit(args):
    engine = AuditEngine(args.data_dir)
    try:
        engine.load_data()
    except Exception as e:
        print(f"[!] 加载数据失败: {e}")
        return 1
    if not engine.samples:
        print("[!] 未找到任何样本数据, 请检查数据目录")
        return 1
    print(f"[*] 加载了 {len(engine.samples)} 个样本")

    midi_processed = sum(
        1 for s in engine.samples
        if s.meta and s.meta.get("_midi_processed")
    )
    midi_missing = sum(
        1 for s in engine.samples
        if s.meta and s.meta.get("_midi_missing")
    )
    midi_error = sum(
        1 for s in engine.samples
        if s.meta and s.meta.get("_midi_error")
    )
    print(f"    MIDI处理: {midi_processed} 成功, {midi_missing} 无文件, {midi_error} 失败")

    try:
        summary = engine.run_audit()
    except Exception as e:
        print(f"[!] 审计执行失败: {e}")
        return 1
    print(f"[*] 审计完成: {summary['audit_time']}")
    print(f"    总样本数: {summary['total_samples']}")
    print(f"    正常样本: {summary['classification_counts']['normal']}")
    print(f"    边界样本: {summary['classification_counts']['boundary']}")
    print(f"    坏样本:   {summary['classification_counts']['bad']}")
    print(f"    冲突总数: {summary['total_conflicts']}")
    print(f"    有冲突样本: {summary['samples_with_conflicts']}")
    print(f"    结论不一致样本: {summary['samples_conclusion_inconsistent']}")
    if summary['conflict_counts']:
        print("    冲突类型分布:")
        for ct, count in summary['conflict_counts'].items():
            type_name = {
                "chord_conflict": "和弦冲突",
                "bar_misalignment": "小节错位",
                "missed_modulation": "转调漏判",
            }.get(ct, ct)
            print(f"      {type_name}: {count}")
    if summary['failure_paths']:
        print(f"\n[!] 发现 {len(summary['failure_paths'])} 条失败路径:")
        for fp in summary['failure_paths']:
            type_name = {
                "chord_conflict": "和弦冲突",
                "bar_misalignment": "小节错位",
                "missed_modulation": "转调漏判",
            }.get(fp['conflict_type'], fp['conflict_type'])
            severity_mark = {
                "low": "⚠",
                "medium": "⚠⚠",
                "high": "🔴",
            }.get(fp['severity'], "?")
            print(
                f"  {severity_mark} [{fp['sample_id']}] "
                f"{type_name} | {fp['description']}"
            )
    output_dir = args.output or os.path.join(args.data_dir, "audit_output")
    result_dir = engine.save_results(output_dir)
    print(f"\n[✓] 结果已保存到: {result_dir}")
    return 0


def cmd_list(args):
    engine = AuditEngine(args.data_dir)
    engine.load_data()
    if not engine.samples:
        print("[!] 未找到任何样本数据")
        return 1
    engine.run_audit()
    filtered = engine.samples
    filter_desc = "全部"
    if args.type:
        cls = SampleClassification(args.type)
        filtered = [s for s in filtered if s.classification == cls]
        filter_desc = {"normal": "正常", "boundary": "边界", "bad": "坏"}[args.type]
    if args.conflicts_only:
        filtered = [s for s in filtered if s.conflicts]
        filter_desc += " (有冲突)"
    if args.conflict_type:
        ct = ConflictType(args.conflict_type)
        new_filtered = []
        for s in filtered:
            for c in s.conflicts:
                if c.conflict_type == ct:
                    new_filtered.append(s)
                    break
        filtered = new_filtered
        type_name = {
            "chord_conflict": "和弦冲突",
            "bar_misalignment": "小节错位",
            "missed_modulation": "转调漏判",
        }.get(args.conflict_type, args.conflict_type)
        filter_desc += f" ({type_name})"
    print(f"[*] 样本列表 ({filter_desc}): 共 {len(filtered)} 条")
    print("-" * 80)
    for s in filtered:
        cls_label = {"normal": "正常", "boundary": "边界", "bad": "坏"}.get(
            s.classification.value, s.classification.value
        )
        conflict_count = len(s.conflicts)
        consistency = "✓一致" if s.conclusion_consistent else "✗不一致"
        midi_status = "-"
        if s.meta:
            if s.meta.get("_midi_processed"):
                midi_status = "✓MIDI"
            elif s.meta.get("_midi_missing"):
                midi_status = "✗无MIDI"
            elif s.meta.get("_midi_error"):
                midi_status = "⚠MIDI错误"
        print(
            f"  ID: {s.sample_id:12s} | "
            f"分类: {cls_label:4s} | "
            f"冲突: {conflict_count:2d} | "
            f"结论: {consistency} | "
            f"MIDI: {midi_status} | "
            f"路径: {s.melody_midi_path}"
        )
    return 0


def cmd_detail(args):
    engine = AuditEngine(args.data_dir)
    engine.load_data()
    if not engine.samples:
        print("[!] 未找到任何样本数据")
        return 1
    engine.run_audit()
    detail = engine.get_sample_detail(args.sample_id)
    if detail is None:
        print(f"[!] 未找到样本: {args.sample_id}")
        return 1
    print(f"[*] 样本详情: {args.sample_id}")
    print("=" * 80)
    print(f"  旋律MIDI: {detail.get('melody_midi_path', 'N/A')}")
    midi_status = "未知"
    meta = detail.get("meta", {})
    if meta.get("_midi_processed"):
        midi_status = "✓ 已从 MIDI 生成分析数据"
    elif meta.get("_midi_missing"):
        midi_status = "✗ MIDI 文件不存在，使用预设数据"
    elif meta.get("_midi_error"):
        midi_status = f"⚠ 处理失败: {meta.get('_midi_error')}"
    print(f"  MIDI状态: {midi_status}")
    print(f"  分类: {detail.get('classification', 'N/A')}")
    print(f"  结论一致: {'是' if detail.get('conclusion_consistent') else '否'}")
    print()
    analyses = detail.get("chord_analyses", [])
    if analyses:
        print("  [和弦分析]")
        for a in analyses:
            match_mark = {
                "match": "✓",
                "mismatch": "✗",
                "uncertain": "?",
            }.get(a.get("match_result", ""), "?")
            print(
                f"    {match_mark} 小节 {a['bar_start']}-{a['bar_end']}: "
                f"期望 {a['expected_chord']} | 实际 {a['actual_chord']} "
                f"(置信度: {a.get('confidence', 0):.2f})"
            )
    print()
    versions = detail.get("version_records", [])
    if versions:
        print("  [版本记录]")
        for v in versions:
            source_label = {
                "teacher_annotation": "老师批注",
                "ai_analysis": "AI分析",
                "manual_correction": "人工修正",
                "system_auto": "系统自动",
            }.get(v.get("source", ""), v.get("source", ""))
            latest_mark = " [最新]" if v.get("is_latest") else ""
            print(
                f"    v{v['version_id']} ({source_label}){latest_mark}"
            )
            print(
                f"      时间: {v.get('timestamp', 'N/A')}"
            )
            print(
                f"      结论: {v.get('chord_conclusion', 'N/A')}"
            )
            if v.get("content"):
                print(f"      内容: {v['content']}")
    print()
    conflicts = detail.get("conflicts", [])
    if conflicts:
        print("  [冲突记录]")
        for c in conflicts:
            type_name = {
                "chord_conflict": "和弦冲突",
                "bar_misalignment": "小节错位",
                "missed_modulation": "转调漏判",
            }.get(c.get("conflict_type", ""), c.get("conflict_type", ""))
            severity = {"low": "低", "medium": "中", "high": "高"}.get(
                c.get("severity", ""), c.get("severity", "")
            )
            resolved = "已解决" if c.get("resolved") else "未解决"
            print(f"    [{type_name}] {c.get('description', '')}")
            print(f"      严重度: {severity} | 状态: {resolved}")
            if c.get("evidence_version_ids"):
                print(
                    f"      证据版本: {', '.join(c['evidence_version_ids'])}"
                )
    print()
    trace_paths = detail.get("trace_paths", [])
    if trace_paths:
        print("  [追溯路径]")
        for tp in trace_paths:
            type_name = {
                "chord_conflict": "和弦冲突",
                "bar_misalignment": "小节错位",
                "missed_modulation": "转调漏判",
            }.get(tp.get("conflict_type", ""), tp.get("conflict_type", ""))
            trace = tp.get("trace", {})
            print(f"    → {type_name} 追溯:")
            print(f"      错因标注: {trace.get('error_annotation', 'N/A')}")
            ta = trace.get("chord_analyses", [])
            if ta:
                print("      相关和弦分析:")
                for a in ta:
                    print(
                        f"        小节 {a['bar_start']}-{a['bar_end']}: "
                        f"{a['expected_chord']} vs {a['actual_chord']}"
                    )
            tv = trace.get("version_comparison", [])
            if tv:
                print("      版本对比:")
                for v in tv:
                    changed = "结论变更!" if v.get("conclusion_changed") else "无变更"
                    print(
                        f"        {v['older_version_id']} → {v['newer_version_id']}: {changed}"
                    )
            om = trace.get("overwritten_modulation", [])
            if om:
                print("      被覆盖的转调证据:")
                for o in om:
                    print(f"        ⚠ {o.get('warning', '')}")
    if args.json:
        json_path = args.json
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(detail, f, ensure_ascii=False, indent=2)
        print(f"\n  [✓] 详情已导出到: {json_path}")
    return 0


def cmd_failures(args):
    engine = AuditEngine(args.data_dir)
    engine.load_data()
    if not engine.samples:
        print("[!] 未找到任何样本数据")
        return 1
    summary = engine.run_audit()
    paths = summary.get("failure_paths", [])
    if not paths:
        print("[✓] 未发现任何失败路径, 所有样本通过审计")
        return 0
    print(f"[!] 发现 {len(paths)} 条失败路径:")
    print("=" * 80)
    if args.conflict_type:
        ct = ConflictType(args.conflict_type)
        paths = [p for p in paths if p["conflict_type"] == ct.value]
        type_name = {
            "chord_conflict": "和弦冲突",
            "bar_misalignment": "小节错位",
            "missed_modulation": "转调漏判",
        }.get(args.conflict_type, args.conflict_type)
        print(f"  筛选: {type_name}")
    for i, fp in enumerate(paths, 1):
        type_name = {
            "chord_conflict": "和弦冲突",
            "bar_misalignment": "小节错位",
            "missed_modulation": "转调漏判",
        }.get(fp["conflict_type"], fp["conflict_type"])
        severity = {"low": "低", "medium": "中", "high": "高"}.get(
            fp["severity"], fp["severity"]
        )
        print(f"\n  失败路径 #{i}:")
        print(f"    样本: {fp['sample_id']} (分类: {fp['classification']})")
        print(f"    类型: {type_name}")
        print(f"    严重度: {severity}")
        print(f"    描述: {fp['description']}")
        print(f"    小节范围: {fp['bar_range'][0]}-{fp['bar_range'][1]}")
        if fp.get("evidence_version_ids"):
            print(f"    证据版本: {', '.join(fp['evidence_version_ids'])}")
        trace = fp.get("trace", {})
        if trace.get("chord_analyses"):
            print("    相关和弦分析:")
            for a in trace["chord_analyses"]:
                print(
                    f"      小节 {a['bar_start']}-{a['bar_end']}: "
                    f"期望 {a['expected_chord']} | 实际 {a['actual_chord']}"
                )
        if trace.get("version_comparison"):
            print("    版本对比:")
            for v in trace["version_comparison"]:
                changed = "结论变更!" if v.get("conclusion_changed") else "无变更"
                print(
                    f"      {v['older_version_id']} → {v['newer_version_id']}: {changed}"
                )
    return 0


def cmd_midi_analyze(args):
    if not _check_mido_available():
        _print_mido_missing_hint()
        return 1
    analyze_midi_chords, _, MIDIProcessingError, MIDINotAvailableError = _get_midi_processor()

    try:
        result = analyze_midi_chords(args.midi_file, args.beats_per_bar)
    except MIDINotAvailableError as e:
        print(f"[!] MIDI 库不可用: {e}")
        return 1
    except MIDIProcessingError as e:
        print(f"[!] MIDI 处理失败: {e}")
        return 1
    except Exception as e:
        print(f"[!] 未知错误: {e}")
        return 1

    print(f"[*] MIDI 文件分析: {args.midi_file}")
    print("=" * 80)
    timing = result.get("timing", {})
    print(f"  BPM: {timing.get('bpm', 'N/A')}")
    print(f"  每小节拍数: {timing.get('beats_per_bar', 'N/A')}")
    print(f"  总音符数: {result.get('total_notes', 0)}")
    print(f"  小节数: {result.get('num_bars', 0)}")
    print()

    print("  [和弦识别结果]")
    print("-" * 80)
    for ci in result.get("chord_identifications", []):
        bar = ci["bar"]
        chord_info = ci.get("chord")
        note_count = ci.get("note_count", 0)
        if chord_info:
            chord_label = chord_info.get("chord", "未知")
            confidence = chord_info.get("confidence", 0.0)
            print(f"    小节 {bar:2d}: {chord_label:10s} (置信度: {confidence:.2f}, 音符数: {note_count})")
        else:
            print(f"    小节 {bar:2d}: 无法识别 (音符数: {note_count})")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n[✓] 分析结果已保存到: {args.json}")

    return 0


def cmd_midi_generate(args):
    if not _check_mido_available():
        _print_mido_missing_hint()
        return 1
    _, generate_sample_midi, MIDIProcessingError, MIDINotAvailableError = _get_midi_processor()

    chords = args.chords.split(",") if args.chords else [
        "C:maj", "G:maj", "A:min", "F:maj",
        "C:maj", "G:maj", "F:maj", "C:maj",
    ]

    try:
        output_path = generate_sample_midi(
            args.output,
            chords,
            bpm=args.bpm,
            beats_per_bar=args.beats_per_bar,
            octave=args.octave,
        )
    except MIDINotAvailableError as e:
        print(f"[!] MIDI 库不可用: {e}")
        return 1
    except Exception as e:
        print(f"[!] 生成 MIDI 失败: {e}")
        return 1

    print(f"[✓] 示例 MIDI 已生成: {output_path}")
    print(f"    和弦进行: {', '.join(chords)}")
    print(f"    BPM: {args.bpm}")
    print(f"    每小节拍数: {args.beats_per_bar}")
    print(f"    八度: {args.octave}")
    return 0


def cmd_process_sample(args):
    if not _check_mido_available():
        _print_mido_missing_hint()
        return 1

    sample_dir = args.sample_dir
    if not os.path.isdir(sample_dir):
        print(f"[!] 样本目录不存在: {sample_dir}")
        return 1

    try:
        sample = load_sample_from_directory(sample_dir)
    except Exception as e:
        print(f"[!] 加载样本失败: {e}")
        return 1

    if sample is None:
        print(f"[!] 无法加载样本: {sample_dir}")
        return 1

    midi_processed = sample.meta.get("_midi_processed", False) if sample.meta else False
    midi_missing = sample.meta.get("_midi_missing", False) if sample.meta else False
    midi_error = sample.meta.get("_midi_error", "") if sample.meta else ""

    print(f"[*] 样本处理: {sample.sample_id}")
    print("=" * 80)
    print(f"  分类: {sample.classification.value}")
    print(f"  MIDI 路径: {sample.melody_midi_path}")

    if midi_processed:
        print(f"  MIDI 处理: ✓ 已从 MIDI 生成分析数据")
    elif midi_missing:
        print(f"  MIDI 处理: ✗ MIDI 文件不存在，使用预设数据")
    elif midi_error:
        print(f"  MIDI 处理: ⚠ 处理失败: {midi_error}")
    else:
        print(f"  MIDI 处理: - 未处理")

    print(f"  和弦分析数: {len(sample.chord_analyses)}")
    print(f"  版本记录数: {len(sample.version_records)}")
    print()

    if sample.chord_analyses:
        print("  [和弦分析]")
        for a in sample.chord_analyses:
            match_mark = {
                "match": "✓",
                "mismatch": "✗",
                "uncertain": "?",
            }.get(a.match_result.value, "?")
            print(
                f"    {match_mark} 小节 {a.bar_start}-{a.bar_end}: "
                f"期望 {a.expected_chord} | 实际 {a.actual_chord} "
                f"(置信度: {a.confidence:.2f})"
            )

    if args.output:
        output_dir = args.output
        save_sample(sample, output_dir)
        chords_path = os.path.join(output_dir, "accompaniment_chords.json")
        if not os.path.exists(chords_path):
            chords_data = [a.to_dict() for a in sample.chord_analyses]
            with open(chords_path, "w", encoding="utf-8") as f:
                json.dump(chords_data, f, ensure_ascii=False, indent=2)
        print(f"\n[✓] 处理结果已保存到: {output_dir}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="AI伴奏错和弦复盘 - 检查模型链路, 追溯和弦冲突、小节错位和转调漏判"
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    p_audit = subparsers.add_parser("audit", help="执行完整审计")
    p_audit.add_argument("data_dir", help="样本数据目录")
    p_audit.add_argument("-o", "--output", help="输出目录 (默认: data_dir/audit_output)")

    p_list = subparsers.add_parser("list", help="列出样本")
    p_list.add_argument("data_dir", help="样本数据目录")
    p_list.add_argument(
        "-t", "--type", choices=["normal", "boundary", "bad"], help="按分类筛选"
    )
    p_list.add_argument("--conflicts-only", action="store_true", help="只显示有冲突的样本")
    p_list.add_argument(
        "--conflict-type",
        choices=["chord_conflict", "bar_misalignment", "missed_modulation"],
        help="按冲突类型筛选",
    )

    p_detail = subparsers.add_parser("detail", help="查看样本详情 (含追溯路径)")
    p_detail.add_argument("data_dir", help="样本数据目录")
    p_detail.add_argument("sample_id", help="样本ID")
    p_detail.add_argument("--json", help="导出详情到JSON文件")

    p_failures = subparsers.add_parser("failures", help="查看所有失败路径")
    p_failures.add_argument("data_dir", help="样本数据目录")
    p_failures.add_argument(
        "--conflict-type",
        choices=["chord_conflict", "bar_misalignment", "missed_modulation"],
        help="按冲突类型筛选失败路径",
    )

    p_midi_analyze = subparsers.add_parser("midi-analyze", help="分析 MIDI 文件的和弦")
    p_midi_analyze.add_argument("midi_file", help="MIDI 文件路径")
    p_midi_analyze.add_argument(
        "--beats-per-bar", type=int, default=4, help="每小节拍数 (默认: 4)"
    )
    p_midi_analyze.add_argument("--json", help="导出分析结果到 JSON 文件")

    p_midi_generate = subparsers.add_parser("midi-generate", help="生成示例 MIDI 文件")
    p_midi_generate.add_argument("output", help="输出 MIDI 文件路径")
    p_midi_generate.add_argument(
        "--chords",
        help="逗号分隔的和弦列表 (如: C:maj,G:maj,A:min,F:maj)",
    )
    p_midi_generate.add_argument("--bpm", type=int, default=120, help="BPM (默认: 120)")
    p_midi_generate.add_argument(
        "--beats-per-bar", type=int, default=4, help="每小节拍数 (默认: 4)"
    )
    p_midi_generate.add_argument("--octave", type=int, default=4, help="八度 (默认: 4)")

    p_process_sample = subparsers.add_parser(
        "process-sample", help="处理单个样本 (含 MIDI 分析)"
    )
    p_process_sample.add_argument("sample_dir", help="样本目录路径")
    p_process_sample.add_argument("-o", "--output", help="输出目录")

    args = parser.parse_args()
    if args.command == "audit":
        return cmd_audit(args)
    elif args.command == "list":
        return cmd_list(args)
    elif args.command == "detail":
        return cmd_detail(args)
    elif args.command == "failures":
        return cmd_failures(args)
    elif args.command == "midi-analyze":
        return cmd_midi_analyze(args)
    elif args.command == "midi-generate":
        return cmd_midi_generate(args)
    elif args.command == "process-sample":
        return cmd_process_sample(args)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main() or 0)

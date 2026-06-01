import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chord_audit.audit_engine import AuditEngine
from chord_audit.models import SampleClassification, ConflictType


def cmd_audit(args):
    engine = AuditEngine(args.data_dir)
    engine.load_data()
    if not engine.samples:
        print("[!] 未找到任何样本数据, 请检查数据目录")
        return 1
    print(f"[*] 加载了 {len(engine.samples)} 个样本")
    summary = engine.run_audit()
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
        print(
            f"  ID: {s.sample_id:12s} | "
            f"分类: {cls_label:4s} | "
            f"冲突: {conflict_count} | "
            f"结论: {consistency} | "
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

    args = parser.parse_args()
    if args.command == "audit":
        return cmd_audit(args)
    elif args.command == "list":
        return cmd_list(args)
    elif args.command == "detail":
        return cmd_detail(args)
    elif args.command == "failures":
        return cmd_failures(args)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main() or 0)

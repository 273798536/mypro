#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from motif_retriever import RetrievalEngine, Motif, Note


def main():
    parser = argparse.ArgumentParser(description="旋律动机检索器")
    parser.add_argument("--samples", nargs="*", help="样例JSON文件路径")
    parser.add_argument("--query", required=True, help="查询动机ID")
    parser.add_argument("--output", default="output/report.json", help="报告输出路径")
    parser.add_argument("--audit-output", default="output/audit.json", help="审计日志输出路径")
    parser.add_argument("--text-output", default=None, help="文本报告输出路径（可选）")
    parser.add_argument("--fill-field", nargs=3, metavar=("MOTIF_ID", "FIELD", "VALUE"), action="append", help="人工补全字段: 动机ID 字段名 值")
    parser.add_argument("--set-offset", nargs=2, metavar=("FRAG_ID", "OFFSET"), action="append", help="人工设定小节偏移: 片段ID 偏移值")
    args = parser.parse_args()

    engine = RetrievalEngine()

    if args.samples:
        for sample_path in args.samples:
            p = Path(sample_path)
            if not p.exists():
                print(f"样例文件不存在: {sample_path}", file=sys.stderr)
                sys.exit(1)
            print(f"导入样例: {p.name}")
            engine.load_samples(str(p))

    if not engine.importer.motifs:
        print("未导入任何动机，退出", file=sys.stderr)
        sys.exit(1)

    print(f"已导入 {len(engine.importer.motifs)} 个动机、{len(engine.importer.fragments)} 个片段、{len(engine.importer.measures)} 个小节")

    missing_report = []
    for m in engine.importer.motifs:
        if m.missing_fields:
            missing_report.append(f"  动机 {m.id}: 缺失字段 {m.missing_fields}")
    if missing_report:
        print("缺失字段警告:")
        for line in missing_report:
            print(line)

    if args.fill_field:
        for motif_id, field_name, value_str in args.fill_field:
            try:
                value = json.loads(value_str) if value_str.startswith(("[", "{", '"')) else value_str
                if value_str.isdigit():
                    value = int(value_str)
                engine.manual_correct("Motif", motif_id, field_name, value, operator="cli_user", reason="命令行人工补全")
                print(f"已补全: 动机 {motif_id} 的 {field_name} = {value}")
            except Exception as e:
                print(f"补全失败: {e}", file=sys.stderr)

    if args.set_offset:
        for frag_id, offset_str in args.set_offset:
            try:
                offset = int(offset_str)
                engine.importer.apply_measure_offset(frag_id, offset, operator="cli_user")
                print(f"已设定: 片段 {frag_id} 小节偏移 = {offset}")
            except Exception as e:
                print(f"设定偏移失败: {e}", file=sys.stderr)

    print(f"\n开始检索动机: {args.query}")
    report, text = engine.generate_report(args.query)
    print("\n" + text)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    engine.save_report(report, str(output_path))
    print(f"\nJSON报告已保存: {output_path}")

    if args.text_output:
        text_path = Path(args.text_output)
        text_path.parent.mkdir(parents=True, exist_ok=True)
        text_path.write_text(text, encoding="utf-8")
        print(f"文本报告已保存: {text_path}")

    audit_path = Path(args.audit_output)
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    engine.save_audit(str(audit_path))
    print(f"审计日志已保存: {audit_path}")


if __name__ == "__main__":
    main()

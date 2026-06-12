#!/usr/bin/env python3
import argparse
import json
import sys
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from models import ProcessingResult, HistoryRecord
from recalculation_verifier import RecalculationVerifier
from report_generator import ReportGenerator
from demo_data import create_demo_records


class BayesianReviewCLI:
    def __init__(self):
        self.verifier = RecalculationVerifier()
        self.report_generator = ReportGenerator()

    def run(
        self,
        input_file: Optional[str] = None,
        output_file: Optional[str] = None,
        failures_file: Optional[str] = None,
        use_demo: bool = False,
        record_id: Optional[str] = None,
        manual_params: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        try:
            if use_demo:
                records = create_demo_records()
            elif input_file:
                records = self._load_records(input_file)
            else:
                return {
                    "success": False,
                    "error": "必须指定输入文件或使用演示数据",
                    "exit_code": 1,
                }

            if record_id:
                records = [r for r in records if r.record_id == record_id]
                if not records:
                    return {
                        "success": False,
                        "error": f"未找到记录ID: {record_id}",
                        "exit_code": 1,
                    }

            results = []
            for record in records:
                result = self.verifier.recalculate_record(record, manual_params)
                results.append(result)

            md_report = self.report_generator.generate_markdown(results)

            if output_file:
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(md_report)

            failures_json = self.report_generator.generate_failures_json(results)
            if failures_file:
                with open(failures_file, "w", encoding="utf-8") as f:
                    json.dump(failures_json, f, ensure_ascii=False, indent=2)

            failure_count = sum(1 for r in results if r.failure_reason)

            return {
                "success": True,
                "total_records": len(results),
                "processed_count": sum(1 for r in results if r.status == "processed"),
                "pending_count": sum(1 for r in results if r.status == "pending_material"),
                "manual_count": sum(1 for r in results if r.status == "manual_overridden"),
                "empty_count": sum(1 for r in results if r.status == "empty_set"),
                "extrapolation_count": sum(1 for r in results if r.status == "extrapolation_out_of_bounds"),
                "failure_count": failure_count,
                "output_file": output_file,
                "failures_file": failures_file,
                "report_content": md_report,
                "failures": failures_json,
                "exit_code": 0 if failure_count == 0 else 2,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"执行异常: {str(e)}",
                "exit_code": 3,
            }

    def _load_records(self, input_file: str) -> List[HistoryRecord]:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"输入文件不存在: {input_file}")

        _, ext = os.path.splitext(input_file)

        if ext.lower() == ".json":
            return self._load_from_json(input_file)
        elif ext.lower() in [".md", ".markdown"]:
            return self._load_from_markdown(input_file)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

    def _load_from_json(self, input_file: str) -> List[HistoryRecord]:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = []
        for item in data:
            record = HistoryRecord(
                record_id=item.get("record_id", ""),
                question_id=item.get("question_id", ""),
                question_text=item.get("question_text", ""),
                is_empty_set=item.get("is_empty_set", False),
                empty_set_reason=item.get("empty_set_reason"),
                tags=item.get("tags", []),
                metadata=item.get("metadata", {}),
            )

            for v in item.get("answer_versions", []):
                from models import AnswerVersion
                version = AnswerVersion(
                    version_id=v.get("version_id", ""),
                    answer_text=v.get("answer_text", ""),
                    timestamp=datetime.fromisoformat(v.get("timestamp")) if v.get("timestamp") else datetime.now(),
                    author=v.get("author"),
                    remark=v.get("remark"),
                    screenshot_ref=v.get("screenshot_ref"),
                    is_latest=v.get("is_latest", False),
                    source_note=v.get("source_note"),
                )
                record.answer_versions.append(version)

            records.append(record)

        return records

    def _load_from_markdown(self, input_file: str) -> List[HistoryRecord]:
        with open(input_file, "r", encoding="utf-8") as f:
            content = f.read()

        import re

        records = []
        sections = re.split(r"\n##\s+", content)

        for idx, section in enumerate(sections[1:], 1):
            lines = section.strip().split("\n")
            if not lines:
                continue

            title = lines[0].strip()
            record_id_match = re.search(r"记录\s*(\S+)", title)
            record_id = record_id_match.group(1) if record_id_match else f"REC_{idx:04d}"

            question_match = re.search(r"\*\*问题\*\*:\s*(.+)", section)
            question_text = question_match.group(1).strip() if question_match else ""

            answer_texts = []
            for m in re.finditer(r"```([\s\S]*?)```", section):
                answer_texts.append(m.group(1).strip())

            if not answer_texts:
                answer_match = re.search(r"####\s*答案\s*\n+(.+?)(?=\n####|\Z)", section, re.DOTALL)
                if answer_match:
                    answer_texts.append(answer_match.group(1).strip())

            record = HistoryRecord(
                record_id=record_id,
                question_id=f"Q_{idx:04d}",
                question_text=question_text,
            )

            from models import AnswerVersion

            for v_idx, answer in enumerate(answer_texts, 1):
                version = AnswerVersion(
                    version_id=f"{record_id}_V{v_idx}",
                    answer_text=answer,
                    timestamp=datetime.now(),
                    is_latest=(v_idx == len(answer_texts)),
                )
                record.answer_versions.append(version)

            records.append(record)

        return records


def main():
    parser = argparse.ArgumentParser(
        description="贝叶斯先验错题复盘系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 运行演示数据
  python cli.py --demo

  # 指定输入文件和输出报告
  python cli.py -i input.json -o report.md

  # 生成失败原因JSON
  python cli.py -i input.json -o report.md -f failures.json

  # 单条记录复算
  python cli.py -i input.json --record-id REC_0001

  # 手动指定参数复算
  python cli.py --demo --record-id REC_0001 --prior 0.6 --likelihood 0.8 --evidence 0.5
        """,
    )

    parser.add_argument("-i", "--input", help="输入文件路径 (JSON或Markdown)")
    parser.add_argument("-o", "--output", help="输出Markdown报告路径")
    parser.add_argument("-f", "--failures", help="失败原因JSON输出路径")
    parser.add_argument("--demo", action="store_true", help="使用演示数据")
    parser.add_argument("--record-id", help="仅处理指定记录ID")
    parser.add_argument("--prior", type=float, help="手动指定先验概率")
    parser.add_argument("--likelihood", type=float, help="手动指定似然")
    parser.add_argument("--evidence", type=float, help="手动指定边际似然")
    parser.add_argument("--json", action="store_true", help="以JSON格式输出结果到stdout")
    parser.add_argument("--quiet", action="store_true", help="静默模式，不打印报告到stdout")

    args = parser.parse_args()

    if not args.demo and not args.input:
        parser.print_help()
        sys.exit(1)

    manual_params = None
    if args.prior is not None or args.likelihood is not None or args.evidence is not None:
        manual_params = {
            "prior": args.prior if args.prior is not None else 0.0,
            "likelihood": args.likelihood if args.likelihood is not None else 0.0,
            "evidence": args.evidence if args.evidence is not None else 0.0,
        }

    cli = BayesianReviewCLI()
    result = cli.run(
        input_file=args.input,
        output_file=args.output,
        failures_file=args.failures,
        use_demo=args.demo,
        record_id=args.record_id,
        manual_params=manual_params,
    )

    if args.json:
        output = {
            "success": result["success"],
            "exit_code": result["exit_code"],
        }
        if not result["success"]:
            output["error"] = result.get("error")
        else:
            output["statistics"] = {
                "total": result["total_records"],
                "processed": result["processed_count"],
                "pending": result["pending_count"],
                "manual": result["manual_count"],
                "empty": result["empty_count"],
                "extrapolation": result["extrapolation_count"],
                "failures": result["failure_count"],
            }
            if result.get("failures"):
                output["failures"] = result["failures"]
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        if not result["success"]:
            print(f"错误: {result['error']}", file=sys.stderr)
        else:
            if not args.quiet:
                print(result["report_content"])
                print("\n" + "=" * 60 + "\n")
                print(f"统计: 总计 {result['total_records']} 条记录")
                print(f"  - 已处理: {result['processed_count']}")
                print(f"  - 待补材料: {result['pending_count']}")
                print(f"  - 人工改判: {result['manual_count']}")
                print(f"  - 空集合: {result['empty_count']}")
                print(f"  - 外推越界: {result['extrapolation_count']}")
                print(f"  - 失败: {result['failure_count']}")
                if result["output_file"]:
                    print(f"\n报告已写入: {result['output_file']}")
                if result["failures_file"]:
                    print(f"失败记录已写入: {result['failures_file']}")

    sys.exit(result["exit_code"])


if __name__ == "__main__":
    main()

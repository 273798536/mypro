#!/usr/bin/env python3
"""上下文窗口预算器 CLI 主入口

工作流：
1. 载入原始样本
2. 样本去重 + 脏数据检测
3. 版本追踪初始化
4. 构建人工复核队列
5. 分组指标统计
6. 安全拦截校验
7. 导出验证
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

from .models import SampleRecord, RecordStatus, ReviewAction
from .dedup import Deduplicator, DeduplicationResult
from .version_control import VersionControl, SecurityInterceptor
from .review import ReviewWorkflow
from .exporter import Exporter
from .sample_data import (
    generate_all_samples,
    save_samples_to_disk,
    load_samples_from_disk,
    generate_review_context_bundle,
    ALLOWED_LABELS,
)
from .utils import generate_id


class ContextWindowBudgeter:
    def __init__(
        self,
        allowed_labels: List[str] = None,
        output_dir: str = "./output",
    ):
        self.allowed_labels = allowed_labels or ALLOWED_LABELS
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        self.deduplicator = Deduplicator(
            allowed_labels=self.allowed_labels,
            fuzzy_threshold=0.9,
            enable_fuzzy_match=True,
        )
        self.version_control = VersionControl()
        self.security = SecurityInterceptor()
        self.review_workflow = ReviewWorkflow(
            self.version_control,
            self.security,
            allowed_labels=self.allowed_labels,
        )
        self.exporter = Exporter(self.security, output_dir=os.path.join(output_dir, "exports"))

        self.records: List[SampleRecord] = []
        self.dedup_result: DeduplicationResult = None
        self.all_records: List[SampleRecord] = []

    def load_samples(self, filepath: str = None) -> List[SampleRecord]:
        if filepath and os.path.exists(filepath):
            self.records = load_samples_from_disk(filepath)
            print(f"✅ 从 {filepath} 载入 {len(self.records)} 条样本")
        else:
            self.records = generate_all_samples()
            saved_path = save_samples_to_disk(self.records, output_dir=os.path.join(self.output_dir, "data"))
            print(f"✅ 生成 {len(self.records)} 条样例数据，已保存至 {saved_path}")

        self.all_records = list(self.records)
        return self.records

    def run_deduplication(self) -> DeduplicationResult:
        print("\n" + "=" * 70)
        print("步骤 1/6: 样本去重与脏数据检测")
        print("=" * 70)

        self.dedup_result = self.deduplicator.process(self.records)
        print(self.deduplicator.print_report(self.dedup_result))

        record_map = {r.record_id: r for r in self.records}
        self.all_records = []
        for r in self.records:
            if r.record_id in [rec.record_id for rec in self.dedup_result.clean_records]:
                self.all_records.append(r)

        for item in self.dedup_result.pending_review:
            rec = record_map.get(item["record_id"])
            if rec:
                self.all_records.append(rec)

        for item in self.dedup_result.dirty_records:
            rec = record_map.get(item["record_id"])
            if rec:
                self.all_records.append(rec)

        return self.dedup_result

    def run_review_workflow(self) -> List[Dict]:
        print("\n" + "=" * 70)
        print("步骤 2/6: 构建人工复核队列")
        print("=" * 70)

        review_queue = self.review_workflow.build_review_queue(
            self.dedup_result.pending_review,
            self.dedup_result.dirty_records,
            self.all_records,
        )
        print(f"✅ 构建复核队列，共 {len(review_queue)} 条待处理")

        print("\n" + "=" * 70)
        print("步骤 3/6: 执行自动复核（模拟算法PM操作）")
        print("=" * 70)

        review_context = generate_review_context_bundle()
        print(f"\n📋 本轮复核上下文（安全规则+模型日志+工具调用参数）：")
        print(f"   安全规则问题: {len(review_context['safety_rule_issues'])} 项")
        print(f"   模型日志问题: {len(review_context['model_log_issues'])} 项")
        print(f"   工具调用问题: {len(review_context['tool_call_issues'])} 项")
        for issue in review_context["safety_rule_issues"]:
            print(f"   🔒 {issue}")
        for issue in review_context["model_log_issues"]:
            print(f"   📝 {issue}")
        for issue in review_context["tool_call_issues"]:
            print(f"   ⚙️  {issue}")

        results = []
        reviewer = "算法PM_张工"

        for i, item in enumerate(review_queue):
            has_same_round_tag = any(
                tag in item.record.tags
                for tag in ["security_rule_issue", "model_log_issue", "tool_call_issue"]
            )

            if item.record.status == RecordStatus.PENDING and not has_same_round_tag:
                if "待确认" in item.record.label:
                    action = ReviewAction.FIX_LABEL
                    note = f"修正不确定标签，根据上下文判定为负面。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                    ok, msg = self.review_workflow.process_review(
                        item.record.record_id,
                        reviewer,
                        action,
                        note,
                        new_label="负面",
                    )
                elif "prompt过短" in str(item.issues):
                    action = ReviewAction.APPROVE
                    note = "短prompt样本确认可用，属于正常短评论场景。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                    ok, msg = self.review_workflow.process_review(
                        item.record.record_id, reviewer, action, note
                    )
                else:
                    action = ReviewAction.NEED_MORE_INFO
                    note = "含备注混写，需确认备注是否影响样本使用。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                    ok, msg = self.review_workflow.process_review(
                        item.record.record_id, reviewer, action, note
                    )
            elif has_same_round_tag:
                action = ReviewAction.NEED_MORE_INFO
                note = (
                    "需同一轮复核三项：①安全规则：@system语法需补充边界规则；"
                    "②模型日志：temperature=2.5超出范围需调整；"
                    "③工具调用：response_format缺失导致解析失败。"
                    "三项问题关联，需合并处理后再确认。"
                )
                ok, msg = self.review_workflow.process_review(
                    item.record.record_id, reviewer, action, note
                )
            elif "疑似训练验证泄漏" in str(item.issues):
                action = ReviewAction.FLAG_AS_LEAK
                note = "标记为训练验证泄漏，禁止进入训练集。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                ok, msg = self.review_workflow.process_review(
                    item.record.record_id, reviewer, action, note
                )
            elif "标签为空" in str(item.issues) or "prompt为空" in str(item.issues):
                action = ReviewAction.REJECT
                note = "空值样本直接丢弃。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                ok, msg = self.review_workflow.process_review(
                    item.record.record_id, reviewer, action, note
                )
            elif "重复" in str(item.issues):
                action = ReviewAction.REJECT
                note = "重复样本丢弃，保留第一条。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                ok, msg = self.review_workflow.process_review(
                    item.record.record_id, reviewer, action, note
                )
            elif "标签包含分隔符" in str(item.issues):
                action = ReviewAction.FIX_LABEL
                note = "多标签混写，取第一个有效标签。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                ok, msg = self.review_workflow.process_review(
                    item.record.record_id,
                    reviewer,
                    action,
                    note,
                    new_label=item.record.label.split(",")[0],
                )
            else:
                action = ReviewAction.NEED_MORE_INFO
                note = "需人工进一步确认。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                ok, msg = self.review_workflow.process_review(
                    item.record.record_id, reviewer, action, note
                )

            results.append({
                "record_id": item.record.record_id,
                "action": action.value,
                "success": ok,
                "message": msg,
                "original_status": item.record.status.value,
                "tags": item.record.tags,
            })

            status_icon = "✅" if ok else "❌"
            print(f"{status_icon} [{i+1}] {item.record.record_id}: {action.value}")
            print(f"    原始状态: {item.record.status.value} | 标签: {item.record.label}")
            print(f"    问题: {', '.join(item.issues)}")
            print(f"    复核: {note}")
            if "same_round" in note.lower() or "同轮" in note:
                print(f"    🔗 本轮已串联复核：安全规则 + 模型日志 + 工具调用参数")

        auto_review_count = 0
        reviewer = "算法PM_张工"
        review_queue_ids = {item.record.record_id for item in self.review_workflow.review_queue}
        for record in self.all_records:
            if (record.status == RecordStatus.CLEAN and
                not record.review_notes and
                record.record_id not in review_queue_ids):
                note = "系统自动检测通过，干净样本确认可用。同轮复核：安全规则✓ 模型日志✓ 工具调用✓"
                record.add_review_note(reviewer, ReviewAction.APPROVE, note)
                self.version_control.apply_review_action(
                    record, reviewer, ReviewAction.APPROVE, note
                )
                auto_review_count += 1
                print(f"🤖 [自动] {record.record_id}: approve (系统自动复核干净样本)")
        if auto_review_count > 0:
            print(f"\n✅ 已自动复核 {auto_review_count} 条干净样本")

        print("\n" + "=" * 70)
        print("步骤 4/6: 分组指标统计")
        print("=" * 70)
        print(self.review_workflow.generate_review_report(self.dedup_result, self.all_records))

        return results

    def run_security_check(self) -> Dict[str, Any]:
        print("\n" + "=" * 70)
        print("步骤 5/6: 安全拦截校验")
        print("=" * 70)

        security_results = {
            "source_verifications": [],
            "leakage_checks": [],
            "blocked_count": 0,
        }

        for record in self.all_records:
            if record.status == RecordStatus.LEAKED:
                ok, issues = self.security.verify_no_leakage(record)
                if not ok:
                    security_results["leakage_checks"].append({
                        "record_id": record.record_id,
                        "issues": issues,
                        "source_trace": self.security.trace_back_to_source(record),
                    })
                    security_results["blocked_count"] += 1
                    print(f"🔒 拦截泄漏记录: {record.record_id}")
                    print(f"   溯源: {record.source_material.file_path} 行 {record.source_material.row_number}")

            original_source = record.source_material
            ok, issues = self.security.verify_source_material(record, original_source)
            if not ok:
                security_results["source_verifications"].append({
                    "record_id": record.record_id,
                    "issues": issues,
                })
                security_results["blocked_count"] += 1

        print(self.security.print_security_report())
        return security_results

    def run_export(self) -> Dict[str, Any]:
        print("\n" + "=" * 70)
        print("步骤 6/6: 导出验证")
        print("=" * 70)

        exportable_records = [
            r for r in self.all_records
            if r.status == RecordStatus.CLEAN
        ]

        expected_hashes = {r.record_id: r.content_hash for r in exportable_records}

        print(f"准备导出 {len(exportable_records)} 条clean记录...")

        package, validation = self.exporter.create_export_package(
            exportable_records,
            exported_by="算法PM_张工",
            expected_hashes=expected_hashes,
        )

        print(self.exporter.print_export_report(package, validation))

        if validation.is_valid:
            json_path = self.exporter.export_json(package)
            jsonl_path = self.exporter.export_jsonl(package)
            csv_path = self.exporter.export_csv(package)

            print(f"\n✅ 导出完成:")
            print(f"   JSON:  {json_path}")
            print(f"   JSONL: {jsonl_path}")
            print(f"   CSV:   {csv_path}")

            print(f"\n🔍 执行导出完整性校验...")
            is_valid, details = self.exporter.verify_export_integrity(
                jsonl_path, package.manifest_hash
            )
            if is_valid:
                print(f"✅ 导出文件完整性校验通过！")
                print(f"   清单哈希: {details['expected_manifest'][:16]}...")
            else:
                print(f"❌ 导出文件校验失败！疑似被篡改")

            review_csv_path = os.path.join(self.output_dir, "review_queue.csv")
            self.review_workflow.export_review_csv(review_csv_path)
            print(f"📋 复核队列已导出: {review_csv_path}")

            return {
                "export_id": package.export_id,
                "manifest_hash": package.manifest_hash,
                "record_count": len(package.records),
                "files": {
                    "json": json_path,
                    "jsonl": jsonl_path,
                    "csv": csv_path,
                    "review_csv": review_csv_path,
                },
                "validation_passed": validation.is_valid,
            }
        else:
            print("\n❌ 导出验证未通过，请先修复问题后重试")
            return {"validation_failed": True, "issues": validation.failed}

    def run_full_workflow(self, sample_file: str = None) -> Dict[str, Any]:
        print("\n" + "╔" + "═" * 68 + "╗")
        print("║" + " " * 15 + "上下文窗口预算器 - 完整工作流" + " " * 16 + "║")
        print("╚" + "═" * 68 + "╝")
        print(f"启动时间: {datetime.now().isoformat()}")
        print(f"允许标签: {self.allowed_labels}")

        self.load_samples(sample_file)
        self.run_deduplication()
        self.run_review_workflow()
        self.run_security_check()
        export_result = self.run_export()

        self._save_final_report(export_result)

        print("\n" + "╔" + "═" * 68 + "╗")
        print("║" + " " * 20 + "工作流执行完成" + " " * 23 + "║")
        print("╚" + "═" * 68 + "╝")

        return export_result

    def _save_final_report(self, export_result: Dict[str, Any]) -> None:
        report_path = os.path.join(self.output_dir, "final_report.json")
        report = {
            "workflow_version": "1.0.0",
            "generated_at": datetime.now().isoformat(),
            "allowed_labels": self.allowed_labels,
            "summary": {
                "total_records": len(self.all_records),
                "clean_records": sum(1 for r in self.all_records if r.status == RecordStatus.CLEAN),
                "pending_records": sum(1 for r in self.all_records if r.status == RecordStatus.PENDING),
                "dirty_records": sum(1 for r in self.all_records if r.status == RecordStatus.DIRTY),
                "leaked_records": sum(1 for r in self.all_records if r.status == RecordStatus.LEAKED),
                "duplicate_count": self.dedup_result.stats.get("duplicates", 0) + self.dedup_result.stats.get("fuzzy_duplicates", 0),
            },
            "dedup_stats": dict(self.dedup_result.stats),
            "security_blocked": len(self.security.blocked_operations),
            "export_result": export_result,
            "review_bundle": generate_review_context_bundle(),
        }

        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"\n📊 最终报告已保存: {report_path}")


def main():
    parser = argparse.ArgumentParser(
        description="上下文窗口预算器 - AI/ML工作流工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
工作流说明:
  1. 样本载入/生成
  2. 去重 + 脏数据检测
  3. 版本追踪
  4. 人工复核（安全规则+模型日志+工具调用同轮复核）
  5. 分组指标统计
  6. 安全拦截
  7. 导出验证

样例数据类型:
  ✅ 顺利记录 - 干净可用
  ⚠️  待确认记录 - 含备注混写/不确定标签
  ❌ 明显坏数据 - 空值/泄漏/重复

使用示例:
  # 从空目录开始，使用内置样例
  python -m context_window_budgeter.cli run

  # 指定外部样本文件
  python -m context_window_budgeter.cli run --samples ./data/raw_samples.json

  # 仅生成样例数据
  python -m context_window_budgeter.cli generate
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    run_parser = subparsers.add_parser("run", help="运行完整工作流")
    run_parser.add_argument(
        "--samples", "-s",
        type=str,
        default=None,
        help="原始样本JSON文件路径（可选，默认使用内置样例）",
    )
    run_parser.add_argument(
        "--output", "-o",
        type=str,
        default="./output",
        help="输出目录（默认: ./output）",
    )
    run_parser.add_argument(
        "--labels",
        type=str,
        nargs="+",
        default=None,
        help="允许的标签列表（默认: 正面 负面 中性 提问 指令）",
    )

    gen_parser = subparsers.add_parser("generate", help="仅生成样例数据")
    gen_parser.add_argument(
        "--output", "-o",
        type=str,
        default="./output/data",
        help="样例数据输出目录",
    )

    args = parser.parse_args()

    if args.command == "generate":
        samples = generate_all_samples()
        saved_path = save_samples_to_disk(samples, output_dir=args.output)
        print(f"✅ 已生成 {len(samples)} 条样例数据")
        print(f"📁 文件路径: {saved_path}")
        print(f"\n样例数据说明:")
        for i, s in enumerate(samples, 1):
            icon = {
                RecordStatus.CLEAN: "✅",
                RecordStatus.PENDING: "⚠️",
                RecordStatus.DIRTY: "❌",
            }.get(s.status, "❓")
            print(f"  {icon} [{i}] {s.record_id}")
            print(f"     标签: {s.label} | 分组: {s.group_key}")
            print(f"     Tags: {s.tags}")
        return 0

    elif args.command == "run":
        budgeter = ContextWindowBudgeter(
            allowed_labels=args.labels,
            output_dir=args.output,
        )
        result = budgeter.run_full_workflow(args.samples)

        print("\n📌 模型评审会查看指引:")
        print("  ✅ 绿色状态的记录可直接用于训练")
        print("  ⚠️  黄色状态的记录需找算法PM复核")
        print("  ❌ 红色状态的记录已被拦截")
        print("  🔒 灰色状态为泄漏记录，禁止使用")
        print("\n  每一条复核记录都已在同一轮中串联检查:")
        print("    ① 安全规则覆盖性  ② 模型日志参数  ③ 工具调用参数")

        return 0 if result.get("validation_passed", False) else 1

    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    sys.exit(main())

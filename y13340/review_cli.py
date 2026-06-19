#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
import json
import traceback
from datetime import datetime
from pathlib import Path

from data_models import (
    VersionNote,
    ScheduleRecommendation,
    ManualCorrection,
    ReviewStatus,
    CorrectionType,
)
from review_engine import ScheduleReviewEngine


class ReviewCLI:
    EXIT_SUCCESS = 0
    EXIT_ERROR = 1
    EXIT_SUSPENDED = 2
    EXIT_EVIDENCE_MISSING = 3
    EXIT_MANUAL_REVIEW_NEEDED = 4

    def __init__(self, data_dir: str = "review_data"):
        self.engine = ScheduleReviewEngine(data_dir=data_dir)

    def _print_error(self, message: str, error_code: int = EXIT_ERROR):
        error_output = {
            "status": "error",
            "error_code": error_code,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }
        print(json.dumps(error_output, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(error_code)

    def _print_result(self, data: dict, status: str = "success"):
        output = {
            "status": status,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
        sys.exit(self.EXIT_SUCCESS)

    def cmd_add_version(self, args):
        try:
            vn = VersionNote(
                version_id=args.version_id,
                publish_date=args.publish_date,
                title=args.title,
                description=args.description,
                related_rules=args.related_rules.split(",") if args.related_rules else [],
                affected_scenarios=args.affected_scenarios.split(",") if args.affected_scenarios else [],
                evidence_reference=args.evidence_reference,
                operator=args.operator,
            )
            vid = self.engine.add_version_note(vn)
            self._print_result({"version_id": vid, "action": "added"})
        except Exception as e:
            self._print_error(f"添加版本说明失败: {str(e)}", self.EXIT_ERROR)

    def cmd_add_recommendation(self, args):
        try:
            features = {}
            if args.evidence_features:
                for feat in args.evidence_features.split(","):
                    if "=" in feat:
                        k, v = feat.split("=", 1)
                        features[k.strip()] = v.strip()

            rec = ScheduleRecommendation(
                recommendation_id=args.recommendation_id,
                schedule_date=args.schedule_date,
                nurse_id=args.nurse_id,
                nurse_name=args.nurse_name,
                shift_type=args.shift_type,
                original_recommendation=args.original_recommendation,
                model_version=args.model_version,
                confidence_score=float(args.confidence_score),
                evidence_features=features,
                rule_matches=args.rule_matches.split(",") if args.rule_matches else [],
            )
            rid = self.engine.add_recommendation(rec)
            self._print_result({"recommendation_id": rid, "action": "added"})
        except Exception as e:
            self._print_error(f"添加推荐记录失败: {str(e)}", self.EXIT_ERROR)

    def cmd_add_correction(self, args):
        try:
            ct = CorrectionType(args.correction_type)
            mc = ManualCorrection(
                correction_id=args.correction_id,
                recommendation_id=args.recommendation_id,
                original_result=args.original_result,
                corrected_result=args.corrected_result,
                correction_type=ct,
                reason=args.reason,
                evidence_reference=args.evidence_reference,
                related_version_id=args.related_version_id,
                operator=args.operator,
            )
            cid = self.engine.add_manual_correction(mc)
            self._print_result({"correction_id": cid, "action": "added"})
        except ValueError as e:
            self._print_error(str(e), self.EXIT_ERROR)
        except Exception as e:
            self._print_error(f"添加改判记录失败: {str(e)}", self.EXIT_ERROR)

    def cmd_process_review(self, args):
        try:
            review = self.engine.process_review(
                recommendation_id=args.recommendation_id,
                operator=args.operator,
                old_model_version=args.old_model_version,
                new_model_version=args.new_model_version,
            )

            result = {
                "review_id": review.review_id,
                "recommendation_id": review.recommendation_id,
                "status": review.status.value,
                "status_code": review.status.name,
                "missing_references": review.missing_references,
                "review_notes": review.review_notes,
                "resolution": review.resolution,
                "evidence_chain_count": len(review.evidence_chain),
            }

            if review.status == ReviewStatus.SUSPENDED:
                self._print_result(result, status="suspended")
                sys.exit(self.EXIT_SUSPENDED)
            elif review.status == ReviewStatus.EVIDENCE_MISSING:
                self._print_result(result, status="evidence_missing")
                sys.exit(self.EXIT_EVIDENCE_MISSING)
            elif review.status == ReviewStatus.MANUAL_REVIEW:
                self._print_result(result, status="manual_review_needed")
                sys.exit(self.EXIT_MANUAL_REVIEW_NEEDED)
            else:
                self._print_result(result, status="resolved")

        except ValueError as e:
            self._print_error(str(e), self.EXIT_ERROR)
        except Exception as e:
            self._print_error(f"处理复核失败: {str(e)}\n{traceback.format_exc()}", self.EXIT_ERROR)

    def cmd_resolve_suspended(self, args):
        try:
            review = self.engine.resolve_suspended(
                review_id=args.review_id,
                resolution=args.resolution,
                operator=args.operator,
            )
            result = {
                "review_id": review.review_id,
                "status": review.status.value,
                "review_notes": review.review_notes,
            }
            self._print_result(result)
        except ValueError as e:
            self._print_error(str(e), self.EXIT_ERROR)
        except Exception as e:
            self._print_error(f"处理挂起记录失败: {str(e)}", self.EXIT_ERROR)

    def cmd_confirm_manual(self, args):
        try:
            review = self.engine.confirm_manual_review(
                review_id=args.review_id,
                confirmed=(args.decision == "confirm"),
                comment=args.comment,
                operator=args.operator,
            )
            result = {
                "review_id": review.review_id,
                "status": review.status.value,
                "review_notes": review.review_notes,
            }
            self._print_result(result)
        except ValueError as e:
            self._print_error(str(e), self.EXIT_ERROR)
        except Exception as e:
            self._print_error(f"确认人工改判失败: {str(e)}", self.EXIT_ERROR)

    def cmd_summary(self, args):
        try:
            summary = self.engine.get_summary()
            result = {
                "total_count": summary.total_count,
                "resolved_count": summary.resolved_count,
                "evidence_missing_count": summary.evidence_missing_count,
                "suspended_count": summary.suspended_count,
                "pending_count": summary.pending_count,
                "manual_judgment_count": summary.manual_judgment_count,
                "override_count": summary.override_count,
            }
            self._print_result(result)
        except Exception as e:
            self._print_error(f"获取汇总失败: {str(e)}", self.EXIT_ERROR)

    def cmd_export_csv(self, args):
        try:
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            review_csv = output_dir / args.review_csv_name
            version_csv = output_dir / args.version_csv_name

            self.engine.export_review_csv(str(review_csv))
            self.engine.export_version_trace_csv(str(version_csv))

            result = {
                "review_csv": str(review_csv),
                "version_csv": str(version_csv),
                "records_exported": len(self.engine.review_records),
                "versions_exported": len(self.engine.version_notes),
            }
            self._print_result(result)
        except Exception as e:
            self._print_error(f"导出CSV失败: {str(e)}\n{traceback.format_exc()}", self.EXIT_ERROR)

    def cmd_list_pending(self, args):
        try:
            pending = self.engine.get_pending_items()
            items = []
            for rr in pending:
                rec = self.engine.recommendations.get(rr.recommendation_id)
                nurse_name = rec.nurse_name if rec else "未知"
                items.append({
                    "review_id": rr.review_id,
                    "recommendation_id": rr.recommendation_id,
                    "nurse_name": nurse_name,
                    "status": rr.status.value,
                    "missing_references": rr.missing_references,
                    "review_notes": rr.review_notes,
                })
            result = {
                "count": len(items),
                "items": items,
            }
            self._print_result(result)
        except Exception as e:
            self._print_error(f"获取待处理列表失败: {str(e)}", self.EXIT_ERROR)

    def cmd_list_resolved(self, args):
        try:
            resolved = self.engine.get_resolved_items()
            items = []
            for rr in resolved:
                rec = self.engine.recommendations.get(rr.recommendation_id)
                nurse_name = rec.nurse_name if rec else "未知"
                items.append({
                    "review_id": rr.review_id,
                    "recommendation_id": rr.recommendation_id,
                    "nurse_name": nurse_name,
                    "status": rr.status.value,
                    "review_notes": rr.review_notes,
                    "resolution": rr.resolution,
                })
            result = {
                "count": len(items),
                "items": items,
            }
            self._print_result(result)
        except Exception as e:
            self._print_error(f"获取已处理列表失败: {str(e)}", self.EXIT_ERROR)

    def cmd_get_review(self, args):
        try:
            review = None
            for rr in self.engine.review_records.values():
                if rr.review_id == args.review_id or rr.recommendation_id == args.review_id:
                    review = rr
                    break

            if not review:
                self._print_error(f"未找到复核记录: {args.review_id}", self.EXIT_ERROR)

            result = {
                "review_id": review.review_id,
                "recommendation_id": review.recommendation_id,
                "version_id": review.version_id,
                "correction_id": review.correction_id,
                "status": review.status.value,
                "evidence_chain": review.evidence_chain,
                "missing_references": review.missing_references,
                "review_notes": review.review_notes,
                "resolution": review.resolution,
                "reviewed_by": review.reviewed_by,
                "reviewed_at": review.reviewed_at,
                "created_at": review.created_at,
            }
            self._print_result(result)
        except Exception as e:
            self._print_error(f"获取复核详情失败: {str(e)}", self.EXIT_ERROR)

    def run(self):
        parser = argparse.ArgumentParser(
            description="排班推荐证据复核系统 - CLI接口",
            formatter_class=argparse.RawDescriptionHelpFormatter,
        )

        parser.add_argument("--data-dir", default="review_data", help="数据目录路径")

        subparsers = parser.add_subparsers(dest="command", required=True)

        p = subparsers.add_parser("add-version", help="添加版本说明")
        p.add_argument("--version-id", required=True, help="版本ID")
        p.add_argument("--publish-date", required=True, help="发布日期 YYYY-MM-DD")
        p.add_argument("--title", required=True, help="版本标题")
        p.add_argument("--description", required=True, help="版本描述")
        p.add_argument("--related-rules", help="关联规则，逗号分隔")
        p.add_argument("--affected-scenarios", help="影响场景，逗号分隔")
        p.add_argument("--evidence-reference", help="证据引用")
        p.add_argument("--operator", default="system", help="操作人")

        p = subparsers.add_parser("add-recommendation", help="添加排班推荐记录")
        p.add_argument("--recommendation-id", required=True, help="推荐ID")
        p.add_argument("--schedule-date", required=True, help="排班日期 YYYY-MM-DD")
        p.add_argument("--nurse-id", required=True, help="护士ID")
        p.add_argument("--nurse-name", required=True, help="护士姓名")
        p.add_argument("--shift-type", required=True, help="班次类型")
        p.add_argument("--original-recommendation", required=True, help="原始推荐结果")
        p.add_argument("--model-version", required=True, help="模型版本")
        p.add_argument("--confidence-score", required=True, help="置信度分数")
        p.add_argument("--evidence-features", help="证据特征，k=v,k=v格式")
        p.add_argument("--rule-matches", help="匹配规则，逗号分隔")

        p = subparsers.add_parser("add-correction", help="添加人工改判记录")
        p.add_argument("--correction-id", required=True, help="改判ID")
        p.add_argument("--recommendation-id", required=True, help="推荐ID")
        p.add_argument("--original-result", required=True, help="原始结果")
        p.add_argument("--corrected-result", required=True, help="改判结果")
        p.add_argument("--correction-type", required=True,
                       choices=[e.value for e in CorrectionType], help="改判类型")
        p.add_argument("--reason", required=True, help="改判原因")
        p.add_argument("--evidence-reference", help="证据引用")
        p.add_argument("--related-version-id", help="关联版本ID")
        p.add_argument("--operator", default="system", help="操作人")

        p = subparsers.add_parser("process-review", help="处理复核")
        p.add_argument("--recommendation-id", required=True, help="推荐ID")
        p.add_argument("--operator", default="system", help="操作人")
        p.add_argument("--old-model-version", help="旧模型版本（用于解释改判）")
        p.add_argument("--new-model-version", help="新模型版本（用于解释改判）")

        p = subparsers.add_parser("resolve-suspended", help="处理挂起记录")
        p.add_argument("--review-id", required=True, help="复核ID")
        p.add_argument("--resolution", required=True, help="处理说明")
        p.add_argument("--operator", required=True, help="操作人")

        p = subparsers.add_parser("confirm-manual", help="确认人工改判")
        p.add_argument("--review-id", required=True, help="复核ID")
        p.add_argument("--decision", required=True, choices=["confirm", "reject"], help="确认或拒绝")
        p.add_argument("--comment", required=True, help="意见说明")
        p.add_argument("--operator", required=True, help="操作人")

        p = subparsers.add_parser("summary", help="获取复核汇总")

        p = subparsers.add_parser("export-csv", help="导出CSV明细")
        p.add_argument("--output-dir", default="output", help="输出目录")
        p.add_argument("--review-csv-name", default="review_records.csv", help="复核记录CSV文件名")
        p.add_argument("--version-csv-name", default="version_trace.csv", help="版本追溯CSV文件名")

        p = subparsers.add_parser("list-pending", help="列出待处理项")

        p = subparsers.add_parser("list-resolved", help="列出已处理项")

        p = subparsers.add_parser("get-review", help="获取复核详情")
        p.add_argument("--review-id", required=True, help="复核ID或推荐ID")

        args = parser.parse_args()

        if args.data_dir:
            self.engine = ScheduleReviewEngine(data_dir=args.data_dir)

        command_handlers = {
            "add-version": self.cmd_add_version,
            "add-recommendation": self.cmd_add_recommendation,
            "add-correction": self.cmd_add_correction,
            "process-review": self.cmd_process_review,
            "resolve-suspended": self.cmd_resolve_suspended,
            "confirm-manual": self.cmd_confirm_manual,
            "summary": self.cmd_summary,
            "export-csv": self.cmd_export_csv,
            "list-pending": self.cmd_list_pending,
            "list-resolved": self.cmd_list_resolved,
            "get-review": self.cmd_get_review,
        }

        handler = command_handlers.get(args.command)
        if handler:
            handler(args)
        else:
            self._print_error(f"未知命令: {args.command}", self.EXIT_ERROR)


if __name__ == "__main__":
    cli = ReviewCLI()
    cli.run()

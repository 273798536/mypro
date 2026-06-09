import json
from typing import List, Dict, Any
from collections import defaultdict
from .models import JudgmentStatus
from .db import Database


class ReportGenerator:
    def __init__(self, db: Database):
        self.db = db

    def generate_executive_summary(self) -> Dict[str, Any]:
        all_calcs = self.db.get_calculations()
        edge_cases = self.db.list_edge_cases()
        batches = self.db.list_batches()

        by_qid: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for c in all_calcs:
            by_qid[c["question_id"]].append(c)

        judgment_counts: Dict[str, int] = defaultdict(int)
        edge_counts: Dict[str, int] = defaultdict(int)
        edge_with_source: List[Dict[str, Any]] = []

        for c in edge_cases:
            edge_counts[c.get("edge_type") or "unknown"] += 1
            stuck_materials = []
            if c.get("edge_type") == "division_by_zero":
                stuck_materials.append(c.get("source_material") or "未知来源")
            edge_with_source.append({
                "calculation_id": c["id"],
                "question_id": c["question_id"],
                "parameter_name": c["parameter_name"],
                "edge_type": c.get("edge_type"),
                "edge_detail": c.get("edge_detail"),
                "stuck_materials": stuck_materials or [c.get("source_material") or "未知"],
                "source_file": c.get("source_file"),
                "batch_source": c.get("batch_source"),
            })

        for qid, params in by_qid.items():
            final = self._final_judgment(params)
            judgment_counts[final.value] += 1

        total_questions = len(by_qid)
        missing_student_mistakes = 0
        for qid, params in by_qid.items():
            for p in params:
                if (p["parameter_name"] == "correct_rate"
                        and p.get("edge_type") == "missing_data"):
                    missing_student_mistakes += 1
                    break

        return {
            "summary": {
                "total_questions": total_questions,
                "total_calculations": len(all_calcs),
                "total_edge_cases": len(edge_cases),
                "judgment_distribution": dict(judgment_counts),
                "edge_case_breakdown": dict(edge_counts),
                "missing_student_mistakes_count": missing_student_mistakes,
                "total_import_batches": len(batches),
            },
            "edge_cases_with_trace": edge_with_source,
            "import_batches": [
                {
                    "batch_id": b["batch_id"],
                    "source": b["source"],
                    "file_name": b["file_name"],
                    "total": b["total_records"],
                    "success": b["success_count"],
                    "skipped": b["skipped_count"],
                    "errors": b["error_count"],
                    "skipped_details": json.loads(b["skipped_details"]) if b.get("skipped_details") else [],
                }
                for b in batches
            ],
        }

    def generate_question_report(self, question_id: str) -> Dict[str, Any]:
        trace = self.db.get_formula_trace(question_id)
        questions = self.db.get_questions(question_id=question_id)

        params = [t for t in trace if t.get("parameter_name")]
        by_param: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for t in params:
            by_param[t["parameter_name"]].append(t)

        formula_diffs = []
        for pname, records in by_param.items():
            latest = records[0]
            formula_diffs.append({
                "parameter": pname,
                "formula_before": latest.get("formula_before"),
                "formula_after": latest.get("formula_after"),
                "raw_value": latest.get("raw_value"),
                "adjusted_value": latest.get("adjusted_value"),
                "judgment_before": latest.get("judgment_before"),
                "judgment_after": latest.get("judgment_after"),
                "explanation_before": latest.get("explanation_before"),
                "explanation_after": latest.get("explanation_after"),
                "is_edge_case": bool(latest.get("is_edge_case")),
                "edge_type": latest.get("edge_type"),
                "edge_detail": latest.get("edge_detail"),
                "source_material": latest.get("source_material"),
                "review_action": latest.get("review_action"),
                "reviewer_note": latest.get("reviewer_note"),
            })

        final = self._final_judgment(params) if params else JudgmentStatus.PENDING

        return {
            "question_id": question_id,
            "final_judgment": final.value,
            "sources": [
                {
                    "source": q["source"],
                    "import_batch_id": q.get("import_batch_id"),
                    "fields_present": {
                        k: q.get(k) for k in (
                            "difficulty", "discrimination", "guess_rate",
                            "correct_count", "total_count", "mistake_count",
                            "answer_text",
                        ) if q.get(k) is not None
                    },
                }
                for q in questions
            ],
            "formula_diffs": formula_diffs,
            "review_history": [
                t for t in trace if t.get("review_action")
            ],
        }

    def generate_text_report(self) -> str:
        exec_sum = self.generate_executive_summary()
        s = exec_sum["summary"]
        lines = []
        lines.append("=" * 70)
        lines.append("多目标调参解释器 · 投委会报告")
        lines.append("=" * 70)
        lines.append("")
        lines.append("【一、总体概览】")
        lines.append(f"  题目总数：{s['total_questions']}")
        lines.append(f"  计算记录：{s['total_calculations']} 条")
        lines.append(f"  边界/异常记录：{s['total_edge_cases']} 条")
        lines.append(f"  缺少学生错题数据的题目：{s['missing_student_mistakes_count']} 题")
        lines.append("")
        lines.append("  最终判断分布：")
        for j, c in s["judgment_distribution"].items():
            lines.append(f"    - {j}: {c} 题")
        lines.append("")
        lines.append("  边界问题分类：")
        for et, c in s["edge_case_breakdown"].items():
            label = {
                "division_by_zero": "除零边界",
                "extrapolation_out_of_bounds": "外推越界",
                "missing_data": "数据缺失",
            }.get(et, et)
            lines.append(f"    - {label} ({et}): {c} 条")
        lines.append("")
        lines.append("【二、边界异常与材料来源追溯】")
        if not exec_sum["edge_cases_with_trace"]:
            lines.append("  （无）")
        else:
            for idx, ec in enumerate(exec_sum["edge_cases_with_trace"], 1):
                et_label = {
                    "division_by_zero": "除零边界",
                    "extrapolation_out_of_bounds": "外推越界",
                    "missing_data": "数据缺失",
                }.get(ec["edge_type"], ec["edge_type"] or "unknown")
                lines.append(f"  {idx}. 题目 {ec['question_id']} · 参数 {ec['parameter_name']}")
                lines.append(f"     异常类型：{et_label}")
                lines.append(f"     详情：{ec.get('edge_detail') or 'N/A'}")
                lines.append(f"     卡住的材料来源：{'; '.join(ec['stuck_materials'])}")
                if ec.get("source_file"):
                    lines.append(f"     原始导入文件：{ec['source_file']} (批次类型: {ec.get('batch_source')})")
                lines.append("")
        lines.append("【三、导入批次与错题缺口】")
        for b in exec_sum["import_batches"]:
            lines.append(f"  - 批次 {b['batch_id']} ({b['source']}, 文件: {b['file_name']})")
            lines.append(f"      总数 {b['total']} · 成功 {b['success']} · 跳过 {b['skipped']} · 错误 {b['errors']}")
            if b["skipped_details"]:
                lines.append(f"      跳过详情（教研编辑待补齐）：")
                for d in b["skipped_details"][:5]:
                    lines.append(f"        * 行 {d.get('index')} / 题 {d.get('question_id')}: {d.get('reason')}")
                if len(b["skipped_details"]) > 5:
                    lines.append(f"        * ...另有 {len(b['skipped_details']) - 5} 条")
        lines.append("")
        lines.append("=" * 70)
        lines.append("  提示：可在终端执行 `mpi review` 进入复核入口，无需重新导入数据。")
        lines.append("=" * 70)
        return "\n".join(lines)

    def _final_judgment(self, records: List[Dict[str, Any]]) -> JudgmentStatus:
        if not records:
            return JudgmentStatus.PENDING
        worst = JudgmentStatus.PENDING
        priority = [
            JudgmentStatus.REJECTED,
            JudgmentStatus.EDGE_CASE,
            JudgmentStatus.NEEDS_REVIEW,
            JudgmentStatus.PENDING,
            JudgmentStatus.ACCEPTED,
        ]
        for c in records:
            j = JudgmentStatus(c["judgment_after"])
            if priority.index(j) < priority.index(worst):
                worst = j
        return worst

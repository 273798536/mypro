from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from sqlalchemy.orm import Session
from var_backtest.models import (
    QuestionList, Question, VarResult, BacktestRun, ImpactNotification
)


@dataclass
class QuestionDiff:
    question_external_id: str
    diff_type: str
    field: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    impact_description: str
    needs_rerun: bool


@dataclass
class QuestionListDiffReport:
    old_batch_id: str
    new_batch_id: str
    added_questions: List[str]
    removed_questions: List[str]
    modified_questions: List[QuestionDiff]
    impacted_results: List[Dict]


class QuestionListDiffDetector:
    def __init__(self, db: Session):
        self.db = db

    def detect_and_report(
        self, new_question_list: QuestionList, auto_notify: bool = True
    ) -> QuestionListDiffReport:
        old_list = (
            self.db.query(QuestionList)
            .filter(QuestionList.id != new_question_list.id)
            .order_by(QuestionList.received_at.desc())
            .first()
        )

        if old_list is None:
            return QuestionListDiffReport(
                old_batch_id="",
                new_batch_id=new_question_list.batch_id,
                added_questions=[q.question_id for q in new_question_list.questions],
                removed_questions=[],
                modified_questions=[],
                impacted_results=[],
            )

        return self._compare(old_list, new_question_list, auto_notify)

    def _compare(
        self, old_list: QuestionList, new_list: QuestionList, auto_notify: bool
    ) -> QuestionListDiffReport:
        old_qmap = {q.question_id: q for q in old_list.questions}
        new_qmap = {q.question_id: q for q in new_list.questions}

        old_ids = set(old_qmap.keys())
        new_ids = set(new_qmap.keys())

        added = sorted(new_ids - old_ids)
        removed = sorted(old_ids - new_ids)
        common = old_ids & new_ids

        modified: List[QuestionDiff] = []
        for qid in common:
            old_q = old_qmap[qid]
            new_q = new_qmap[qid]
            modified.extend(self._compare_question(qid, old_q, new_q))

        impacted = self._find_impacted_results(old_list, added, removed, modified)

        if auto_notify:
            self._persist_impact_notifications(old_list, new_list, added, removed, modified, impacted)

        return QuestionListDiffReport(
            old_batch_id=old_list.batch_id,
            new_batch_id=new_list.batch_id,
            added_questions=added,
            removed_questions=removed,
            modified_questions=modified,
            impacted_results=impacted,
        )

    def _compare_question(self, qid: str, old_q: Question, new_q: Question) -> List[QuestionDiff]:
        diffs: List[QuestionDiff] = []
        field_specs = [
            ("quantile", float, "分位数"),
            ("var_level", float, "置信水平"),
            ("window", int, "回测窗口"),
            ("title", str, "题目名称"),
            ("content", str, "题目内容"),
        ]
        for attr, _type, label in field_specs:
            old_val = getattr(old_q, attr)
            new_val = getattr(new_q, attr)
            if old_val != new_val:
                if attr in ("quantile", "var_level", "window"):
                    impact = f"题目 {qid} 的{label}由 {old_val} 变更为 {new_val}，之前的回测结论可能失效，建议重跑。"
                    needs_rerun = True
                else:
                    impact = f"题目 {qid} 的{label}已更新：'{old_val}' → '{new_val}'。"
                    needs_rerun = False
                diffs.append(QuestionDiff(
                    question_external_id=qid,
                    diff_type="modified",
                    field=attr,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val) if new_val is not None else None,
                    impact_description=impact,
                    needs_rerun=needs_rerun,
                ))

        old_params = old_q.params or {}
        new_params = new_q.params or {}
        all_keys = set(old_params.keys()) | set(new_params.keys())
        for key in sorted(all_keys):
            if old_params.get(key) != new_params.get(key):
                diffs.append(QuestionDiff(
                    question_external_id=qid,
                    diff_type="modified",
                    field=f"params.{key}",
                    old_value=str(old_params.get(key)),
                    new_value=str(new_params.get(key)),
                    impact_description=f"题目 {qid} 的参数 {key} 由 {old_params.get(key)} 变更为 {new_params.get(key)}。",
                    needs_rerun=True,
                ))
        return diffs

    def _find_impacted_results(
        self,
        old_list: QuestionList,
        added: List[str],
        removed: List[str],
        modified: List[QuestionDiff],
    ) -> List[Dict]:
        impacted = []

        latest_run = (
            self.db.query(BacktestRun)
            .filter_by(question_list_id=old_list.id)
            .order_by(BacktestRun.started_at.desc())
            .first()
        )
        if latest_run is None:
            return impacted

        modified_ids = {d.question_external_id for d in modified if d.needs_rerun}

        for result in latest_run.results:
            qid = result.question_external_id
            if qid in modified_ids:
                impacted.append({
                    "question_external_id": qid,
                    "old_var_value": result.var_value,
                    "old_answer_match": result.answer_match,
                    "old_chart_path": result.chart_path,
                    "reason": "题目参数变更",
                })
            elif qid in removed:
                impacted.append({
                    "question_external_id": qid,
                    "old_var_value": result.var_value,
                    "old_answer_match": result.answer_match,
                    "old_chart_path": result.chart_path,
                    "reason": "题目已从清单中移除",
                })

        return impacted

    def _persist_impact_notifications(
        self,
        old_list: QuestionList,
        new_list: QuestionList,
        added: List[str],
        removed: List[str],
        modified: List[QuestionDiff],
        impacted: List[Dict],
    ):
        for qid in added:
            self.db.add(ImpactNotification(
                old_question_list_id=old_list.id,
                new_question_list_id=new_list.id,
                question_external_id=qid,
                impact_type="added",
                description=f"新增题目 {qid}，之前无对应结果，需要执行回测。",
                old_result_summary=None,
                needs_rerun=True,
            ))

        for qid in removed:
            summary = next((i for i in impacted if i["question_external_id"] == qid), None)
            self.db.add(ImpactNotification(
                old_question_list_id=old_list.id,
                new_question_list_id=new_list.id,
                question_external_id=qid,
                impact_type="removed",
                description=f"题目 {qid} 已从新清单移除，之前的结果不再使用。",
                old_result_summary=summary,
                needs_rerun=False,
            ))

        for diff in modified:
            summary = next(
                (i for i in impacted if i["question_external_id"] == diff.question_external_id),
                None,
            )
            self.db.add(ImpactNotification(
                old_question_list_id=old_list.id,
                new_question_list_id=new_list.id,
                question_external_id=diff.question_external_id,
                impact_type="modified",
                description=diff.impact_description,
                old_result_summary=summary,
                needs_rerun=diff.needs_rerun,
            ))
        self.db.commit()

    def summarize_impact(self, report: QuestionListDiffReport) -> Dict:
        total_changes = len(report.added_questions) + len(report.removed_questions) + len(report.modified_questions)
        needs_rerun_count = (
            len(report.added_questions)
            + sum(1 for d in report.modified_questions if d.needs_rerun)
        )
        return {
            "old_batch_id": report.old_batch_id,
            "new_batch_id": report.new_batch_id,
            "total_changes": total_changes,
            "added_count": len(report.added_questions),
            "removed_count": len(report.removed_questions),
            "modified_count": len(report.modified_questions),
            "needs_rerun_count": needs_rerun_count,
            "impacted_result_count": len(report.impacted_results),
            "impacted_results": report.impacted_results,
            "details": {
                "added": report.added_questions,
                "removed": report.removed_questions,
                "modified": [
                    {
                        "question_external_id": d.question_external_id,
                        "field": d.field,
                        "old_value": d.old_value,
                        "new_value": d.new_value,
                        "impact": d.impact_description,
                        "needs_rerun": d.needs_rerun,
                    }
                    for d in report.modified_questions
                ],
            },
        }

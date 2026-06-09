from typing import List, Optional, Dict, Any
from datetime import datetime
from .models import ProcessingRecord, StudentAnswer, Issue, IssueType, RecordStatus
from .calibrator import IRTCalibrator, trace_item_chain


class Reviewer:
    def __init__(self, record: ProcessingRecord):
        self.record = record

    def list_issues(self, unresolved_only: bool = True) -> List[Issue]:
        if unresolved_only:
            return [i for i in self.record.issues if not i.resolved]
        return list(self.record.issues)

    def show_issue(self, issue_id: str) -> Optional[Dict[str, Any]]:
        issue = next((i for i in self.record.issues if i.issue_id == issue_id), None)
        if not issue:
            return None
        result = {
            "issue": {
                "id": issue.issue_id,
                "type": issue.issue_type.value,
                "severity": issue.severity,
                "description": issue.description,
                "suggestion": issue.suggestion,
                "reviewed": issue.reviewed,
                "resolved": issue.resolved,
                "review_note": issue.review_note,
            },
            "related_answers": [],
            "trace": None
        }

        for a in self.record.student_answers:
            if (issue.related_student_id and a.student_id == issue.related_student_id) or \
               (issue.related_item_id and a.item_id == issue.related_item_id):
                result["related_answers"].append({
                    "student_id": a.student_id,
                    "item_id": a.item_id,
                    "is_correct": a.is_correct,
                    "source": a.source
                })

        if issue.related_item_id:
            result["trace"] = trace_item_chain(self.record, issue.related_item_id)

        return result

    def fix_answer(self, student_id: str, item_id: str, is_correct: int, reviewer: str = "风控分析师") -> bool:
        found = False
        for a in self.record.student_answers:
            if a.student_id == student_id and a.item_id == item_id:
                old_val = a.is_correct
                a.is_correct = 1 if is_correct >= 1 else 0
                a.source = f"复核修正(原:{old_val})"
                found = True

        if not found:
            new_ans = StudentAnswer(
                student_id=student_id,
                item_id=item_id,
                is_correct=1 if is_correct >= 1 else 0,
                source=f"复核补录-{reviewer}"
            )
            self.record.student_answers.append(new_ans)

        self.record.review_notes.append({
            "time": datetime.now().isoformat(),
            "reviewer": reviewer,
            "action": "fix_answer",
            "student_id": student_id,
            "item_id": item_id,
            "new_value": is_correct,
            "note": f"修正/补录学生{student_id}题目{item_id}答案为{'对' if is_correct >= 1 else '错'}"
        })

        for issue in self.record.issues:
            if issue.related_student_id == student_id and issue.related_item_id == item_id \
               and issue.issue_type == IssueType.MISSING_HISTORY:
                issue.resolved = True
                issue.reviewed = True
                issue.review_note = f"已由{reviewer}补录答案"

        return True

    def mark_issue_resolved(self, issue_id: str, review_note: str, reviewer: str = "风控分析师") -> bool:
        issue = next((i for i in self.record.issues if i.issue_id == issue_id), None)
        if not issue:
            return False
        issue.reviewed = True
        issue.resolved = True
        issue.review_note = review_note
        self.record.review_notes.append({
            "time": datetime.now().isoformat(),
            "reviewer": reviewer,
            "action": "resolve_issue",
            "issue_id": issue_id,
            "note": review_note
        })
        return True

    def exclude_item(self, item_id: str, reason: str, reviewer: str = "风控分析师") -> bool:
        if item_id not in self.record.items:
            return False
        self.record.student_answers = [
            a for a in self.record.student_answers if a.item_id != item_id
        ]
        item = self.record.items.pop(item_id, None)
        self.record.review_notes.append({
            "time": datetime.now().isoformat(),
            "reviewer": reviewer,
            "action": "exclude_item",
            "item_id": item_id,
            "item_name": item.item_name if item else "",
            "reason": reason,
            "note": f"排除题目{item_id}: {reason}"
        })

        for issue in self.record.issues:
            if issue.related_item_id == item_id:
                issue.resolved = True
                issue.reviewed = True
                issue.review_note = f"题目已排除: {reason}"
        return True

    def exclude_student(self, student_id: str, reason: str, reviewer: str = "风控分析师") -> bool:
        if student_id not in self.record.students:
            return False
        self.record.student_answers = [
            a for a in self.record.student_answers if a.student_id != student_id
        ]
        self.record.students.pop(student_id, None)
        self.record.review_notes.append({
            "time": datetime.now().isoformat(),
            "reviewer": reviewer,
            "action": "exclude_student",
            "student_id": student_id,
            "reason": reason,
            "note": f"排除学生{student_id}: {reason}"
        })

        for issue in self.record.issues:
            if issue.related_student_id == student_id:
                issue.resolved = True
                issue.reviewed = True
                issue.review_note = f"学生已排除: {reason}"
        return True

    def re_calibrate(self) -> ProcessingRecord:
        preserved_state = {}
        for iss in self.record.issues:
            key = (iss.issue_type, iss.related_student_id, iss.related_item_id, iss.description[:30])
            preserved_state[key] = {
                "resolved": iss.resolved,
                "reviewed": iss.reviewed,
                "review_note": iss.review_note,
                "issue_id": iss.issue_id,
            }

        self.record.constraint_checks = []
        self.record.error_analysis = []
        self.record.issues = []
        self.record.valid_answer_count = sum(1 for a in self.record.student_answers if a.is_correct is not None)

        for it in self.record.items.values():
            it.response_count = sum(1 for a in self.record.student_answers
                                    if a.item_id == it.item_id and a.is_correct is not None)
            if it.response_count > 0:
                correct = sum(1 for a in self.record.student_answers
                              if a.item_id == it.item_id and a.is_correct == 1)
                it.correct_rate = correct / it.response_count
            else:
                it.correct_rate = None

        for sid, stu in self.record.students.items():
            stu.answered_count = sum(1 for a in self.record.student_answers if a.student_id == sid)
            stu.valid_answers = sum(1 for a in self.record.student_answers
                                    if a.student_id == sid and a.is_correct is not None)

        self.record.review_notes.append({
            "time": datetime.now().isoformat(),
            "action": "re_calibrate",
            "note": "复核后重新执行IRT校准"
        })

        calibrator = IRTCalibrator(self.record)
        result = calibrator.run()

        for iss in result.issues:
            key = (iss.issue_type, iss.related_student_id, iss.related_item_id, iss.description[:30])
            if key in preserved_state:
                saved = preserved_state[key]
                iss.resolved = saved["resolved"]
                iss.reviewed = saved["reviewed"]
                iss.review_note = saved["review_note"]
                iss.issue_id = saved["issue_id"]

        return result

    def trace_student(self, student_id: str) -> Dict[str, Any]:
        chain: Dict[str, Any] = {"student_id": student_id, "traces": []}
        stu = self.record.students.get(student_id)
        if stu:
            chain["student_info"] = {
                "ability": stu.ability,
                "ability_se": stu.ability_se,
                "answered_count": stu.answered_count,
                "valid_answers": stu.valid_answers
            }

        for a in self.record.student_answers:
            if a.student_id == student_id:
                it = self.record.items.get(a.item_id)
                chain["traces"].append({
                    "item_id": a.item_id,
                    "item_name": it.item_name if it else "",
                    "difficulty": it.difficulty if it else None,
                    "is_correct": a.is_correct,
                    "source": a.source
                })

        chain["related_issues"] = [
            {"id": i.issue_id, "type": i.issue_type.value, "severity": i.severity,
             "description": i.description, "resolved": i.resolved}
            for i in self.record.issues if i.related_student_id == student_id
        ]

        chain["review_history"] = [
            n for n in self.record.review_notes if n.get("student_id") == student_id
        ]

        return chain

    def summary(self) -> str:
        r = self.record
        unresolved = sum(1 for i in r.issues if not i.resolved)
        lines = [
            f"处理记录ID: {r.record_id}",
            f"批次号: {r.batch_id}",
            f"当前状态: {r.status.value}",
            f"问题总数: {len(r.issues)} (未解决: {unresolved})",
            f"复核记录数: {len(r.review_notes)}",
            f"有效答题: {r.valid_answer_count} / 总记录: {len(r.student_answers)}",
        ]
        return "\n".join(lines)

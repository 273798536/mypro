import os
import json
import csv
from typing import List, Tuple, Dict, Any, Optional
from .models import StudentAnswer, Item, Student, Issue, IssueType, ProcessingRecord, GapRecord, RecordStatus


REQUIRED_FIELDS = ["student_id", "item_id"]
OPTIONAL_FIELDS = ["is_correct", "course_id", "item_name", "timestamp"]


class Importer:
    def __init__(self):
        self.processing_record: Optional[ProcessingRecord] = None
        self.gaps: List[GapRecord] = []

    def import_from_csv(self, file_path: str) -> ProcessingRecord:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"导入文件不存在: {file_path}")

        record = ProcessingRecord()
        record.raw_materials_ref.append(os.path.abspath(file_path))
        self.processing_record = record

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        return self._process_rows(rows, record, source=f"CSV:{os.path.basename(file_path)}")

    def import_from_json(self, file_path: str) -> ProcessingRecord:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"导入文件不存在: {file_path}")

        record = ProcessingRecord()
        record.raw_materials_ref.append(os.path.abspath(file_path))
        self.processing_record = record

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        rows = data if isinstance(data, list) else data.get("answers", data.get("data", []))
        return self._process_rows(rows, record, source=f"JSON:{os.path.basename(file_path)}")

    def _process_rows(self, rows: List[Dict[str, Any]], record: ProcessingRecord, source: str) -> ProcessingRecord:
        for idx, row in enumerate(rows):
            missing_fields = [f for f in REQUIRED_FIELDS if f not in row or row[f] in (None, "", "null", "NULL")]

            if missing_fields:
                gap = GapRecord(
                    raw_data=row,
                    missing_fields=missing_fields,
                    reason=f"第{idx+1}行缺少必填字段: {', '.join(missing_fields)}"
                )
                self.gaps.append(gap)
                record.gap_count += 1
                record.excluded_answer_count += 1

                issue = Issue(
                    issue_type=IssueType.MISSING_HISTORY,
                    severity="high",
                    description=f"第{idx+1}行: 学生/题目标识缺失，无法处理",
                    suggestion="请风控分析师补充 student_id 和 item_id 后重新导入或在复核界面修正",
                    affected_records=[f"row-{idx+1}"]
                )
                record.issues.append(issue)
                continue

            student_id = str(row["student_id"]).strip()
            item_id = str(row["item_id"]).strip()

            is_correct_raw = row.get("is_correct")
            is_correct: Optional[int] = None
            if is_correct_raw not in (None, "", "null", "NULL", "NA", "nan"):
                try:
                    val = int(is_correct_raw)
                    is_correct = 1 if val >= 1 else 0
                except (ValueError, TypeError):
                    is_correct = 1 if str(is_correct_raw).lower() in ("1", "true", "t", "yes", "y", "对", "正确") else 0

            answer = StudentAnswer(
                student_id=student_id,
                item_id=item_id,
                is_correct=is_correct,
                timestamp=str(row.get("timestamp", "")).strip() or None,
                source=source,
                raw_row=row
            )

            if is_correct is None:
                gap = GapRecord(
                    student_id=student_id,
                    item_id=item_id,
                    missing_fields=["is_correct"],
                    raw_data=row,
                    reason=f"学生{student_id}对题目{item_id}的作答结果缺失"
                )
                self.gaps.append(gap)
                record.gap_count += 1

                issue = Issue(
                    issue_type=IssueType.MISSING_HISTORY,
                    severity="medium",
                    description=f"学生 {student_id} / 题目 {item_id}: 历史答案缺失，已暂存，不影响其他记录计算",
                    suggestion="风控分析师可在复核界面补录该题对错，或确认排除",
                    related_student_id=student_id,
                    related_item_id=item_id,
                    affected_records=[f"{student_id}:{item_id}"]
                )
                record.issues.append(issue)

            record.student_answers.append(answer)

            if item_id not in record.items:
                course_id = str(row.get("course_id", "COURSE-DEFAULT")).strip() or "COURSE-DEFAULT"
                item_name = str(row.get("item_name", item_id)).strip() or item_id
                record.items[item_id] = Item(item_id=item_id, course_id=course_id, item_name=item_name)

            if student_id not in record.students:
                record.students[student_id] = Student(student_id=student_id)

            if is_correct is not None:
                record.valid_answer_count += 1
                record.students[student_id].valid_answers += 1
                record.items[item_id].response_count += 1
            else:
                record.excluded_answer_count += 1

            record.students[student_id].answered_count += 1

        for item in record.items.values():
            if item.response_count > 0:
                correct = sum(1 for a in record.student_answers
                              if a.item_id == item.item_id and a.is_correct == 1)
                item.correct_rate = correct / item.response_count

        record.status = RecordStatus.IMPORTED
        return record

    def export_gaps_for_risk(self, output_path: str) -> str:
        if not self.gaps:
            return "无缺口记录"

        gap_list = []
        for g in self.gaps:
            gap_list.append({
                "gap_id": g.gap_id,
                "student_id": g.student_id,
                "item_id": g.item_id,
                "missing_fields": g.missing_fields,
                "reason": g.reason,
                "assigned_to": g.assigned_to,
                "raw_data": g.raw_data
            })

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(gap_list, f, ensure_ascii=False, indent=2)

        return f"已导出 {len(gap_list)} 条缺口记录至 {output_path}，由风控分析师补录"

    def summarize_import(self) -> str:
        if not self.processing_record:
            return "尚未导入任何数据"

        r = self.processing_record
        lines = [
            f"批次号: {r.batch_id}",
            f"答题记录总数: {len(r.student_answers)}",
            f"  - 有效记录(可计算): {r.valid_answer_count}",
            f"  - 排除记录(答案缺失): {r.excluded_answer_count}",
            f"  - 缺口记录(需补录): {r.gap_count}",
            f"涉及学生数: {len(r.students)}",
            f"涉及题目数: {len(r.items)}",
            f"检测到问题数: {len(r.issues)}",
        ]
        return "\n".join(lines)

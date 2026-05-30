import csv
import json
import os
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from dataclasses import dataclass

from .config import Config
from .exceptions import DataAnomaly
from .models import Student, LeaveRecord, ConflictRelation
from .models.trace import TraceChain, TraceRecord, ConstraintExplanation


class DataLoader:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.anomalies: List[DataAnomaly] = []
        self.trace_chains: Dict[str, TraceChain] = {}
        self.bad_rows: List[Dict[str, Any]] = []
        self.comment_rows: List[Dict[str, Any]] = []
        self.blank_rows: List[int] = []

    def load_file(self, file_path: str) -> Tuple[List[Student], List[ConflictRelation]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            return self._load_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            return self._load_excel(file_path)
        elif ext == '.json':
            return self._load_json(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _load_csv(self, file_path: str) -> Tuple[List[Student], List[ConflictRelation]]:
        students: List[Student] = []
        conflicts: List[ConflictRelation] = []

        with open(file_path, 'r', encoding='utf-8-sig', newline='') as f:
            reader = csv.reader(f)
            rows = list(reader)

        if not rows:
            self._add_anomaly(-1, "empty_file", "error", "文件为空，没有数据", {})
            return students, conflicts

        header_row_idx, headers = self._find_header_row(rows)
        if header_row_idx == -1:
            self._add_anomaly(0, "missing_header", "error", "无法找到有效的表头行", {})
            return students, conflicts

        normalized_headers = self._normalize_headers(headers)
        self._validate_columns(normalized_headers, header_row_idx)

        for row_idx in range(header_row_idx + 1, len(rows)):
            row = rows[row_idx]
            actual_line = row_idx + 1

            if self._is_blank_row(row):
                self.blank_rows.append(actual_line)
                self._add_anomaly(actual_line, "blank_row", "info", "空行，已跳过", {"raw": row})
                continue

            if self._is_comment_row(row):
                self.comment_rows.append({"line": actual_line, "content": row})
                self._add_anomaly(actual_line, "comment_row", "info", "备注行，已跳过", {"raw": row})
                continue

            if len(row) < len(normalized_headers) * self.config.BLANK_THRESHOLD:
                self._add_anomaly(
                    actual_line, "insufficient_columns", "warning",
                    f"列数不足，期望{len(normalized_headers)}列，实际{len(row)}列",
                    {"raw": row}
                )

            row_data = self._parse_row(row, normalized_headers, actual_line)

            if self._is_bad_row(row_data, actual_line):
                self.bad_rows.append({"line": actual_line, "data": row_data})
                continue

            try:
                student = self._parse_student(row_data, actual_line)
                if student.is_valid:
                    students.append(student)
                    self._init_trace_chain(student)

                    explicit_conflicts = self._parse_explicit_conflicts(student, row_data)
                    conflicts.extend(explicit_conflicts)
                else:
                    self._add_anomaly(
                        actual_line, "invalid_student", "error",
                        f"学生数据无效: {'; '.join(student.validation_errors)}",
                        row_data
                    )
                    self.bad_rows.append({"line": actual_line, "data": row_data, "errors": student.validation_errors})
            except Exception as e:
                self._add_anomaly(
                    actual_line, "parse_error", "error",
                    f"解析行失败: {str(e)}",
                    {"raw": row_data}
                )
                self.bad_rows.append({"line": actual_line, "data": row_data, "exception": str(e)})

        return students, conflicts

    def _load_excel(self, file_path: str) -> Tuple[List[Student], List[ConflictRelation]]:
        try:
            import openpyxl
        except ImportError:
            raise ImportError("需要安装openpyxl来读取Excel文件: pip install openpyxl")

        wb = openpyxl.load_workbook(file_path, data_only=True)
        ws = wb.active

        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([str(cell) if cell is not None else "" for cell in row])

        temp_csv = os.path.join(self.config.OUTPUT_DIR, "_temp_excel_conversion.csv")
        with open(temp_csv, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(rows)

        result = self._load_csv(temp_csv)
        os.remove(temp_csv)
        return result

    def _load_json(self, file_path: str) -> Tuple[List[Student], List[ConflictRelation]]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        students: List[Student] = []
        conflicts: List[ConflictRelation] = []

        if isinstance(data, dict) and "students" in data:
            data_list = data["students"]
        elif isinstance(data, list):
            data_list = data
        else:
            raise ValueError("JSON格式不正确，需要是列表或包含students键的对象")

        for idx, item in enumerate(data_list):
            line_num = idx + 1
            if not item:
                self.blank_rows.append(line_num)
                continue

            try:
                student = self._parse_student_from_json(item, line_num)
                if student.is_valid:
                    students.append(student)
                    self._init_trace_chain(student)
                else:
                    self.bad_rows.append({"line": line_num, "data": item, "errors": student.validation_errors})
            except Exception as e:
                self._add_anomaly(line_num, "parse_error", "error", f"JSON解析失败: {str(e)}", item)
                self.bad_rows.append({"line": line_num, "data": item, "exception": str(e)})

        return students, conflicts

    def _find_header_row(self, rows: List[List[str]]) -> Tuple[int, List[str]]:
        for idx, row in enumerate(rows[:5]):
            normalized = [self._normalize_header(c) for c in row if c]
            if any(col in normalized for col in ["student_id", "姓名", "学号", "name"]):
                return idx, [c for c in row if c]
        return -1, []

    def _normalize_header(self, header: str) -> str:
        if not header:
            return ""
        h = header.strip().lower()
        mapping = {
            "学号": "student_id", "学生id": "student_id", "studentid": "student_id",
            "姓名": "name", "名字": "name",
            "年级": "grade", "年段": "grade",
            "班级": "class", "班别": "class",
            "性别": "gender",
            "兴趣标签": "interest_tags", "兴趣": "interest_tags", "tags": "interest_tags",
            "请假记录": "leave_records", "请假": "leave_records", "leave": "leave_records",
            "冲突对象": "conflict_with", "不能同班": "conflict_with", "冲突": "conflict_with",
            "座位偏好": "seat_preference", "座位": "seat_preference",
            "特殊需求": "special_needs", "特殊情况": "special_needs",
            "备注": "notes", "说明": "notes", "note": "notes"
        }
        for chinese, english in mapping.items():
            if chinese in h:
                return english
        return h.replace(" ", "_").replace("-", "_")

    def _normalize_headers(self, headers: List[str]) -> List[str]:
        return [self._normalize_header(h) for h in headers]

    def _validate_columns(self, headers: List[str], line_num: int):
        missing = [col for col in self.config.REQUIRED_COLUMNS if col not in headers]
        if missing:
            self._add_anomaly(
                line_num, "missing_required_columns", "error",
                f"缺少必要列: {', '.join(missing)}",
                {"headers": headers, "missing": missing}
            )

        extra = [col for col in headers if col not in self.config.REQUIRED_COLUMNS
                 and col not in self.config.OPTIONAL_COLUMNS and col]
        if extra:
            self._add_anomaly(
                line_num, "unknown_columns", "warning",
                f"未知列将被忽略: {', '.join(extra)}",
                {"headers": headers, "unknown": extra}
            )

    def _is_blank_row(self, row: List[str]) -> bool:
        return not row or all(not str(cell).strip() for cell in row)

    def _is_comment_row(self, row: List[str]) -> bool:
        first_cell = str(row[0]).strip() if row else ""
        return any(first_cell.startswith(prefix) for prefix in self.config.COMMENT_PREFIXES)

    def _is_bad_row(self, row_data: Dict[str, Any], line_num: int) -> bool:
        text = str(row_data).lower()
        for marker in self.config.BAD_ROW_MARKERS:
            if marker in text:
                self._add_anomaly(
                    line_num, "bad_row_marker", "error",
                    f"检测到坏行标记: {marker}",
                    row_data,
                    suggested_action="isolate"
                )
                return True
        return False

    def _parse_row(self, row: List[str], headers: List[str], line_num: int) -> Dict[str, Any]:
        result = {}
        for i, header in enumerate(headers):
            if not header:
                continue
            value = row[i].strip() if i < len(row) else ""
            result[header] = value
            if value and header not in self.config.REQUIRED_COLUMNS and header not in self.config.OPTIONAL_COLUMNS:
                self._add_anomaly(
                    line_num, "unexpected_data", "info",
                    f"在非标准列'{header}'中发现数据",
                    {"column": header, "value": value}
                )
        result["_raw_line"] = line_num
        return result

    def _parse_student(self, row_data: Dict[str, Any], line_num: int) -> Student:
        student = Student(
            student_id=str(row_data.get("student_id", "")).strip(),
            name=str(row_data.get("name", "")).strip(),
            grade=str(row_data.get("grade", "")).strip(),
            class_name=str(row_data.get("class", "")).strip(),
            gender=str(row_data.get("gender", "")).strip(),
            interest_tags=self._parse_tags(row_data.get("interest_tags", "")),
            seat_preference=str(row_data.get("seat_preference", "")).strip(),
            special_needs=str(row_data.get("special_needs", "")).strip(),
            notes=str(row_data.get("notes", "")).strip(),
            raw_data=row_data,
            data_line_number=line_num,
            conflict_with=self._parse_conflict_list(row_data.get("conflict_with", ""))
        )

        leave_records = self._parse_leave_records(row_data.get("leave_records", ""), student.student_id)
        for lr in leave_records:
            student.add_leave_record(lr)

        return student

    def _parse_student_from_json(self, item: Dict[str, Any], line_num: int) -> Student:
        student = Student(
            student_id=str(item.get("student_id", item.get("id", ""))),
            name=str(item.get("name", "")),
            grade=str(item.get("grade", "")),
            class_name=str(item.get("class", "")),
            gender=str(item.get("gender", "")),
            interest_tags=item.get("interest_tags", []) or self._parse_tags(item.get("interest_tags", "")),
            seat_preference=str(item.get("seat_preference", "")),
            special_needs=str(item.get("special_needs", "")),
            notes=str(item.get("notes", "")),
            raw_data=item,
            data_line_number=line_num,
            conflict_with=item.get("conflict_with", []) or self._parse_conflict_list(item.get("conflict_with", ""))
        )

        leave_data = item.get("leave_records", [])
        if isinstance(leave_data, list):
            for lr in leave_data:
                try:
                    record = LeaveRecord(
                        student_id=student.student_id,
                        start_date=self._parse_date(lr.get("start_date")),
                        end_date=self._parse_date(lr.get("end_date")),
                        leave_type=lr.get("leave_type", "general"),
                        reason=lr.get("reason", ""),
                        approved=lr.get("approved", False)
                    )
                    student.add_leave_record(record)
                except Exception as e:
                    self._add_anomaly(line_num, "leave_parse_error", "warning", f"请假记录解析失败: {e}", lr)

        return student

    def _parse_tags(self, tags_str: str) -> List[str]:
        if not tags_str:
            return []
        tags = re.split(r'[,，;；、\s]+', str(tags_str).strip())
        return [t.strip() for t in tags if t.strip()]

    def _parse_conflict_list(self, conflict_str: str) -> List[str]:
        if not conflict_str:
            return []
        conflicts = re.split(r'[,，;；、\s]+', str(conflict_str).strip())
        return [c.strip() for c in conflicts if c.strip()]

    def _parse_leave_records(self, leave_str: str, student_id: str) -> List[LeaveRecord]:
        if not leave_str:
            return []

        records = []
        leave_entries = re.split(r'[;；\n]+', str(leave_str).strip())

        for entry in leave_entries:
            entry = entry.strip()
            if not entry:
                continue

            try:
                dates = re.findall(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', entry)
                if len(dates) >= 2:
                    start = self._parse_date(dates[0])
                    end = self._parse_date(dates[1])
                    approved = "已批准" in entry or "approved" in entry.lower() or True
                    leave_type = "病假" if "病" in entry else "事假" if "事" in entry else "general"

                    records.append(LeaveRecord(
                        student_id=student_id,
                        start_date=start,
                        end_date=end,
                        leave_type=leave_type,
                        reason=entry,
                        approved=approved
                    ))
                elif len(dates) == 1:
                    single_date = self._parse_date(dates[0])
                    records.append(LeaveRecord(
                        student_id=student_id,
                        start_date=single_date,
                        end_date=single_date,
                        leave_type="general",
                        reason=entry,
                        approved=True
                    ))
            except Exception as e:
                self._add_anomaly(
                    -1, "leave_parse_warning", "warning",
                    f"请假记录格式异常，已忽略: {entry} - {e}",
                    {"raw_entry": entry}
                )

        return records

    def _parse_date(self, date_str: Optional[str]) -> date:
        if not date_str:
            raise ValueError("日期为空")
        date_str = str(date_str).strip()
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%Y-%m-%d %H:%M:%S"]:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"无法解析日期: {date_str}")

    def _parse_explicit_conflicts(self, student: Student, row_data: Dict[str, Any]) -> List[ConflictRelation]:
        conflicts = []
        for partner_id in student.conflict_with:
            conflicts.append(ConflictRelation(
                student_a_id=student.student_id,
                student_b_id=partner_id,
                conflict_type="explicit",
                weight=self.config.CONFLICT_WEIGHTS["explicit"],
                description=f"学生{student.name}明确指定冲突对象",
                source="student_declared"
            ))
        return conflicts

    def _init_trace_chain(self, student: Student):
        if self.config.ENABLE_TRACE:
            chain = TraceChain(student_id=student.student_id)
            chain.add_record(TraceRecord(
                student_id=student.student_id,
                trace_type="data_load",
                action="student_loaded",
                description=f"从数据源加载学生数据，行号: {student.data_line_number}",
                source_module="data_loader",
                data_hash=student.get_data_hash(),
                input_state={},
                output_state={"student": student.to_dict()},
                constraints=[
                    ConstraintExplanation(
                        student_id=student.student_id,
                        constraint_type="data_integrity",
                        description="学生基础数据完整性校验",
                        source="data_loader",
                        weight=1.0,
                        evidence=[{"field": "is_valid", "value": student.is_valid}]
                    )
                ]
            ))
            self.trace_chains[student.student_id] = chain

    def _add_anomaly(self, row_index: int, anomaly_type: str, severity: str,
                     description: str, raw_data: Dict[str, Any],
                     column: Optional[str] = None, suggested_action: str = "review"):
        self.anomalies.append(DataAnomaly(
            row_index=row_index,
            anomaly_type=anomaly_type,
            severity=severity,
            description=description,
            column=column,
            raw_data=raw_data,
            suggested_action=suggested_action
        ))

    def get_anomalies_by_severity(self, severity: str) -> List[DataAnomaly]:
        return [a for a in self.anomalies if a.severity == severity]

    def get_anomalies_by_type(self, anomaly_type: str) -> List[DataAnomaly]:
        return [a for a in self.anomalies if a.anomaly_type == anomaly_type]

    def get_trace_chain(self, student_id: str) -> Optional[TraceChain]:
        return self.trace_chains.get(student_id)

    def get_all_trace_chains(self) -> Dict[str, TraceChain]:
        return self.trace_chains

    def get_summary(self) -> Dict[str, Any]:
        return {
            "total_anomalies": len(self.anomalies),
            "errors": len(self.get_anomalies_by_severity("error")),
            "warnings": len(self.get_anomalies_by_severity("warning")),
            "info": len(self.get_anomalies_by_severity("info")),
            "bad_rows": len(self.bad_rows),
            "blank_rows": len(self.blank_rows),
            "comment_rows": len(self.comment_rows),
            "anomaly_types": list(set(a.anomaly_type for a in self.anomalies))
        }

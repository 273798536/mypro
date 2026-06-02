import re
import os
import csv
import json
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from .models import TrainingRecord, LossRecord, Issue, IssueType


class DataImporter:
    LOSS_FUNCTION_PATTERNS = [
        r"(?P<func>[A-Za-z_][A-Za-z0-9_]*)\s*[\(\{（]\s*[\)\}）]\s*(?:\s*(?:#|//|--)\s*(?P<note>.+))?$",
        r"(?P<func>[A-Za-z_][A-Za-z0-9_]*)\s*(?P<note>.+)$",
    ]

    LEARNING_RATE_PATTERNS = [
        r"(?:learning[_ ]?rate|lr)\s*[:=：]\s*(?P<lr>\d+\.?\d*[eE]?[+-]?\d*)",
        r"(?:学习率|学习速率)\s*[:=：]\s*(?P<lr>\d+\.?\d*[eE]?[+-]?\d*)",
        r"^\s*(?P<lr>\d+\.?\d*[eE]?[+-]?\d*)\s*$",
    ]

    ITERATION_PATTERNS = [
        r"(?:iter(?:ation)?s?|epoch|轮次?)\s*[:=：]\s*(?P<it>\d+)",
        r"^\s*(?P<it>\d+)\s*(?:iter|epoch|轮)\s*$",
    ]

    CLASS_NAME_PATTERNS = [
        r"(?:class|班级|课堂|批次|batch)\s*[:=：]\s*(?P<name>.+?)(?:\s*\[|\s*--.*|\s*$)",
        r"^\s*(?P<name>.+?)\s*(?:班|课堂|batch)\s*$",
    ]

    def __init__(self):
        self.parsing_issues: List[Issue] = []
        self.import_snapshots: List[Dict] = []

    def import_from_file(self, file_path: str) -> List[TrainingRecord]:
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        if ext == ".csv":
            return self._import_csv(file_path)
        elif ext == ".json":
            return self._import_json(file_path)
        elif ext in [".txt", ".log", ".md"]:
            return self._import_text(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def import_from_directory(self, dir_path: str) -> List[TrainingRecord]:
        all_records = []
        for root, _, files in os.walk(dir_path):
            for f in files:
                if f.startswith("."):
                    continue
                fp = os.path.join(root, f)
                try:
                    records = self.import_from_file(fp)
                    all_records.extend(records)
                except Exception as e:
                    self._record_import_issue(
                        IssueType.CORRUPTED_LOSS_RECORD,
                        f"文件 {f} 导入失败: {str(e)}",
                        fp,
                        severity="error"
                    )
        return all_records

    def _import_csv(self, file_path: str) -> List[TrainingRecord]:
        records = []
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                record = self._parse_csv_row(row, file_path, row_num)
                if record:
                    records.append(record)
        return records

    def _parse_csv_row(self, row: Dict, file_path: str, row_num: int) -> Optional[TrainingRecord]:
        class_name = self._extract_class_name(row)
        if not class_name:
            class_name = f"record_{row_num}"
            self._record_import_issue(
                IssueType.RENAMED_CLASS_RECORD,
                f"第 {row_num} 行未找到班级名，自动命名为 {class_name}",
                file_path,
                class_name=class_name,
                severity="warning"
            )

        original_class_name = class_name

        loss_func, loss_note = self._parse_loss_function(row.get("loss_function", "") or row.get("损失函数", ""))

        lr = self._extract_learning_rate(row)
        lr_source = "csv_row"

        iterations = self._extract_iterations(row)

        record = TrainingRecord(
            record_id=f"{os.path.basename(file_path)}_row{row_num}",
            class_name=class_name,
            original_class_name=original_class_name,
            loss_function=loss_func,
            loss_function_note=loss_note,
            learning_rate=lr,
            learning_rate_source=lr_source,
            iterations=iterations,
            source_file=file_path,
        )

        if lr is None:
            self._record_import_issue(
                IssueType.MISSING_LEARNING_RATE,
                f"班级 {class_name} 学习率未填写",
                file_path,
                record_id=record.record_id,
                class_name=class_name,
                severity="high"
            )

        self._parse_loss_history_from_csv(record, row)

        if not record.loss_history:
            record.loss_history = self._extract_loss_from_text_columns(row, record, file_path)

        self._capture_snapshot("csv_parse", record, {"raw_row": row})

        return record

    def _parse_loss_history_from_csv(self, record: TrainingRecord, row: Dict) -> None:
        loss_cols = [k for k in row.keys() if re.search(r"(loss|损失|iter|epoch|轮)", k, re.IGNORECASE)]
        iter_cols = [k for k in loss_cols if re.search(r"(iter|epoch|轮)", k, re.IGNORECASE)]
        val_cols = [k for k in loss_cols if re.search(r"(loss|损失)", k, re.IGNORECASE)]

        for i, (iter_col, val_col) in enumerate(zip(iter_cols, val_cols)):
            try:
                it = int(float(row.get(iter_col, 0)))
                val = float(row.get(val_col, 0))
                record.loss_history.append(LossRecord(
                    iteration=it,
                    loss_value=val,
                    raw_line=f"{iter_col}: {row.get(iter_col)}, {val_col}: {row.get(val_col)}",
                    source_file=record.source_file
                ))
            except (ValueError, TypeError):
                continue

    def _extract_loss_from_text_columns(self, row: Dict, record: TrainingRecord, file_path: str) -> List[LossRecord]:
        history = []
        for key, value in row.items():
            if not value:
                continue
            matches = re.findall(r"(?:iter|epoch|轮)\s*[:=]?\s*(\d+)\s*[,，]\s*(?:loss|损失)\s*[:=]?\s*(\d+\.?\d*)", str(value))
            for it_str, val_str in matches:
                try:
                    history.append(LossRecord(
                        iteration=int(it_str),
                        loss_value=float(val_str),
                        raw_line=str(value),
                        source_file=file_path
                    ))
                except ValueError:
                    continue
        return history

    def _import_json(self, file_path: str) -> List[TrainingRecord]:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = []
        if isinstance(data, list):
            for idx, item in enumerate(data):
                record = self._parse_json_item(item, file_path, idx)
                if record:
                    records.append(record)
        elif isinstance(data, dict):
            record = self._parse_json_item(data, file_path, 0)
            if record:
                records.append(record)

        return records

    def _parse_json_item(self, item: Dict, file_path: str, idx: int) -> Optional[TrainingRecord]:
        class_name = item.get("class_name") or item.get("班级") or item.get("class")
        original_class_name = class_name or f"record_{idx}"
        if not class_name:
            class_name = f"record_{idx}"

        loss_func_raw = item.get("loss_function") or item.get("损失函数") or ""
        loss_func, loss_note = self._parse_loss_function(loss_func_raw)

        lr = item.get("learning_rate") or item.get("学习率")
        if lr is not None:
            try:
                lr = float(lr)
            except (ValueError, TypeError):
                lr = None

        iterations = item.get("iterations") or item.get("迭代次数") or 0
        if iterations:
            try:
                iterations = int(iterations)
            except (ValueError, TypeError):
                iterations = 0

        record = TrainingRecord(
            record_id=f"{os.path.basename(file_path)}_item{idx}",
            class_name=class_name,
            original_class_name=original_class_name,
            loss_function=loss_func,
            loss_function_note=loss_note,
            learning_rate=lr,
            learning_rate_source="json",
            iterations=iterations,
            source_file=file_path,
        )

        if lr is None:
            self._record_import_issue(
                IssueType.MISSING_LEARNING_RATE,
                f"班级 {class_name} 学习率未填写",
                file_path,
                record_id=record.record_id,
                class_name=class_name,
                severity="high"
            )

        history = item.get("loss_history") or item.get("损失曲线") or []
        for idx2, h in enumerate(history):
            if isinstance(h, dict):
                it = h.get("iteration") or h.get("iter") or h.get("轮次") or idx2
                val = h.get("loss") or h.get("损失")
                if val is not None:
                    try:
                        record.loss_history.append(LossRecord(
                            iteration=int(it),
                            loss_value=float(val),
                            raw_line=json.dumps(h, ensure_ascii=False),
                            source_file=file_path
                        ))
                    except (ValueError, TypeError):
                        continue
            elif isinstance(h, (list, tuple)) and len(h) >= 2:
                try:
                    record.loss_history.append(LossRecord(
                        iteration=int(h[0]),
                        loss_value=float(h[1]),
                        raw_line=str(h),
                        source_file=file_path
                    ))
                except (ValueError, TypeError):
                    continue

        self._capture_snapshot("json_parse", record, {"raw_item": item})

        return record

    def _import_text(self, file_path: str) -> List[TrainingRecord]:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        records = []
        current_record = None
        in_loss_section = False

        for line_num, line in enumerate(lines, start=1):
            line = line.strip()
            if not line:
                if current_record and current_record.loss_history:
                    records.append(current_record)
                    current_record = None
                in_loss_section = False
                continue

            class_match = self._match_any_pattern(line, self.CLASS_NAME_PATTERNS)
            if class_match:
                if current_record and current_record.loss_history:
                    records.append(current_record)
                class_name = class_match.group("name").strip()
                current_record = TrainingRecord(
                    record_id=f"{os.path.basename(file_path)}_line{line_num}",
                    class_name=class_name,
                    original_class_name=class_name,
                    loss_function="",
                    source_file=file_path,
                    learning_rate_source="text",
                )
                in_loss_section = False
                self._capture_snapshot("text_new_record", current_record, {"line": line})
                continue

            if current_record:
                if not current_record.loss_function and ("loss" in line.lower() or "损失函数" in line):
                    loss_func, loss_note = self._parse_loss_function(line)
                    current_record.loss_function = loss_func
                    current_record.loss_function_note = loss_note
                    continue

                lr_match = self._match_any_pattern(line, self.LEARNING_RATE_PATTERNS)
                if lr_match and current_record.learning_rate is None:
                    try:
                        current_record.learning_rate = float(lr_match.group("lr"))
                        continue
                    except ValueError:
                        pass

                iter_match = self._match_any_pattern(line, self.ITERATION_PATTERNS)
                if iter_match and not current_record.iterations:
                    try:
                        current_record.iterations = int(iter_match.group("it"))
                    except ValueError:
                        pass

                loss_point_match = re.search(
                    r"(?:iter|epoch|轮次?)\s*[:=]?\s*(\d+)\s*[,，\s]+(?:loss|损失)\s*[:=]?\s*(\d+\.?\d*)",
                    line
                )
                if loss_point_match:
                    try:
                        it = int(loss_point_match.group(1))
                        val = float(loss_point_match.group(2))
                        current_record.loss_history.append(LossRecord(
                            iteration=it,
                            loss_value=val,
                            raw_line=line,
                            source_file=file_path
                        ))
                        in_loss_section = True
                        continue
                    except ValueError:
                        continue

                simple_match = re.search(r"^\s*(\d+)\s*[,，\s]+(\d+\.?\d*)", line)
                if simple_match:
                    try:
                        it = int(simple_match.group(1))
                        val = float(simple_match.group(2))
                        current_record.loss_history.append(LossRecord(
                            iteration=it,
                            loss_value=val,
                            raw_line=line,
                            source_file=file_path
                        ))
                        in_loss_section = True
                        continue
                    except ValueError:
                        pass

        if current_record and current_record.loss_history:
            records.append(current_record)

        for record in records:
            if record.learning_rate is None:
                self._record_import_issue(
                    IssueType.MISSING_LEARNING_RATE,
                    f"班级 {record.class_name} 学习率未填写",
                    file_path,
                    record_id=record.record_id,
                    class_name=record.class_name,
                    severity="high"
                )

        return records

    def _parse_loss_function(self, raw: str) -> Tuple[str, str]:
        raw = raw.strip()
        if not raw:
            return "", ""

        for pattern in self.LOSS_FUNCTION_PATTERNS:
            match = re.search(pattern, raw)
            if match:
                func = match.group("func").strip()
                note = match.group("note").strip() if "note" in pattern and match.group("note") else ""
                return func, note

        if "#" in raw:
            parts = raw.split("#", 1)
            return parts[0].strip(), parts[1].strip()

        if "//" in raw:
            parts = raw.split("//", 1)
            return parts[0].strip(), parts[1].strip()

        if "--" in raw:
            parts = raw.split("--", 1)
            return parts[0].strip(), parts[1].strip()

        func_match = re.match(r"([A-Za-z_][A-Za-z0-9_]*\s*\(.*?\))", raw)
        if func_match:
            return func_match.group(1).strip(), ""

        return raw.strip(), ""

    def _extract_class_name(self, row: Dict) -> Optional[str]:
        for key in ["class_name", "class", "班级", "班级名称", "batch", "批次", "课堂", "课堂名称"]:
            if key in row and row[key]:
                return str(row[key]).strip()
        return None

    def _extract_learning_rate(self, row: Dict) -> Optional[float]:
        for key in ["learning_rate", "学习率", "lr", "learning rate"]:
            if key in row and row[key]:
                try:
                    val = float(row[key])
                    return val
                except (ValueError, TypeError):
                    match = self._match_any_pattern(str(row[key]), self.LEARNING_RATE_PATTERNS)
                    if match:
                        try:
                            return float(match.group("lr"))
                        except ValueError:
                            pass
        return None

    def _extract_iterations(self, row: Dict) -> int:
        for key in ["iterations", "迭代次数", "iter", "轮次"]:
            if key in row and row[key]:
                try:
                    return int(float(row[key]))
                except (ValueError, TypeError):
                    match = self._match_any_pattern(str(row[key]), self.ITERATION_PATTERNS)
                    if match:
                        try:
                            return int(match.group("it"))
                        except ValueError:
                            pass
        return 0

    def _match_any_pattern(self, text: str, patterns: List[str]) -> Optional[re.Match]:
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match
        return None

    def _record_import_issue(
        self,
        issue_type: IssueType,
        message: str,
        source_file: str,
        record_id: str = "",
        class_name: str = "",
        severity: str = "warning"
    ) -> None:
        issue = Issue(
            issue_type=issue_type,
            severity=severity,
            message=message,
            record_id=record_id,
            class_name=class_name,
            details={"source_file": source_file, "timestamp": datetime.now().isoformat()}
        )
        self.parsing_issues.append(issue)

    def _capture_snapshot(self, operation: str, record: TrainingRecord, extra: Dict) -> None:
        self.import_snapshots.append({
            "stage": "import",
            "operation": operation,
            "record_id": record.record_id,
            "class_name": record.class_name,
            "data_before": extra,
            "data_after": {
                "loss_function": record.loss_function,
                "loss_function_note": record.loss_function_note,
                "learning_rate": record.learning_rate,
                "iterations": record.iterations,
                "loss_points_count": len(record.loss_history),
            },
            "timestamp": datetime.now().isoformat(),
        })

    def get_parsing_issues(self) -> List[Issue]:
        return self.parsing_issues

    def get_import_snapshots(self) -> List[Dict]:
        return self.import_snapshots

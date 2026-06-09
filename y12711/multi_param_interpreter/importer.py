import json
import csv
import uuid
import os
from typing import List, Dict, Any, Tuple, Optional
from .models import DataSource, QuestionRecord, ImportBatch
from .db import Database


class DataImporter:
    def __init__(self, db: Database):
        self.db = db

    def _generate_batch_id(self) -> str:
        return f"batch_{uuid.uuid4().hex[:8]}"

    def import_file(self, file_path: str, source: DataSource) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".json":
            raw_items = self._load_json(file_path)
        elif ext in (".csv", ".tsv"):
            raw_items = self._load_csv(file_path, ext == ".tsv")
        else:
            raise ValueError(f"不支持的文件格式: {ext}，仅支持 .json / .csv / .tsv")

        batch_id = self._generate_batch_id()
        batch = ImportBatch(
            batch_id=batch_id,
            source=source,
            file_name=os.path.basename(file_path),
            total_records=len(raw_items),
        )

        success, skipped, errors = self._parse_and_save(
            raw_items, source, batch_id
        )
        batch.success_count = success
        batch.skipped_count = len(skipped)
        batch.error_count = len(errors)
        batch.skipped_details = skipped + errors

        self.db.insert_batch(batch)
        return {
            "batch_id": batch_id,
            "total": batch.total_records,
            "success": success,
            "skipped": len(skipped),
            "errors": len(errors),
            "skipped_details": batch.skipped_details,
        }

    def _load_json(self, file_path: str) -> List[Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "items" in data:
            return data["items"]
        if isinstance(data, list):
            return data
        raise ValueError("JSON 文件必须是数组或包含 'items' 字段的对象")

    def _load_csv(self, file_path: str, is_tsv: bool = False) -> List[Dict[str, Any]]:
        delim = "\t" if is_tsv else ","
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f, delimiter=delim)
            return [dict(row) for row in reader]

    def _parse_and_save(
        self,
        raw_items: List[Dict[str, Any]],
        source: DataSource,
        batch_id: str,
    ) -> Tuple[int, List[Dict[str, Any]], List[Dict[str, Any]]]:
        success = 0
        skipped: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []

        parser_map = {
            DataSource.HISTORICAL_ANSWERS: self._parse_historical,
            DataSource.STUDENT_MISTAKES: self._parse_student_mistakes,
            DataSource.QUESTION_LIST: self._parse_question_list,
        }
        parser = parser_map[source]

        for idx, raw in enumerate(raw_items):
            try:
                record = parser(raw, batch_id)
                if record is None:
                    skipped.append({
                        "index": idx,
                        "question_id": raw.get("question_id") or raw.get("id") or f"row_{idx}",
                        "reason": "数据不完整，跳过但继续处理后续记录",
                        "raw": self._sanitize(raw),
                    })
                    continue
                self.db.insert_question(record)
                success += 1
            except Exception as e:
                errors.append({
                    "index": idx,
                    "question_id": raw.get("question_id") or raw.get("id") or f"row_{idx}",
                    "reason": f"解析异常: {type(e).__name__}: {e}",
                    "raw": self._sanitize(raw),
                })

        return success, skipped, errors

    def _sanitize(self, raw: Dict[str, Any], max_len: int = 200) -> Dict[str, Any]:
        out = {}
        for k, v in list(raw.items())[:5]:
            s = str(v)
            if len(s) > max_len:
                s = s[:max_len] + "..."
            out[k] = s
        return out

    def _safe_float(self, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    def _safe_int(self, v: Any) -> Optional[int]:
        if v is None or v == "":
            return None
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return None

    def _get_qid(self, raw: Dict[str, Any]) -> str:
        for key in ("question_id", "qid", "id", "题目编号", "题号"):
            if raw.get(key):
                return str(raw[key])
        raise KeyError("找不到题目编号字段 (question_id/qid/id/题目编号/题号)")

    # -------- 历史答案口径 --------
    def _parse_historical(self, raw: Dict[str, Any], batch_id: str) -> Optional[QuestionRecord]:
        try:
            qid = self._get_qid(raw)
        except KeyError:
            return None

        answer = raw.get("answer") or raw.get("参考答案") or raw.get("正确答案")
        difficulty = self._safe_float(
            raw.get("difficulty") or raw.get("难度") or raw.get("p_value")
        )
        discrimination = self._safe_float(
            raw.get("discrimination") or raw.get("区分度") or raw.get("d_value")
        )
        guess_rate = self._safe_float(
            raw.get("guess_rate") or raw.get("猜测率")
        )
        correct = self._safe_int(raw.get("correct_count") or raw.get("答对人数"))
        total = self._safe_int(raw.get("total_count") or raw.get("总人数"))

        if answer is None and difficulty is None:
            return None

        return QuestionRecord(
            question_id=qid,
            source=DataSource.HISTORICAL_ANSWERS,
            raw_data=raw,
            difficulty=difficulty,
            discrimination=discrimination,
            guess_rate=guess_rate,
            correct_count=correct,
            total_count=total,
            answer_text=str(answer) if answer else None,
            import_batch_id=batch_id,
        )

    # -------- 学生错题口径（容错：缺失不整批失败） --------
    def _parse_student_mistakes(self, raw: Dict[str, Any], batch_id: str) -> Optional[QuestionRecord]:
        try:
            qid = self._get_qid(raw)
        except KeyError:
            return None

        mistake = self._safe_int(
            raw.get("mistake_count") or raw.get("错误人数") or raw.get("错人数")
        )
        total = self._safe_int(raw.get("total_count") or raw.get("总人数") or raw.get("答题人数"))
        correct = self._safe_int(raw.get("correct_count") or raw.get("正确人数"))

        if mistake is None and total is None and correct is None:
            return None

        if correct is None and total is not None and mistake is not None:
            correct = max(total - mistake, 0)

        return QuestionRecord(
            question_id=qid,
            source=DataSource.STUDENT_MISTAKES,
            raw_data=raw,
            mistake_count=mistake,
            total_count=total,
            correct_count=correct,
            import_batch_id=batch_id,
        )

    # -------- 题目清单口径 --------
    def _parse_question_list(self, raw: Dict[str, Any], batch_id: str) -> Optional[QuestionRecord]:
        try:
            qid = self._get_qid(raw)
        except KeyError:
            return None

        answer = raw.get("answer") or raw.get("参考答案") or raw.get("标准答案")
        difficulty = self._safe_float(raw.get("difficulty") or raw.get("难度"))
        discrimination = self._safe_float(raw.get("discrimination") or raw.get("区分度"))

        if answer is None and difficulty is None and discrimination is None:
            return None

        return QuestionRecord(
            question_id=qid,
            source=DataSource.QUESTION_LIST,
            raw_data=raw,
            difficulty=difficulty,
            discrimination=discrimination,
            answer_text=str(answer) if answer else None,
            import_batch_id=batch_id,
        )

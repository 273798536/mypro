import os
import json
import uuid
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from .models import MaterialRecord, RecordStatus
from .exceptions import DataQualityError, MaterialMismatchError


class DataLoader:
    def __init__(self, preserve_raw: bool = True, expected_material_names: List[str] = None):
        self.preserve_raw = preserve_raw
        self.expected_material_names = expected_material_names or []

    def load_csv(self, file_path: str, material_name_col: str = "材料名称",
                 record_id_col: Optional[str] = None) -> List[MaterialRecord]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        source_name = os.path.basename(file_path)
        records = []

        try:
            raw_df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        except Exception as e:
            raise DataQualityError(f"CSV读取失败: {str(e)}")

        for idx, row in raw_df.iterrows():
            row_num = idx + 2
            raw_dict = row.to_dict()

            record_id = self._extract_or_generate(record_id_col, raw_dict, idx)
            material_name = str(raw_dict.get(material_name_col, "")).strip()

            record = MaterialRecord(
                record_id=record_id,
                material_name=material_name,
                raw_data=raw_dict if self.preserve_raw else {},
                source_file=source_name,
                source_line=row_num,
            )

            record = self._parse_and_validate_row(record, raw_dict)
            records.append(record)

        return records

    def load_json(self, file_path: str) -> List[MaterialRecord]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        source_name = os.path.basename(file_path)
        records = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
        except Exception as e:
            raise DataQualityError(f"JSON读取失败: {str(e)}")

        if not isinstance(raw_data, list):
            raw_data = [raw_data]

        for idx, item in enumerate(raw_data):
            record_id = str(item.get("record_id", item.get("id", str(uuid.uuid4())[:8])))
            material_name = str(item.get("material_name", item.get("材料名称", "")).strip())

            record = MaterialRecord(
                record_id=record_id,
                material_name=material_name,
                raw_data=item if self.preserve_raw else {},
                source_file=source_name,
                source_line=idx + 1,
            )

            record = self._parse_and_validate_json_record(record, item)
            records.append(record)

        return records

    def _parse_and_validate_row(self, record: MaterialRecord, raw_dict: Dict) -> MaterialRecord:
        if not record.material_name:
            record.status = RecordStatus.BAD
            record.error_message = "材料名称为空"
            return record

        if self.expected_material_names:
            if record.material_name not in self.expected_material_names:
                similar = self._find_similar_name(record.material_name)
                if similar:
                    record.status = RecordStatus.BAD
                    record.error_message = (
                        f"材料名称不匹配: 期望 '{similar}', 实际 '{record.material_name}'。"
                        f"请确认是否为同一材料后手动处理。"
                    )
                    return record
                else:
                    record.status = RecordStatus.BAD
                    record.error_message = (
                        f"材料名称不在白名单: '{record.material_name}'。"
                        f"已保留原始数据，请核对。"
                    )
                    return record

        try:
            parsed = self._parse_segments_from_csv_row(raw_dict)
            record.parsed_data = parsed
            record.status = RecordStatus.PENDING
        except DataQualityError as e:
            record.status = RecordStatus.BAD
            record.error_message = str(e)
        except Exception as e:
            record.status = RecordStatus.SKIPPED
            record.error_message = f"解析跳过: {str(e)}"

        return record

    def _parse_and_validate_json_record(self, record: MaterialRecord, item: Dict) -> MaterialRecord:
        if not record.material_name:
            record.status = RecordStatus.BAD
            record.error_message = "材料名称为空"
            return record

        if self.expected_material_names:
            if record.material_name not in self.expected_material_names:
                similar = self._find_similar_name(record.material_name)
                if similar:
                    record.status = RecordStatus.BAD
                    record.error_message = (
                        f"材料名称不匹配: 期望 '{similar}', 实际 '{record.material_name}'。"
                        f"请确认是否为同一材料后手动处理。"
                    )
                    return record
                else:
                    record.status = RecordStatus.BAD
                    record.error_message = (
                        f"材料名称不在白名单: '{record.material_name}'。"
                        f"已保留原始数据，请核对。"
                    )
                    return record

        try:
            parsed = self._parse_segments_from_json(item)
            record.parsed_data = parsed
            record.status = RecordStatus.PENDING
        except DataQualityError as e:
            record.status = RecordStatus.BAD
            record.error_message = str(e)
        except Exception as e:
            record.status = RecordStatus.SKIPPED
            record.error_message = f"解析跳过: {str(e)}"

        return record

    def _parse_segments_from_csv_row(self, raw_dict: Dict) -> Dict[str, Any]:
        segments = {}
        segment_keys = ["低温段", "中温段", "高温段"]

        for segment in segment_keys:
            points = []
            base_prefix = segment

            for i in range(1, 11):
                temp_key = f"{base_prefix}_温度{i}"
                res_key = f"{base_prefix}_电阻{i}"

                if temp_key in raw_dict and res_key in raw_dict:
                    temp_val = str(raw_dict[temp_key]).strip()
                    res_val = str(raw_dict[res_key]).strip()

                    if temp_val and res_val:
                        try:
                            temp_f = float(temp_val)
                            res_f = float(res_val)
                            points.append({
                                "温度": temp_f,
                                "电阻": res_f,
                                "原始温度": temp_val,
                                "原始电阻": res_val,
                            })
                        except ValueError:
                            points.append({
                                "温度": None,
                                "电阻": None,
                                "原始温度": temp_val,
                                "原始电阻": res_val,
                                "解析错误": "数值转换失败",
                            })

            if points:
                segments[segment] = points

        return segments

    def _parse_segments_from_json(self, item: Dict) -> Dict[str, Any]:
        segments = {}
        segment_keys = ["低温段", "中温段", "高温段"]

        for segment in segment_keys:
            if segment in item and isinstance(item[segment], list):
                parsed_points = []
                for p in item[segment]:
                    parsed_point = dict(p)
                    parsed_point["原始数据"] = dict(p) if self.preserve_raw else {}
                    parsed_points.append(parsed_point)
                segments[segment] = parsed_points

        return segments

    def _extract_or_generate(self, id_col: Optional[str], raw_dict: Dict, idx: int) -> str:
        if id_col and id_col in raw_dict and str(raw_dict[id_col]).strip():
            return str(raw_dict[id_col]).strip()
        return f"REC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{idx + 1:04d}"

    def _find_similar_name(self, name: str) -> Optional[str]:
        if not self.expected_material_names:
            return None

        name_normalized = self._normalize_name(name)
        for expected in self.expected_material_names:
            expected_normalized = self._normalize_name(expected)
            if name_normalized == expected_normalized:
                return expected
            if len(name_normalized) >= 3 and len(expected_normalized) >= 3:
                if name_normalized in expected_normalized or expected_normalized in name_normalized:
                    return expected
        return None

    @staticmethod
    def _normalize_name(name: str) -> str:
        import re
        result = re.sub(r"[\s\-_（）()【】\[\]，,、。.]", "", name)
        result = re.sub(r"[a-zA-Z]", "", result)
        return result.lower()

    def merge_records(self, existing: List[MaterialRecord], new: List[MaterialRecord]) -> Tuple[List[MaterialRecord], List[Dict]]:
        existing_by_id = {r.record_id: r for r in existing}
        existing_by_name = {r.material_name: r for r in existing}

        merged = list(existing)
        changes = []

        for record in new:
            if record.record_id in existing_by_id:
                old = existing_by_id[record.record_id]
                changes.append({
                    "type": "update",
                    "record_id": record.record_id,
                    "material_name": record.material_name,
                    "old_status": old.status.value,
                    "new_status": record.status.value,
                    "note": "同ID覆盖更新，原始数据已保留",
                })
                idx = merged.index(old)
                merged[idx] = record
            elif record.material_name in existing_by_name:
                similar = self._find_similar_name(record.material_name)
                changes.append({
                    "type": "potential_duplicate",
                    "record_id": record.record_id,
                    "material_name": record.material_name,
                    "existing_id": existing_by_name[record.material_name].record_id,
                    "note": (
                        f"名称疑似重复: 导入='{record.material_name}', "
                        f"已存在='{existing_by_name[record.material_name].material_name}'。"
                        f"已作为新记录加入，请确认是否需要合并。"
                    ),
                })
                merged.append(record)
            else:
                changes.append({
                    "type": "new",
                    "record_id": record.record_id,
                    "material_name": record.material_name,
                    "note": "新增材料记录",
                })
                merged.append(record)

        return merged, changes

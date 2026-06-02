from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from datetime import datetime
import json
import os
import uuid
import hashlib
import pandas as pd


class DataSource(Enum):
    USER_INPUT = "user_input"
    FILE_IMPORT = "file_import"
    API_IMPORT = "api_import"
    DERIVED = "derived"
    SYSTEM_DEFAULT = "system_default"


class DataCategory(Enum):
    DOSING_PLAN = "dosing_plan"
    PATIENT_PARAMETERS = "patient_parameters"
    DRUG_PARAMETERS = "drug_parameters"
    SAMPLING_POINTS = "sampling_points"
    SIMULATION_RESULT = "simulation_result"
    VALIDATION_REPORT = "validation_report"
    EXPORTED_REPORT = "exported_report"


@dataclass
class DataRecord:
    data_id: str
    category: DataCategory
    source: DataSource
    created_at: datetime
    updated_at: datetime
    content: Dict[str, Any]
    source_info: Dict[str, Any] = field(default_factory=dict)
    parent_ids: List[str] = field(default_factory=list)
    version: int = 1
    is_original: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "data_id": self.data_id,
            "category": self.category.value,
            "source": self.source.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "content": self.content,
            "source_info": self.source_info,
            "parent_ids": self.parent_ids,
            "version": self.version,
            "is_original": self.is_original,
            "metadata": self.metadata
        }

    def compute_hash(self) -> str:
        content_str = json.dumps(self.content, sort_keys=True, default=str)
        return hashlib.sha256(content_str.encode('utf-8')).hexdigest()


class DataManager:
    def __init__(self, raw_data_dir: str = "data/raw", processed_data_dir: str = "data/processed"):
        self.raw_data_dir = raw_data_dir
        self.processed_data_dir = processed_data_dir
        self._records: Dict[str, DataRecord] = {}
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        os.makedirs(self.raw_data_dir, exist_ok=True)
        os.makedirs(self.processed_data_dir, exist_ok=True)

    def import_data(self, category: DataCategory, content: Dict[str, Any],
                    source: DataSource = DataSource.USER_INPUT,
                    source_info: Optional[Dict[str, Any]] = None,
                    triggered_by: Optional[str] = None,
                    is_original: bool = True) -> str:
        data_id = str(uuid.uuid4())
        now = datetime.now()
        record = DataRecord(
            data_id=data_id,
            category=category,
            source=source,
            created_at=now,
            updated_at=now,
            content=content,
            source_info=source_info or {},
            is_original=is_original,
            metadata={
                "imported_by": triggered_by,
                "imported_at": now.isoformat()
            }
        )
        self._records[data_id] = record
        self._save_raw_data(record)
        return data_id

    def create_derived_data(self, category: DataCategory, content: Dict[str, Any],
                            parent_ids: List[str], source_info: Optional[Dict[str, Any]] = None,
                            triggered_by: Optional[str] = None) -> str:
        data_id = str(uuid.uuid4())
        now = datetime.now()
        record = DataRecord(
            data_id=data_id,
            category=category,
            source=DataSource.DERIVED,
            created_at=now,
            updated_at=now,
            content=content,
            source_info=source_info or {},
            parent_ids=parent_ids,
            is_original=False,
            metadata={
                "created_by": triggered_by,
                "created_at": now.isoformat(),
                "derivation_method": source_info.get("method", "unknown") if source_info else "unknown"
            }
        )
        self._records[data_id] = record
        self._save_processed_data(record)
        return data_id

    def update_data(self, data_id: str, content: Dict[str, Any],
                    triggered_by: Optional[str] = None,
                    update_note: str = "") -> None:
        if data_id not in self._records:
            raise ValueError(f"Data record not found: {data_id}")
        record = self._records[data_id]
        old_content = record.content
        record.content = content
        record.updated_at = datetime.now()
        record.version += 1
        record.metadata["previous_versions"] = record.metadata.get("previous_versions", [])
        record.metadata["previous_versions"].append({
            "version": record.version - 1,
            "content": old_content,
            "updated_at": record.updated_at.isoformat(),
            "updated_by": triggered_by,
            "note": update_note
        })
        if record.is_original:
            self._save_raw_data(record)
        else:
            self._save_processed_data(record)

    def get_data(self, data_id: str) -> Optional[DataRecord]:
        return self._records.get(data_id)

    def get_data_by_category(self, category: DataCategory,
                             include_derived: bool = True) -> List[DataRecord]:
        records = [r for r in self._records.values() if r.category == category]
        if not include_derived:
            records = [r for r in records if r.is_original]
        return sorted(records, key=lambda r: r.created_at, reverse=True)

    def get_data_lineage(self, data_id: str) -> List[Dict[str, Any]]:
        lineage = []
        visited = set()
        stack = [data_id]
        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue
            visited.add(current_id)
            record = self.get_data(current_id)
            if record:
                lineage.append({
                    "data_id": record.data_id,
                    "category": record.category.value,
                    "source": record.source.value,
                    "is_original": record.is_original,
                    "created_at": record.created_at.isoformat(),
                    "content_preview": self._preview_content(record.content),
                    "source_info": record.source_info
                })
                for parent_id in record.parent_ids:
                    stack.append(parent_id)
        return lineage

    def _preview_content(self, content: Dict[str, Any], max_items: int = 5) -> Dict[str, Any]:
        preview = {}
        for key, value in list(content.items())[:max_items]:
            if isinstance(value, list) and len(value) > max_items:
                preview[key] = f"[列表，长度={len(value)}，前{max_items}项: {value[:max_items]}...]"
            elif isinstance(value, dict) and len(value) > max_items:
                preview[key] = f"[字典，{len(value)}个键: {list(value.keys())[:max_items]}...]"
            else:
                preview[key] = value
        if len(content) > max_items:
            preview["..."] = f"还有 {len(content) - max_items} 个字段"
        return preview

    def _save_raw_data(self, record: DataRecord) -> None:
        filepath = os.path.join(self.raw_data_dir, f"{record.data_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(record.to_dict(), f, indent=2, ensure_ascii=False, default=str)

    def _save_processed_data(self, record: DataRecord) -> None:
        filepath = os.path.join(self.processed_data_dir, f"{record.data_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(record.to_dict(), f, indent=2, ensure_ascii=False, default=str)

    def list_original_data_sources(self) -> List[Dict[str, Any]]:
        originals = [r for r in self._records.values() if r.is_original]
        return [{
            "data_id": r.data_id,
            "category": r.category.value,
            "source": r.source.value,
            "created_at": r.created_at.isoformat(),
            "source_info": r.source_info,
            "imported_by": r.metadata.get("imported_by", "unknown")
        } for r in sorted(originals, key=lambda r: r.created_at, reverse=True)]

    def list_processed_results(self) -> List[Dict[str, Any]]:
        processed = [r for r in self._records.values() if not r.is_original]
        return [{
            "data_id": r.data_id,
            "category": r.category.value,
            "created_at": r.created_at.isoformat(),
            "parent_ids": r.parent_ids,
            "created_by": r.metadata.get("created_by", "unknown"),
            "derivation_method": r.metadata.get("derivation_method", "unknown")
        } for r in sorted(processed, key=lambda r: r.created_at, reverse=True)]

    def compare_versions(self, data_id: str, version1: int, version2: int) -> Dict[str, Any]:
        record = self.get_data(data_id)
        if not record:
            return {"error": "Record not found"}
        versions = record.metadata.get("previous_versions", [])
        v1_content = None
        v2_content = None
        if version1 == record.version:
            v1_content = record.content
        else:
            for v in versions:
                if v["version"] == version1:
                    v1_content = v["content"]
                    break
        if version2 == record.version:
            v2_content = record.content
        else:
            for v in versions:
                if v["version"] == version2:
                    v2_content = v["content"]
                    break
        if not v1_content or not v2_content:
            return {"error": "One or both versions not found"}
        differences = self._find_differences(v1_content, v2_content)
        return {
            "data_id": data_id,
            "versions": [version1, version2],
            "differences": differences
        }

    def _find_differences(self, d1: Dict[str, Any], d2: Dict[str, Any],
                          path: str = "") -> List[Dict[str, Any]]:
        differences = []
        all_keys = set(d1.keys()) | set(d2.keys())
        for key in all_keys:
            current_path = f"{path}.{key}" if path else key
            if key not in d1:
                differences.append({
                    "path": current_path,
                    "type": "added",
                    "value": d2[key]
                })
            elif key not in d2:
                differences.append({
                    "path": current_path,
                    "type": "removed",
                    "value": d1[key]
                })
            elif d1[key] != d2[key]:
                if isinstance(d1[key], dict) and isinstance(d2[key], dict):
                    differences.extend(self._find_differences(d1[key], d2[key], current_path))
                else:
                    differences.append({
                        "path": current_path,
                        "type": "modified",
                        "old_value": d1[key],
                        "new_value": d2[key]
                    })
        return differences

    def export_dataframe(self, data_ids: List[str]) -> pd.DataFrame:
        rows = []
        for data_id in data_ids:
            record = self.get_data(data_id)
            if record:
                row = {
                    "data_id": record.data_id,
                    "category": record.category.value,
                    "source": record.source.value,
                    "is_original": record.is_original,
                    "created_at": record.created_at.isoformat(),
                    "version": record.version
                }
                row.update(record.content)
                rows.append(row)
        return pd.DataFrame(rows)

    def delete_data(self, data_id: str, triggered_by: Optional[str] = None) -> bool:
        if data_id not in self._records:
            return False
        record = self._records[data_id]
        record.metadata["deleted"] = True
        record.metadata["deleted_at"] = datetime.now().isoformat()
        record.metadata["deleted_by"] = triggered_by
        filepath = os.path.join(
            self.raw_data_dir if record.is_original else self.processed_data_dir,
            f"{data_id}.json"
        )
        if os.path.exists(filepath):
            os.remove(filepath)
        del self._records[data_id]
        return True

    def get_data_statistics(self) -> Dict[str, Any]:
        stats = {
            "total_records": len(self._records),
            "by_category": {},
            "by_source": {},
            "original_count": len([r for r in self._records.values() if r.is_original]),
            "derived_count": len([r for r in self._records.values() if not r.is_original]),
            "raw_files": len(os.listdir(self.raw_data_dir)) if os.path.exists(self.raw_data_dir) else 0,
            "processed_files": len(os.listdir(self.processed_data_dir)) if os.path.exists(self.processed_data_dir) else 0
        }
        for category in DataCategory:
            stats["by_category"][category.value] = len(
                [r for r in self._records.values() if r.category == category]
            )
        for source in DataSource:
            stats["by_source"][source.value] = len(
                [r for r in self._records.values() if r.source == source]
            )
        return stats

    def import_from_file(self, filepath: str, category: DataCategory,
                         triggered_by: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        source_info = {
            "filename": os.path.basename(filepath),
            "filepath": filepath,
            "file_size": os.path.getsize(filepath),
            "import_timestamp": datetime.now().isoformat()
        }
        if filepath.endswith('.json'):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = json.load(f)
        elif filepath.endswith('.csv'):
            df = pd.read_csv(filepath)
            content = df.to_dict(orient='records')
            source_info["row_count"] = len(df)
            source_info["columns"] = list(df.columns)
        elif filepath.endswith('.xlsx'):
            df = pd.read_excel(filepath)
            content = df.to_dict(orient='records')
            source_info["row_count"] = len(df)
            source_info["columns"] = list(df.columns)
        else:
            raise ValueError(f"Unsupported file format: {filepath}")
        data_id = self.import_data(
            category=category,
            content=content,
            source=DataSource.FILE_IMPORT,
            source_info=source_info,
            triggered_by=triggered_by,
            is_original=True
        )
        return data_id, source_info

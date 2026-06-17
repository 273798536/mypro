"""数据持久化模块 - JSON 文件存储"""

import json
import os
from pathlib import Path
from typing import List, Optional, Dict
from .models import (
    Sample,
    AnnotationRecord,
    DatasetVersion,
    ValidationResult,
)


class SampleStore:
    """样本存储"""

    def __init__(self, samples_dir: str):
        self.samples_dir = Path(samples_dir)
        self.samples_dir.mkdir(parents=True, exist_ok=True)

    def _sample_path(self, sample_id: str) -> Path:
        return self.samples_dir / f"{sample_id}.json"

    def save(self, sample: Sample) -> None:
        path = self._sample_path(sample.sample_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(sample.to_dict(), f, ensure_ascii=False, indent=2)

    def load(self, sample_id: str) -> Optional[Sample]:
        path = self._sample_path(sample_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Sample.from_dict(data)

    def list_all(self) -> List[Sample]:
        samples = []
        for file_path in self.samples_dir.glob("*.json"):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            samples.append(Sample.from_dict(data))
        return samples

    def delete(self, sample_id: str) -> bool:
        path = self._sample_path(sample_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def count(self) -> int:
        return len(list(self.samples_dir.glob("*.json")))


class AnnotationStore:
    """标注记录存储"""

    def __init__(self, annotations_dir: str):
        self.annotations_dir = Path(annotations_dir)
        self.annotations_dir.mkdir(parents=True, exist_ok=True)

    def _annotation_path(self, annotation_id: str) -> Path:
        return self.annotations_dir / f"{annotation_id}.json"

    def save(self, annotation: AnnotationRecord) -> None:
        path = self._annotation_path(annotation.annotation_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(annotation.to_dict(), f, ensure_ascii=False, indent=2)

    def load(self, annotation_id: str) -> Optional[AnnotationRecord]:
        path = self._annotation_path(annotation_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return AnnotationRecord.from_dict(data)

    def list_by_sample(self, sample_id: str) -> List[AnnotationRecord]:
        annotations = []
        for file_path in self.annotations_dir.glob("*.json"):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("sample_id") == sample_id:
                annotations.append(AnnotationRecord.from_dict(data))
        return sorted(annotations, key=lambda a: a.created_at, reverse=True)

    def list_all(self) -> List[AnnotationRecord]:
        annotations = []
        for file_path in self.annotations_dir.glob("*.json"):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            annotations.append(AnnotationRecord.from_dict(data))
        return annotations

    def list_by_status(self, status: str) -> List[AnnotationRecord]:
        return [a for a in self.list_all() if a.status == status]


class VersionStore:
    """版本存储"""

    def __init__(self, versions_dir: str):
        self.versions_dir = Path(versions_dir)
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = self.versions_dir / "index.json"
        self._load_index()

    def _load_index(self):
        if self._index_path.exists():
            with open(self._index_path, "r", encoding="utf-8") as f:
                self._index = json.load(f)
        else:
            self._index = {"versions": []}

    def _save_index(self):
        with open(self._index_path, "w", encoding="utf-8") as f:
            json.dump(self._index, f, ensure_ascii=False, indent=2)

    def _version_path(self, version_id: str) -> Path:
        return self.versions_dir / f"version_{version_id}.json"

    def save(self, version: DatasetVersion) -> None:
        path = self._version_path(version.version_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(version.to_dict(), f, ensure_ascii=False, indent=2)

        version_names = {v["version_name"] for v in self._index["versions"]}
        if version.version_name not in version_names:
            self._index["versions"].append({
                "version_id": version.version_id,
                "version_name": version.version_name,
                "sample_count": version.sample_count,
                "created_at": version.created_at,
                "description": version.description,
            })
            self._save_index()

    def load(self, version_id: str) -> Optional[DatasetVersion]:
        path = self._version_path(version_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return DatasetVersion.from_dict(data)

    def load_by_name(self, version_name: str) -> Optional[DatasetVersion]:
        for entry in self._index["versions"]:
            if entry["version_name"] == version_name:
                return self.load(entry["version_id"])
        return None

    def list_all(self) -> List[dict]:
        return sorted(
            self._index["versions"],
            key=lambda v: v["created_at"],
            reverse=True,
        )

    def get_latest(self) -> Optional[dict]:
        versions = self.list_all()
        return versions[0] if versions else None


class ValidationResultStore:
    """校验结果存储"""

    def __init__(self, results_dir: str):
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def _result_path(self, sample_id: str) -> Path:
        return self.results_dir / f"result_{sample_id}.json"

    def save(self, result: ValidationResult) -> None:
        path = self._result_path(result.sample_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)

    def load(self, sample_id: str) -> Optional[ValidationResult]:
        path = self._result_path(sample_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return ValidationResult.from_dict(data)

    def list_all(self) -> List[ValidationResult]:
        results = []
        for file_path in self.results_dir.glob("result_*.json"):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            results.append(ValidationResult.from_dict(data))
        return results

    def list_by_status(self, status: str) -> List[ValidationResult]:
        return [r for r in self.list_all() if r.validation_status == status]

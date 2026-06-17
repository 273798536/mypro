import json
import hashlib
import os
import random
import string
from typing import List, Dict, Optional, Any
from datetime import datetime
from models import MultimodalSample, CheckResult, VersionRecord
from checker import MultimodalChecker


class VersionTracker:
    def __init__(self, storage_path: str = "./version_history"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
        self.versions: Dict[str, VersionRecord] = {}
        self._load_history()

    def _load_history(self):
        for filename in os.listdir(self.storage_path):
            if not filename.endswith(".json"):
                continue
            filepath = os.path.join(self.storage_path, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.versions[data["version_id"]] = self._dict_to_version(data)
            except Exception:
                pass

    def _dict_to_version(self, data: Dict) -> VersionRecord:
        from models import CheckIssue, SampleStatus, CheckType

        check_results: Dict[str, CheckResult] = {}
        for sid, res_data in data.get("check_results", {}).items():
            issues = []
            for issue_data in res_data.get("issues", []):
                issues.append(
                    CheckIssue(
                        check_type=CheckType(issue_data["check_type"]),
                        severity=issue_data["severity"],
                        message=issue_data["message"],
                        details=issue_data.get("details", {}),
                    )
                )
            check_results[sid] = CheckResult(
                sample_id=res_data["sample_id"],
                status=SampleStatus(res_data["status"]),
                issues=issues,
                checked_at=res_data.get("checked_at", ""),
                manual_note=res_data.get("manual_note"),
            )

        samples: Dict[str, MultimodalSample] = {}
        for sid, s_data in data.get("samples", {}).items():
            samples[sid] = MultimodalSample(
                sample_id=s_data.get("sample_id", sid),
                text_content=s_data.get("text_content", ""),
                image_paths=s_data.get("image_paths", []),
                category=s_data.get("category", ""),
                source=s_data.get("source", ""),
                created_at=s_data.get("created_at", ""),
                manual_note=s_data.get("manual_note"),
                metadata=s_data.get("metadata", {}),
            )

        return VersionRecord(
            version_id=data["version_id"],
            parent_version_id=data.get("parent_version_id"),
            timestamp=data.get("timestamp", ""),
            sample_ids=data.get("sample_ids", []),
            check_results=check_results,
            samples=samples,
            description=data.get("description", ""),
        )

    def _save_version(self, version: VersionRecord):
        filepath = os.path.join(
            self.storage_path, f"{version.version_id}.json"
        )
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(version.to_dict(), f, ensure_ascii=False, indent=2)
        self.versions[version.version_id] = version

    def _generate_version_id(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = "".join(
            random.choices(string.ascii_lowercase + string.digits, k=4)
        )
        return f"v{timestamp}_{random_suffix}"

    def _build_samples_dict(
        self, samples: List[MultimodalSample]
    ) -> Dict[str, MultimodalSample]:
        d: Dict[str, MultimodalSample] = {}
        for s in samples:
            if s.sample_id:
                d[s.sample_id] = s
        return d

    def create_initial_version(
        self,
        samples: List[MultimodalSample],
        checker: MultimodalChecker,
        description: str = "初始版本",
    ) -> VersionRecord:
        version_id = self._generate_version_id()
        check_results = checker.check_all(samples)
        sample_ids = sorted([sid for sid in check_results.keys() if sid])
        samples_dict = self._build_samples_dict(samples)

        version = VersionRecord(
            version_id=version_id,
            parent_version_id=None,
            timestamp=datetime.now().isoformat(),
            sample_ids=sample_ids,
            check_results=check_results,
            samples=samples_dict,
            description=description,
        )

        self._save_version(version)
        return version

    def create_new_version(
        self,
        parent_version_id: str,
        all_samples: List[MultimodalSample],
        checker: MultimodalChecker,
        description: str = "",
    ) -> Optional[VersionRecord]:
        if parent_version_id not in self.versions:
            return None

        version_id = self._generate_version_id()
        check_results = checker.check_all(all_samples)
        sample_ids = sorted([sid for sid in check_results.keys() if sid])
        samples_dict = self._build_samples_dict(all_samples)

        version = VersionRecord(
            version_id=version_id,
            parent_version_id=parent_version_id,
            timestamp=datetime.now().isoformat(),
            sample_ids=sample_ids,
            check_results=check_results,
            samples=samples_dict,
            description=description,
        )

        self._save_version(version)
        return version

    def supplement_samples(
        self,
        parent_version_id: str,
        override_samples: List[MultimodalSample],
        checker: MultimodalChecker,
        description: str = "",
    ) -> Optional[VersionRecord]:
        parent = self.versions.get(parent_version_id)
        if not parent:
            return None

        base_samples = list(parent.samples.values())
        merged_map: Dict[str, MultimodalSample] = {}
        for s in base_samples:
            if s.sample_id:
                merged_map[s.sample_id] = s
        for s in override_samples:
            if s.sample_id:
                merged_map[s.sample_id] = s

        merged_list = list(merged_map.values())
        return self.create_new_version(
            parent_version_id=parent_version_id,
            all_samples=merged_list,
            checker=checker,
            description=description or "训练样本补录",
        )

    def get_version(self, version_id: str) -> Optional[VersionRecord]:
        return self.versions.get(version_id)

    def get_latest_version(self) -> Optional[VersionRecord]:
        if not self.versions:
            return None
        return max(self.versions.values(), key=lambda v: v.timestamp)

    def get_version_chain(self, version_id: str) -> List[VersionRecord]:
        chain = []
        current = self.versions.get(version_id)
        while current:
            chain.append(current)
            current = (
                self.versions.get(current.parent_version_id)
                if current.parent_version_id
                else None
            )
        return list(reversed(chain))

    def compare_versions(
        self, version_id_1: str, version_id_2: str
    ) -> Dict[str, Any]:
        v1 = self.versions.get(version_id_1)
        v2 = self.versions.get(version_id_2)
        if not v1 or not v2:
            return {}

        s1 = set(sid for sid in v1.sample_ids if sid)
        s2 = set(sid for sid in v2.sample_ids if sid)

        added = sorted(s2 - s1)
        removed = sorted(s1 - s2)
        common = s1 & s2

        updated: List[str] = []
        status_changed: List[str] = []
        issues_changed: List[str] = []

        for sid in sorted(common):
            r1 = v1.check_results[sid]
            r2 = v2.check_results[sid]
            s1_data = v1.samples.get(sid)
            s2_data = v2.samples.get(sid)

            data_changed = False
            if s1_data and s2_data:
                if (
                    len(s1_data.image_paths) != len(s2_data.image_paths)
                    or s1_data.category != s2_data.category
                    or s1_data.text_content != s2_data.text_content
                ):
                    data_changed = True

            if data_changed:
                updated.append(sid)
            if r1.status != r2.status:
                status_changed.append(sid)
            if len(r1.issues) != len(r2.issues):
                issues_changed.append(sid)

        return {
            "added": added,
            "removed": removed,
            "updated": updated,
            "status_changed": status_changed,
            "issues_changed": issues_changed,
            "total_v1": len(s1),
            "total_v2": len(s2),
        }

    def compute_data_signature(
        self, check_results: Dict[str, CheckResult]
    ) -> str:
        data_str = json.dumps(
            {sid: res.to_dict() for sid, res in sorted(check_results.items())},
            sort_keys=True,
            ensure_ascii=False,
        )
        return hashlib.sha256(data_str.encode("utf-8")).hexdigest()[:16]

    def list_all_versions(self) -> List[Dict[str, str]]:
        return [
            {
                "version_id": v.version_id,
                "timestamp": v.timestamp,
                "sample_count": len(v.sample_ids),
                "description": v.description,
                "parent": v.parent_version_id,
            }
            for v in sorted(self.versions.values(), key=lambda x: x.timestamp)
        ]

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from copy import deepcopy

from .models import ParameterRecord, ParameterVersion


class ParameterVersionManager:
    def __init__(self):
        self._versions: Dict[int, ParameterVersion] = {}
        self._current_version: int = 0
        self._change_log: List[Dict] = []

    @property
    def current_version(self) -> int:
        return self._current_version

    @property
    def version_count(self) -> int:
        return len(self._versions)

    def get_version(self, version: int) -> Optional[ParameterVersion]:
        return self._versions.get(version)

    def get_all_versions(self) -> List[ParameterVersion]:
        return [self._versions[v] for v in sorted(self._versions.keys())]

    def create_initial_version(
        self,
        records: List[ParameterRecord],
        source_note: str = "初始参数表",
    ) -> ParameterVersion:
        version = 1
        version_obj = ParameterVersion(
            version=version,
            records={r.record_id: r for r in records},
            supplement_note=source_note,
            is_supplement=False,
            base_version=None,
        )
        self._versions[version] = version_obj
        self._current_version = version
        self._log_change(version, "create_initial", source_note, len(records))
        return version_obj

    def supplement_records(
        self,
        new_records: List[ParameterRecord],
        supplement_note: str,
        base_version: Optional[int] = None,
    ) -> ParameterVersion:
        """
        补充参数记录，生成新版本。
        不会覆盖旧版本的判断，而是创建新版本并保留追溯链。
        """
        if base_version is None:
            base_version = self._current_version

        base = self._versions.get(base_version)
        if base is None:
            raise ValueError(f"基准版本 v{base_version} 不存在")

        new_version_num = self._current_version + 1

        merged_records = dict(base.records)
        added_count = 0
        updated_count = 0
        conflict_ids = []

        for record in new_records:
            rid = record.record_id
            if rid in merged_records:
                old = merged_records[rid]
                if old.params != record.params:
                    updated_count += 1
                    conflict_ids.append(rid)
                    record.remark = (
                        f"[由v{base_version}更新] 原值: "
                        f"{self._format_params_old(old.params)}; "
                        f"{record.remark}"
                    ).strip()
            else:
                added_count += 1
            merged_records[rid] = record

        version_obj = ParameterVersion(
            version=new_version_num,
            records=merged_records,
            supplement_note=supplement_note,
            is_supplement=True,
            base_version=base_version,
        )

        self._versions[new_version_num] = version_obj
        self._current_version = new_version_num

        self._log_change(
            new_version_num,
            "supplement",
            supplement_note,
            added=added_count,
            updated=updated_count,
            base_version=base_version,
            conflict_ids=conflict_ids,
        )

        return version_obj

    def update_single_record(
        self,
        record_id: str,
        new_params: Dict[str, float],
        update_note: str,
        source: str = "",
    ) -> ParameterVersion:
        """
        更新单条记录，生成新版本。
        保留旧值追溯，不会无声覆盖。
        """
        base_version = self._current_version
        base = self._versions.get(base_version)
        if base is None:
            raise ValueError("当前没有可用版本")

        if record_id not in base.records:
            raise ValueError(f"记录 {record_id} 不存在")

        old_record = base.records[record_id]
        old_params = dict(old_record.params)

        new_record = ParameterRecord(
            record_id=record_id,
            params=new_params,
            source=source or old_record.source,
            detail_ref=old_record.detail_ref,
            remark=(
                f"[由v{base_version}人工改判] 旧参数: "
                f"{self._format_params_old(old_params)}; {update_note}"
            ).strip(),
        )

        new_version_num = self._current_version + 1
        new_records = dict(base.records)
        new_records[record_id] = new_record

        version_obj = ParameterVersion(
            version=new_version_num,
            records=new_records,
            supplement_note=f"人工改判：{update_note}",
            is_supplement=True,
            base_version=base_version,
        )

        self._versions[new_version_num] = version_obj
        self._current_version = new_version_num

        self._log_change(
            new_version_num,
            "manual_update",
            update_note,
            record_id=record_id,
            base_version=base_version,
        )

        return version_obj

    def compare_versions(
        self, version_a: int, version_b: int
    ) -> Dict:
        va = self._versions.get(version_a)
        vb = self._versions.get(version_b)
        if va is None or vb is None:
            raise ValueError("版本不存在")

        ids_a = set(va.records.keys())
        ids_b = set(vb.records.keys())

        added = ids_b - ids_a
        removed = ids_a - ids_b
        common = ids_a & ids_b

        changed = []
        for rid in common:
            if va.records[rid].params != vb.records[rid].params:
                changed.append(rid)

        return {
            "version_a": version_a,
            "version_b": version_b,
            "added_count": len(added),
            "added_ids": sorted(added),
            "removed_count": len(removed),
            "removed_ids": sorted(removed),
            "changed_count": len(changed),
            "changed_ids": sorted(changed),
            "common_count": len(common),
        }

    def get_record_history(self, record_id: str) -> List[Dict]:
        history = []
        for version_num in sorted(self._versions.keys()):
            version = self._versions[version_num]
            if record_id in version.records:
                record = version.records[record_id]
                history.append({
                    "version": version_num,
                    "params": dict(record.params),
                    "remark": record.remark,
                    "source": record.source,
                    "created_at": record.created_at.isoformat(),
                })
        return history

    def get_change_log(self) -> List[Dict]:
        return list(self._change_log)

    def _log_change(self, version: int, change_type: str, note: str, count: int = 0, **kwargs):
        entry = {
            "version": version,
            "change_type": change_type,
            "note": note,
            "record_count": count,
            "timestamp": datetime.now().isoformat(),
        }
        entry.update(kwargs)
        self._change_log.append(entry)

    def _format_params_old(self, params: Dict[str, float]) -> str:
        return ", ".join(f"{k}={v:.4f}" for k, v in sorted(params.items()))

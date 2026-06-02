from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Optional

from .models import AuditVersion, ProbConfig, Severity
from .prob_validator import ProbValidator


class VersionManager:
    def __init__(self, store_dir: str) -> None:
        self.store_dir = store_dir
        os.makedirs(store_dir, exist_ok=True)

    def _version_path(self, version_id: str) -> str:
        return os.path.join(self.store_dir, f"{version_id}.json")

    def save(self, version: AuditVersion) -> str:
        path = self._version_path(version.version_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(version.to_dict(), f, ensure_ascii=False, indent=2)
        return path

    def load(self, version_id: str) -> Optional[AuditVersion]:
        path = self._version_path(version_id)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return AuditVersion.from_dict(data)

    def list_versions(self) -> list[dict]:
        versions = []
        for fname in sorted(os.listdir(self.store_dir)):
            if fname.endswith(".json"):
                path = os.path.join(self.store_dir, fname)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    versions.append(
                        {
                            "version_id": data["version_id"],
                            "created_at": data["created_at"],
                            "issue_count": len(data.get("issues", [])),
                            "supplemental_for": data.get("supplemental_for"),
                            "filter_applied": data.get("filter_applied", {}),
                        }
                    )
                except (json.JSONDecodeError, KeyError):
                    continue
        return versions

    def create_supplemental(
        self,
        base_version_id: str,
        supplemental_configs: list[ProbConfig],
        new_issues: list,
        new_snapshots: list,
        pity_rules: list,
        filter_applied: dict,
    ) -> AuditVersion:
        base = self.load(base_version_id)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        version_id = f"{base_version_id}_supp_{ts}"

        merged_configs = list(base.prob_configs) if base else []
        existing_pool_ids = {c.pool_id for c in merged_configs}
        replaced_pool_ids: set[str] = set()
        for cfg in supplemental_configs:
            if cfg.pool_id in existing_pool_ids:
                idx = next(
                    i for i, c in enumerate(merged_configs) if c.pool_id == cfg.pool_id
                )
                merged_configs[idx] = cfg
                replaced_pool_ids.add(cfg.pool_id)
            else:
                merged_configs.append(cfg)

        revalidated_prob_issues: list = []
        if replaced_pool_ids and base:
            prob_categories = {"概率未归一", "概率为负", "概率为零", "物品重复"}
            kept_base_issues = [
                iss for iss in base.issues
                if iss.category not in prob_categories or iss.pool_id not in replaced_pool_ids
            ]
            replaced_configs = [c for c in merged_configs if c.pool_id in replaced_pool_ids]
            validator = ProbValidator(replaced_configs)
            revalidated_prob_issues = validator.validate()
            merged_issues = kept_base_issues + revalidated_prob_issues
        else:
            merged_issues = list(base.issues) if base else []
            merged_issues.extend(new_issues)

        pity_categories = {"保底超限", "保底异常重置", "缺少保底规则"}
        pity_issues_from_new = [i for i in new_issues if i.category in pity_categories]
        merged_issues.extend(pity_issues_from_new)

        merged_snapshots = list(base.pity_snapshots) if base else []
        merged_snapshots.extend(new_snapshots)

        version = AuditVersion(
            version_id=version_id,
            created_at=datetime.now().isoformat(),
            prob_configs=merged_configs,
            pity_rules=pity_rules,
            issues=merged_issues,
            pity_snapshots=merged_snapshots,
            supplemental_for=base_version_id,
            filter_applied=filter_applied,
        )
        self.save(version)
        return version

    def get_version_chain(self, version_id: str) -> list[AuditVersion]:
        chain = []
        current = self.load(version_id)
        while current:
            chain.append(current)
            if current.supplemental_for:
                current = self.load(current.supplemental_for)
            else:
                break
        chain.reverse()
        return chain

    def compare_with_base(self, version_id: str) -> Optional[dict]:
        version = self.load(version_id)
        if not version or not version.supplemental_for:
            return None
        base = self.load(version.supplemental_for)
        if not base:
            return None

        base_issues_by_cat: dict[str, int] = {}
        for iss in base.issues:
            base_issues_by_cat[iss.category] = base_issues_by_cat.get(iss.category, 0) + 1

        new_issues_by_cat: dict[str, int] = {}
        for iss in version.issues:
            if iss not in base.issues:
                new_issues_by_cat[iss.category] = new_issues_by_cat.get(iss.category, 0) + 1

        base_pool_ids = {c.pool_id for c in base.prob_configs}
        new_pool_ids = {c.pool_id for c in version.prob_configs} - base_pool_ids
        updated_pool_ids = {
            c.pool_id
            for c in version.prob_configs
            if c.pool_id in base_pool_ids
            and any(
                c.pool_id == bc.pool_id and c.version != bc.version
                for bc in base.prob_configs
            )
        }

        return {
            "base_version": base.version_id,
            "supplemental_version": version.version_id,
            "new_pools": sorted(new_pool_ids),
            "updated_pools": sorted(updated_pool_ids),
            "base_issue_summary": base_issues_by_cat,
            "new_issue_summary": new_issues_by_cat,
            "base_issue_count": len(base.issues),
            "current_issue_count": len(version.issues),
        }

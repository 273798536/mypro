from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

from .models import (
    ChangeAudit,
    ChangeType,
    ConfigSource,
    GrayscaleConfig,
    GrayscaleFeature,
)


class ConfigLoader:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.change_history: List[ChangeAudit] = []
        self.loaded_configs: Dict[str, GrayscaleConfig] = {}

    def load_grayscale_config(
        self,
        config_file: str,
        config_source: ConfigSource = ConfigSource.GRAYSCALE,
        is_partial: bool = False,
        parent_config_id: Optional[str] = None,
    ) -> Tuple[GrayscaleConfig, List[ChangeAudit]]:
        config_path = self.base_dir / config_file
        if not config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_path}")

        with open(config_path, "r", encoding="utf-8") as f:
            raw_data = yaml.safe_load(f)

        config_id = f"cfg_{uuid.uuid4().hex[:8]}"
        version = raw_data.get("version", "1.0")

        features: List[GrayscaleFeature] = []
        changes: List[ChangeAudit] = []

        for idx, feat_data in enumerate(raw_data.get("features", []), start=2):
            feature = self._parse_feature(
                feat_data, config_file, idx, config_source
            )
            features.append(feature)

            if parent_config_id and parent_config_id in self.loaded_configs:
                parent_cfg = self.loaded_configs[parent_config_id]
                existing = parent_cfg.get_feature(feature.feature_id)
                if existing:
                    changes.extend(
                        self._compare_and_audit(
                            existing, feature, config_file, idx
                        )
                    )

        config = GrayscaleConfig(
            config_id=config_id,
            version=version,
            source_file=config_file,
            features=features,
            is_partial=is_partial,
            parent_config_id=parent_config_id,
        )

        self.loaded_configs[config_id] = config
        self.change_history.extend(changes)

        return config, changes

    def load_incremental(
        self,
        config_file: str,
        base_config_id: str,
    ) -> Tuple[GrayscaleConfig, List[ChangeAudit]]:
        if base_config_id not in self.loaded_configs:
            raise ValueError(f"基础配置不存在: {base_config_id}")

        return self.load_grayscale_config(
            config_file=config_file,
            config_source=ConfigSource.INCREMENTAL,
            is_partial=True,
            parent_config_id=base_config_id,
        )

    def merge_configs(
        self, base_config_id: str, incremental_config_id: str
    ) -> Tuple[GrayscaleConfig, List[ChangeAudit]]:
        if base_config_id not in self.loaded_configs:
            raise ValueError(f"基础配置不存在: {base_config_id}")
        if incremental_config_id not in self.loaded_configs:
            raise ValueError(f"增量配置不存在: {incremental_config_id}")

        base = self.loaded_configs[base_config_id]
        incr = self.loaded_configs[incremental_config_id]

        merged_features: Dict[str, GrayscaleFeature] = {}
        changes: List[ChangeAudit] = []

        for f in base.features:
            merged_features[f.feature_id] = f.model_copy()

        for incr_feat in incr.features:
            fid = incr_feat.feature_id
            if fid in merged_features:
                existing = merged_features[fid]
                feature_changes = self._compare_and_audit(
                    existing,
                    incr_feat,
                    incr.source_file,
                    incr_feat.source_line or 0,
                )
                changes.extend(feature_changes)

                if incr_feat.threshold is not None:
                    existing.threshold = incr_feat.threshold
                    existing.updated_at = datetime.now()
                if incr_feat.sample_ids:
                    existing.sample_ids = list(
                        set(existing.sample_ids + incr_feat.sample_ids)
                    )
                    existing.updated_at = datetime.now()
                if incr_feat.notes:
                    existing.notes = incr_feat.notes
                    existing.updated_at = datetime.now()
            else:
                merged_features[fid] = incr_feat.model_copy()
                changes.append(
                    ChangeAudit(
                        audit_id=f"audit_{uuid.uuid4().hex[:8]}",
                        feature_id=fid,
                        change_type=ChangeType.CONFIG_UPDATE,
                        old_value=None,
                        new_value=incr_feat.model_dump(),
                        source=ConfigSource.INCREMENTAL,
                        source_file=incr.source_file,
                        source_line=incr_feat.source_line,
                        reason="新增特征配置",
                        is_overwrite=False,
                    )
                )

        merged_config = GrayscaleConfig(
            config_id=f"cfg_{uuid.uuid4().hex[:8]}",
            version=f"{base.version}+{incr.version}",
            source_file=f"{base.source_file}+{incr.source_file}",
            features=list(merged_features.values()),
            is_partial=False,
            parent_config_id=base_config_id,
        )

        self.loaded_configs[merged_config.config_id] = merged_config
        self.change_history.extend(changes)

        return merged_config, changes

    def _parse_feature(
        self,
        data: Dict[str, Any],
        source_file: str,
        source_line: int,
        config_source: ConfigSource,
    ) -> GrayscaleFeature:
        return GrayscaleFeature(
            feature_id=data["feature_id"],
            feature_name=data.get("feature_name", data["feature_id"]),
            threshold=data.get("threshold"),
            sample_ids=data.get("sample_ids", []),
            source_line=source_line,
            source_file=source_file,
            config_source=config_source,
            notes=data.get("notes"),
        )

    def _compare_and_audit(
        self,
        old: GrayscaleFeature,
        new: GrayscaleFeature,
        source_file: str,
        source_line: int,
    ) -> List[ChangeAudit]:
        changes: List[ChangeAudit] = []

        if old.threshold != new.threshold and new.threshold is not None:
            changes.append(
                ChangeAudit(
                    audit_id=f"audit_{uuid.uuid4().hex[:8]}",
                    feature_id=new.feature_id,
                    change_type=ChangeType.THRESHOLD,
                    old_value=old.threshold,
                    new_value=new.threshold,
                    source=new.config_source,
                    source_file=source_file,
                    source_line=source_line,
                    reason=f"灰度配置更新: {new.notes or '无说明'}",
                    is_overwrite=old.threshold is not None,
                )
            )

        old_samples = set(old.sample_ids)
        new_samples = set(new.sample_ids)
        if new_samples and old_samples != new_samples:
            added = new_samples - old_samples
            removed = old_samples - new_samples
            changes.append(
                ChangeAudit(
                    audit_id=f"audit_{uuid.uuid4().hex[:8]}",
                    feature_id=new.feature_id,
                    change_type=ChangeType.SAMPLE,
                    old_value=sorted(old_samples),
                    new_value=sorted(new_samples),
                    source=new.config_source,
                    source_file=source_file,
                    source_line=source_line,
                    reason=f"样本变化: +{len(added)}/-{len(removed)}",
                    is_overwrite=bool(old_samples),
                )
            )

        return changes

    def get_feature_traceability(
        self, config_id: str, feature_id: str
    ) -> List[Dict[str, Any]]:
        trace = []
        if config_id not in self.loaded_configs:
            return trace

        config = self.loaded_configs[config_id]
        feature = config.get_feature(feature_id)
        if not feature:
            return trace

        trace.append(
            {
                "config_id": config_id,
                "version": config.version,
                "source_file": feature.source_file,
                "source_line": feature.source_line,
                "config_source": feature.config_source,
                "value": {
                    "threshold": feature.threshold,
                    "sample_ids": feature.sample_ids,
                },
                "updated_at": feature.updated_at,
            }
        )

        parent_id = config.parent_config_id
        while parent_id and parent_id in self.loaded_configs:
            parent = self.loaded_configs[parent_id]
            parent_feature = parent.get_feature(feature_id)
            if parent_feature:
                trace.append(
                    {
                        "config_id": parent_id,
                        "version": parent.version,
                        "source_file": parent_feature.source_file,
                        "source_line": parent_feature.source_line,
                        "config_source": parent_feature.config_source,
                        "value": {
                            "threshold": parent_feature.threshold,
                            "sample_ids": parent_feature.sample_ids,
                        },
                        "updated_at": parent_feature.updated_at,
                    }
                )
            parent_id = parent.parent_config_id

        return trace

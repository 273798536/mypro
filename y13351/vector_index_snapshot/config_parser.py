from typing import Any, Dict, List, Optional, Tuple
import uuid
from .models import GrayConfig


class GrayConfigParser:
    STANDARD_FIELDS = {
        "threshold": ["阈值", "thresh", "threshold_value", "score_threshold", "pass_threshold"],
        "small_sample_size": ["小样本量", "min_sample_size", "sample_threshold", "n_min", "min_samples"],
        "mean_mask_ratio": ["均值覆盖比", "mask_ratio", "mean_cover_ratio", "coverage_ratio"],
        "index_version": ["索引版本", "version", "vector_version", "idx_version"],
        "feature_list": ["特征列表", "features", "feature_cols", "feature_names"],
        "model_version": ["模型版本", "model_ver", "ml_version"],
    }

    def __init__(self):
        self.parsed_sources: List[GrayConfig] = []
        self.source_counters: Dict[str, int] = {}

    def parse(
        self,
        raw_config: Dict[str, Any],
        source_type: str = "manual",
        source_id: Optional[str] = None,
        source_line: Optional[int] = None,
        source_object_path: Optional[str] = None,
        version_tag: Optional[str] = None,
    ) -> GrayConfig:
        if source_id is None:
            source_id = self._generate_source_id(source_type)

        normalized_config: Dict[str, Any] = {}
        field_mapping: Dict[str, str] = {}

        for standard_name, aliases in self.STANDARD_FIELDS.items():
            found_key, found_value = self._find_by_aliases(raw_config, aliases)
            if found_key is not None:
                normalized_config[standard_name] = found_value
                field_mapping[found_key] = standard_name

        for key, value in raw_config.items():
            if key not in field_mapping:
                normalized_key = self._normalize_key_name(key)
                normalized_config[normalized_key] = value
                field_mapping[key] = normalized_key

        config = GrayConfig(
            source_id=source_id,
            source_type=source_type,
            raw_config=raw_config.copy(),
            normalized_config=normalized_config,
            field_mapping=field_mapping,
            source_line=source_line,
            source_object_path=source_object_path,
            version_tag=version_tag,
        )

        self.parsed_sources.append(config)
        return config

    def parse_batch(
        self,
        configs: List[Dict[str, Any]],
        source_type: str = "batch",
        base_source_id: Optional[str] = None,
    ) -> List[GrayConfig]:
        results = []
        base_id = base_source_id or self._generate_source_id(source_type)

        for idx, raw_config in enumerate(configs):
            source_id = f"{base_id}_{idx}"
            config = self.parse(
                raw_config=raw_config,
                source_type=source_type,
                source_id=source_id,
                source_line=idx + 1,
                source_object_path=f"[{idx}]",
            )
            results.append(config)

        return results

    def get_relationship_report(self, config: GrayConfig) -> Dict[str, Any]:
        rel_map = self._extract_masking_relationship(config)
        return {
            "source_id": config.source_id,
            "source_line": config.source_line,
            "small_sample_size": rel_map.get("small_sample_size"),
            "mean_mask_ratio": rel_map.get("mean_mask_ratio"),
            "threshold": rel_map.get("threshold"),
            "masking_condition": self._describe_masking_condition(rel_map),
            "raw_field_references": self._get_raw_field_refs(config, rel_map),
        }

    def _find_by_aliases(
        self, raw_config: Dict[str, Any], aliases: List[str]
    ) -> Tuple[Optional[str], Optional[Any]]:
        for key, value in raw_config.items():
            for alias in aliases:
                if key.lower() == alias.lower() or key == alias:
                    return key, value
        return None, None

    def _normalize_key_name(self, key: str) -> str:
        key_lower = key.lower()
        for standard_name, aliases in self.STANDARD_FIELDS.items():
            if key_lower in [a.lower() for a in aliases]:
                return standard_name
        return key_lower.replace(" ", "_").replace("-", "_")

    def _generate_source_id(self, source_type: str) -> str:
        count = self.source_counters.get(source_type, 0)
        self.source_counters[source_type] = count + 1
        short_uuid = str(uuid.uuid4())[:8]
        return f"{source_type}_{count}_{short_uuid}"

    def _extract_masking_relationship(self, config: GrayConfig) -> Dict[str, Any]:
        nc = config.normalized_config
        return {
            "small_sample_size": nc.get("small_sample_size"),
            "mean_mask_ratio": nc.get("mean_mask_ratio"),
            "threshold": nc.get("threshold"),
            "index_version": nc.get("index_version"),
        }

    def _describe_masking_condition(self, rel_map: Dict[str, Any]) -> str:
        parts = []
        if rel_map.get("small_sample_size") is not None:
            parts.append(f"样本量 < {rel_map['small_sample_size']}")
        if rel_map.get("mean_mask_ratio") is not None:
            parts.append(f"均值覆盖比 >= {rel_map['mean_mask_ratio']}")
        if not parts:
            return "未配置小样本均值掩盖条件"
        return " 且 ".join(parts) + " 时，小样本将被均值盖住"

    def _get_raw_field_refs(self, config: GrayConfig, rel_map: Dict[str, Any]) -> Dict[str, str]:
        refs = {}
        for norm_key in ["small_sample_size", "mean_mask_ratio", "threshold"]:
            if norm_key in config.normalized_config:
                raw_field = config.get_raw_field(norm_key)
                if raw_field:
                    raw_name, raw_value = raw_field
                    location = f"行{config.source_line}" if config.source_line else "未知行"
                    refs[norm_key] = f"原始字段名='{raw_name}', 值={raw_value}, 来源{location}"
        return refs

    def get_config_by_source_line(self, source_line: int) -> Optional[GrayConfig]:
        for config in self.parsed_sources:
            if config.source_line == source_line:
                return config
        return None

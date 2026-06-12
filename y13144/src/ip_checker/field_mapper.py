"""字段映射管理器 - 处理复核人不同字段名的问题，保住来源和处理状态"""

from typing import Dict, List, Optional, Any
import pandas as pd
from .models import FieldMapping, DataSource, ProcessingStatus


class FieldMapper:
    def __init__(self):
        self._mappings: List[FieldMapping] = []
        self._init_default_mappings()

    def _init_default_mappings(self):
        default_mappings = [
            ("项目编码", "project_code", DataSource.DRAFT_A),
            ("项目编号", "project_code", DataSource.DRAFT_B),
            ("编号", "project_code", DataSource.DRAFT_C),
            ("项目名称", "project_name", DataSource.DRAFT_A),
            ("名称", "project_name", DataSource.DRAFT_B),
            ("工程量", "quantity", DataSource.DRAFT_A),
            ("数量", "quantity", DataSource.DRAFT_B),
            ("工作量", "quantity", DataSource.DRAFT_C),
            ("单位", "unit", DataSource.DRAFT_A),
            ("计量单位", "unit", DataSource.DRAFT_B),
            ("单价", "unit_price", DataSource.DRAFT_A),
            ("综合单价", "unit_price", DataSource.DRAFT_B),
            ("价格", "unit_price", DataSource.DRAFT_C),
            ("合价", "total_price", DataSource.DRAFT_A),
            ("总价", "total_price", DataSource.DRAFT_B),
            ("金额", "total_price", DataSource.DRAFT_C),
            ("单位元", "unit_price", DataSource.SYSTEM_EXPORT),
            ("单位万元", "unit_price", DataSource.SYSTEM_EXPORT),
            ("税率", "tax_rate", DataSource.DRAFT_A),
            ("增值税率", "tax_rate", DataSource.DRAFT_B),
        ]
        for src, std, ds in default_mappings:
            self._mappings.append(FieldMapping(src, std, ds))

    def add_mapping(self, mapping: FieldMapping):
        self._mappings.append(mapping)

    def map_dataframe(
        self,
        df: pd.DataFrame,
        data_source: DataSource,
        context_id: str
    ) -> tuple[pd.DataFrame, List[Dict[str, Any]], List[Dict[str, Any]]]:
        mapping_log = []
        status_log = []

        result_df = pd.DataFrame()
        result_df["_source"] = data_source.value
        result_df["_processing_status"] = ProcessingStatus.RAW.value
        result_df["_context_id"] = context_id

        for col in df.columns:
            mapping = self._find_mapping(col, data_source)
            if mapping:
                result_df[mapping.standard_field] = df[col]
                result_df[f"_src_{mapping.standard_field}"] = col
                mapping_log.append({
                    "source_field": col,
                    "standard_field": mapping.standard_field,
                    "mapping_rule": mapping.mapping_rule,
                    "confidence": mapping.confidence,
                    "data_source": data_source.value,
                })
            else:
                unmapped_col = f"_unmapped_{col}"
                result_df[unmapped_col] = df[col]
                mapping_log.append({
                    "source_field": col,
                    "standard_field": unmapped_col,
                    "mapping_rule": "未映射，保留原名",
                    "confidence": 0.0,
                    "data_source": data_source.value,
                })

        result_df["_processing_status"] = ProcessingStatus.MAPPED.value
        status_log.append({
            "stage": "字段映射",
            "status": ProcessingStatus.MAPPED.value,
            "mapped_fields": len([m for m in mapping_log if not m["standard_field"].startswith("_unmapped")]),
            "unmapped_fields": len([m for m in mapping_log if m["standard_field"].startswith("_unmapped")]),
        })

        return result_df, mapping_log, status_log

    def _find_mapping(self, source_field: str, data_source: DataSource) -> Optional[FieldMapping]:
        for m in self._mappings:
            if m.source_field == source_field and m.data_source == data_source:
                return m
        for m in self._mappings:
            if m.source_field == source_field:
                return m
        return None

    def get_mappings_for_source(self, data_source: DataSource) -> List[FieldMapping]:
        return [m for m in self._mappings if m.data_source == data_source]

from typing import Dict, Any, List, Optional
from collections import Counter


class AnomalyDetector:
    ANOMALY_CATEGORIES = {
        "UNIT_ERROR": "单位换算错误",
        "MISSING_VOLUME": "体积数据缺失",
        "CRITICAL_STATE": "临界浮沉状态",
        "STATE_INCONSISTENT": "浮沉记录与计算不符",
        "FORMAT_ERROR": "数据格式错误",
        "VALUE_ERROR": "数值异常",
        "MISSING_FIELD": "必填字段缺失",
    }

    @classmethod
    def categorize_anomaly(cls, record: Dict[str, Any]) -> List[Dict[str, str]]:
        anomalies = []

        if "_validation_errors" in record:
            for error in record["_validation_errors"]:
                error_type = error.get("error_type", "")
                if error_type == "MISSING_VOLUME":
                    anomalies.append({
                        "category": "MISSING_VOLUME",
                        "description": cls.ANOMALY_CATEGORIES["MISSING_VOLUME"],
                        "detail": error.get("message", ""),
                        "severity": "high",
                    })
                elif error_type == "INVALID_UNIT":
                    anomalies.append({
                        "category": "UNIT_ERROR",
                        "description": cls.ANOMALY_CATEGORIES["UNIT_ERROR"],
                        "detail": error.get("message", ""),
                        "severity": "high",
                    })
                elif error_type == "INVALID_FORMAT":
                    anomalies.append({
                        "category": "FORMAT_ERROR",
                        "description": cls.ANOMALY_CATEGORIES["FORMAT_ERROR"],
                        "detail": error.get("message", ""),
                        "severity": "high",
                    })
                elif error_type == "INVALID_VALUE":
                    anomalies.append({
                        "category": "VALUE_ERROR",
                        "description": cls.ANOMALY_CATEGORIES["VALUE_ERROR"],
                        "detail": error.get("message", ""),
                        "severity": "high",
                    })
                elif error_type == "MISSING_FIELD":
                    anomalies.append({
                        "category": "MISSING_FIELD",
                        "description": cls.ANOMALY_CATEGORIES["MISSING_FIELD"],
                        "detail": error.get("message", ""),
                        "severity": "high",
                    })
                elif error_type == "INVALID_STATE":
                    anomalies.append({
                        "category": "FORMAT_ERROR",
                        "description": "浮沉状态格式错误",
                        "detail": error.get("message", ""),
                        "severity": "medium",
                    })

        calculations = record.get("_calculations", {})

        if calculations.get("is_critical_state", False):
            anomalies.append({
                "category": "CRITICAL_STATE",
                "description": cls.ANOMALY_CATEGORIES["CRITICAL_STATE"],
                "detail": f"物体密度 ({calculations.get('object_density_g_cm3', 'N/A')} g/cm³) 与液体密度 ({calculations.get('liquid_density_g_cm3', 'N/A')} g/cm³) 接近，密度比: {calculations.get('density_ratio', 'N/A')}",
                "severity": "medium",
            })

        if calculations.get("is_consistent") is False:
            anomalies.append({
                "category": "STATE_INCONSISTENT",
                "description": cls.ANOMALY_CATEGORIES["STATE_INCONSISTENT"],
                "detail": calculations.get("consistency_message", ""),
                "severity": "high",
            })

        return anomalies

    @classmethod
    def analyze_batch(cls, processed_records: List[Dict[str, Any]], invalid_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        all_records = processed_records + invalid_records
        total_count = len(all_records)

        anomaly_records = []
        category_counter = Counter()
        severity_counter = Counter()

        for record in invalid_records:
            anomalies = cls.categorize_anomaly(record)
            if anomalies:
                anomaly_records.append({
                    "sample_id": record.get("sample_id", f"row_{record.get('_row_index', 'unknown')}"),
                    "row_index": record.get("_row_index", -1),
                    "anomalies": anomalies,
                    "record": record,
                })
                for a in anomalies:
                    category_counter[a["category"]] += 1
                    severity_counter[a["severity"]] += 1

        for record in processed_records:
            anomalies = cls.categorize_anomaly(record)
            if anomalies:
                anomaly_records.append({
                    "sample_id": record.get("sample_id", f"row_{record.get('_row_index', 'unknown')}"),
                    "row_index": record.get("_row_index", -1),
                    "anomalies": anomalies,
                    "record": record,
                })
                for a in anomalies:
                    category_counter[a["category"]] += 1
                    severity_counter[a["severity"]] += 1

        valid_count = len([r for r in processed_records if r.get("_status") == "success"])
        warning_count = len([r for r in processed_records if r.get("_status") == "warning"])
        error_count = len(invalid_records)

        return {
            "total_records": total_count,
            "valid_records": valid_count,
            "warning_records": warning_count,
            "error_records": error_count,
            "anomaly_records": anomaly_records,
            "anomaly_summary": {
                "by_category": dict(category_counter),
                "by_severity": dict(severity_counter),
                "total_anomalies": sum(category_counter.values()),
            },
        }

    @classmethod
    def get_correction_suggestion(cls, anomaly_category: str) -> str:
        suggestions = {
            "UNIT_ERROR": "请检查单位是否正确，支持的单位：质量(g, kg, mg, t)，体积(cm³, m³, mL, L, dm³)，密度(g/cm³, kg/m³, g/mL, kg/L)",
            "MISSING_VOLUME": "体积数据是计算的关键，请补充物体的体积值和单位",
            "CRITICAL_STATE": "这是临界状态，物体密度接近液体密度，建议重复实验确认浮沉状态",
            "STATE_INCONSISTENT": "记录的浮沉状态与计算结果不符，请检查实验操作或重新测量",
            "FORMAT_ERROR": "请检查数据格式，确保数值字段为有效数字",
            "VALUE_ERROR": "数值异常，质量、体积、密度都应为正数",
            "MISSING_FIELD": "请补充所有必填字段",
        }
        return suggestions.get(anomaly_category, "请检查数据")

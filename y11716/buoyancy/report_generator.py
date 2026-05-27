import csv
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


class ReportGenerator:
    @classmethod
    def generate_csv(cls, processed_records: List[Dict[str, Any]], invalid_records: List[Dict[str, Any]],
                     analysis_result: Dict[str, Any], output_path: str) -> str:
        fieldnames = [
            "样本ID", "行号", "质量", "质量单位", "体积", "体积单位",
            "液体密度", "密度单位", "记录状态", "物体密度(g/cm³)", "液体密度(g/cm³)",
            "浮力(N)", "重力(N)", "计算状态", "是否临界", "是否一致", "一致性说明",
            "密度比", "状态", "异常类型", "异常描述", "修正建议"
        ]

        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for record in processed_records:
                row = cls._record_to_csv_row(record)
                writer.writerow(row)

            for record in invalid_records:
                row = cls._invalid_record_to_csv_row(record)
                writer.writerow(row)

        return output_path

    @classmethod
    def _record_to_csv_row(cls, record: Dict[str, Any]) -> Dict[str, str]:
        calc = record.get("_calculations", {})
        anomalies = []
        suggestions = []

        if calc.get("is_critical_state"):
            anomalies.append("临界状态")
            suggestions.append("建议重复实验确认")
        if calc.get("is_consistent") is False:
            anomalies.append("记录不符")
            suggestions.append(calc.get("consistency_message", ""))

        status = record.get("_status", "success")
        if status == "warning":
            status_text = "警告"
        elif status == "error":
            status_text = "错误"
        else:
            status_text = "正常"

        return {
            "样本ID": record.get("sample_id", ""),
            "行号": record.get("_row_index", ""),
            "质量": record.get("mass", ""),
            "质量单位": record.get("mass_unit", ""),
            "体积": record.get("volume", ""),
            "体积单位": record.get("volume_unit", ""),
            "液体密度": record.get("liquid_density", ""),
            "密度单位": record.get("liquid_density_unit", ""),
            "记录状态": record.get("observed_state", ""),
            "物体密度(g/cm³)": calc.get("object_density_g_cm3", ""),
            "液体密度(g/cm³)": calc.get("liquid_density_g_cm3", ""),
            "浮力(N)": calc.get("buoyant_force_N", ""),
            "重力(N)": calc.get("weight_N", ""),
            "计算状态": calc.get("calculated_state", ""),
            "是否临界": "是" if calc.get("is_critical_state") else "否",
            "是否一致": "是" if calc.get("is_consistent") else "否",
            "一致性说明": calc.get("consistency_message", ""),
            "密度比": calc.get("density_ratio", ""),
            "状态": status_text,
            "异常类型": "; ".join(anomalies),
            "异常描述": record.get("_warning_message", ""),
            "修正建议": "; ".join(suggestions),
        }

    @classmethod
    def _invalid_record_to_csv_row(cls, record: Dict[str, Any]) -> Dict[str, str]:
        errors = record.get("_validation_errors", [])
        error_types = [e.get("error_type", "") for e in errors]
        error_messages = [e.get("message", "") for e in errors]

        return {
            "样本ID": record.get("sample_id", ""),
            "行号": record.get("_row_index", ""),
            "质量": record.get("mass", ""),
            "质量单位": record.get("mass_unit", ""),
            "体积": record.get("volume", ""),
            "体积单位": record.get("volume_unit", ""),
            "液体密度": record.get("liquid_density", ""),
            "密度单位": record.get("liquid_density_unit", ""),
            "记录状态": record.get("observed_state", ""),
            "物体密度(g/cm³)": "",
            "液体密度(g/cm³)": "",
            "浮力(N)": "",
            "重力(N)": "",
            "计算状态": "",
            "是否临界": "",
            "是否一致": "",
            "一致性说明": "",
            "密度比": "",
            "状态": "错误",
            "异常类型": "; ".join(error_types),
            "异常描述": "; ".join(error_messages),
            "修正建议": "请修正上述错误后重新导入",
        }

    @classmethod
    def generate_json(cls, processed_records: List[Dict[str, Any]], invalid_records: List[Dict[str, Any]],
                      analysis_result: Dict[str, Any], output_path: str) -> str:
        report = {
            "report_info": {
                "generated_at": datetime.now().isoformat(),
                "total_records": analysis_result.get("total_records", 0),
                "valid_records": analysis_result.get("valid_records", 0),
                "warning_records": analysis_result.get("warning_records", 0),
                "error_records": analysis_result.get("error_records", 0),
            },
            "anomaly_summary": analysis_result.get("anomaly_summary", {}),
            "anomaly_details": analysis_result.get("anomaly_records", []),
            "processed_records": processed_records,
            "invalid_records": invalid_records,
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        return output_path

    @classmethod
    def generate_summary_text(cls, analysis_result: Dict[str, Any]) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("浮力密度判定报告摘要")
        lines.append("=" * 60)
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"总记录数: {analysis_result.get('total_records', 0)}")
        lines.append(f"正常记录: {analysis_result.get('valid_records', 0)}")
        lines.append(f"警告记录: {analysis_result.get('warning_records', 0)}")
        lines.append(f"错误记录: {analysis_result.get('error_records', 0)}")
        lines.append("")

        anomaly_summary = analysis_result.get("anomaly_summary", {})
        if anomaly_summary.get("total_anomalies", 0) > 0:
            lines.append("-" * 60)
            lines.append("异常统计:")
            lines.append("-" * 60)

            by_category = anomaly_summary.get("by_category", {})
            for category, count in sorted(by_category.items(), key=lambda x: -x[1]):
                category_name = {
                    "UNIT_ERROR": "单位换算错误",
                    "MISSING_VOLUME": "体积数据缺失",
                    "CRITICAL_STATE": "临界浮沉状态",
                    "STATE_INCONSISTENT": "浮沉记录与计算不符",
                    "FORMAT_ERROR": "数据格式错误",
                    "VALUE_ERROR": "数值异常",
                    "MISSING_FIELD": "必填字段缺失",
                }.get(category, category)
                lines.append(f"  {category_name}: {count} 条")

            lines.append("")
            lines.append("异常严重程度:")
            by_severity = anomaly_summary.get("by_severity", {})
            for severity, count in by_severity.items():
                severity_name = {"high": "高", "medium": "中", "low": "低"}.get(severity, severity)
                lines.append(f"  {severity_name}: {count} 条")

            lines.append("")
            lines.append("-" * 60)
            lines.append("异常记录详情:")
            lines.append("-" * 60)

            for anomaly_record in analysis_result.get("anomaly_records", []):
                sample_id = anomaly_record.get("sample_id", "未知")
                row_idx = anomaly_record.get("row_index", -1)
                lines.append(f"\n样本 {sample_id} (行 {row_idx}):")
                for anomaly in anomaly_record.get("anomalies", []):
                    severity = {"high": "【高】", "medium": "【中】", "low": "【低】"}.get(anomaly.get("severity", ""), "")
                    lines.append(f"  {severity}{anomaly.get('description', '')}: {anomaly.get('detail', '')}")

        lines.append("\n" + "=" * 60)

        return "\n".join(lines)

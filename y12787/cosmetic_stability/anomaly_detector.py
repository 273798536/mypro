"""
异常检测模块
检测：记录漏记、空白对照缺失、数值异常、单位漏填等
核心原则：反应时间漏记不能被系统当成正常样例
"""
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from .models import (
    AnomalyRecord, AnomalyType, SampleStatus,
    BatchInfo, TestPoint, TestItem
)
from .config import Config
from .batch_manager import BatchManager


@dataclass
class DetectionResult:
    """检测结果"""
    anomalies: List[AnomalyRecord]
    summary: Dict


class AnomalyDetector:
    """异常检测器"""

    def __init__(self, config: Config, batch_manager: BatchManager):
        self.config = config
        self.batch_manager = batch_manager
        self.max_time_deviation = config.get("anomaly_detection.max_time_deviation_hours", 24)
        self.required_units = config.get("anomaly_detection.required_units", [])
        self.value_range_check = config.get("anomaly_detection.value_range_check", True)
        self.standard_time_points = config.get("stability.standard_time_points",
                                                ["0月", "1月", "3月", "6月", "12月", "24月"])

    def _generate_anomaly_id(self) -> str:
        """生成异常ID（使用BatchManager的统一ID生成机制确保唯一）"""
        return self.batch_manager._generate_id("ANOM")

    def _create_anomaly(self, batch_no: str, anomaly_type: AnomalyType,
                         description: str, location: str, severity: str = "一般",
                         related_data: Dict = None) -> AnomalyRecord:
        """创建异常记录（暂存，待关联处理记录）"""
        return AnomalyRecord(
            anomaly_id=self._generate_anomaly_id(),
            batch_no=batch_no,
            anomaly_type=anomaly_type,
            severity=severity,
            description=description,
            location=location,
            processing_record_id="",
            status=SampleStatus.PENDING,
            related_data=related_data or {}
        )

    def check_missing_records(self, batch_no: str) -> List[AnomalyRecord]:
        """
        检查记录缺失
        重点：反应时间漏记（record_time为None）不能被当成正常样例
        """
        anomalies = []

        test_points = self.batch_manager.ledger.test_points.get(batch_no, [])
        test_items = self.batch_manager.ledger.test_items.get(batch_no, [])

        for tp in test_points:
            location = f"批次{batch_no} {tp.time_point}考察点"
            if not tp.test_date:
                anomalies.append(self._create_anomaly(
                    batch_no=batch_no,
                    anomaly_type=AnomalyType.MISSING_RECORD,
                    description=f"{tp.time_point}考察点缺少检验日期",
                    location=location,
                    severity="严重",
                    related_data={"time_point": tp.time_point, "field": "test_date"}
                ))

            if tp.record_time is None:
                anomalies.append(self._create_anomaly(
                    batch_no=batch_no,
                    anomaly_type=AnomalyType.MISSING_RECORD,
                    description=f"{tp.time_point}考察点反应时间漏记，系统无法判定为正常样例",
                    location=location,
                    severity="严重",
                    related_data={"time_point": tp.time_point, "field": "record_time",
                                  "warning": "时间漏记将导致该考察点数据无法用于稳定性计算"}
                ))

        expected_time_points = set(self.standard_time_points)
        actual_time_points = {tp.time_point for tp in test_points}
        missing_time_points = expected_time_points - actual_time_points

        if missing_time_points:
            for tp in sorted(missing_time_points):
                anomalies.append(self._create_anomaly(
                    batch_no=batch_no,
                    anomaly_type=AnomalyType.MISSING_RECORD,
                    description=f"缺少标准考察时间点{tp}的完整记录",
                    location=f"批次{batch_no}",
                    severity="一般",
                    related_data={"missing_time_point": tp}
                ))

        for item in test_items:
            location = f"批次{batch_no} {item.time_point} {item.item_name}"
            if item.measured_value is None and item.is_qualified is None:
                anomalies.append(self._create_anomaly(
                    batch_no=batch_no,
                    anomaly_type=AnomalyType.INCOMPLETE_DATA,
                    description=f"{item.item_name}检测数据不完整，既无测定值也无合格判定",
                    location=location,
                    severity="一般",
                    related_data={"item_code": item.item_code, "time_point": item.time_point}
                ))

            if not item.inspection_date:
                anomalies.append(self._create_anomaly(
                    batch_no=batch_no,
                    anomaly_type=AnomalyType.MISSING_RECORD,
                    description=f"{item.item_name}缺少检验日期",
                    location=location,
                    severity="一般",
                    related_data={"item_code": item.item_code, "field": "inspection_date"}
                ))

        return anomalies

    def check_blank_control(self, batch_no: str) -> List[AnomalyRecord]:
        """检查空白对照缺失"""
        anomalies = []
        test_points = self.batch_manager.ledger.test_points.get(batch_no, [])

        control_groups = {}
        for tp in test_points:
            key = tp.time_point
            if key not in control_groups:
                control_groups[key] = {"regular": [], "blank": []}
            if tp.is_blank_control:
                control_groups[key]["blank"].append(tp)
            else:
                control_groups[key]["regular"].append(tp)

        for time_point, groups in control_groups.items():
            if groups["regular"] and not groups["blank"]:
                anomalies.append(self._create_anomaly(
                    batch_no=batch_no,
                    anomaly_type=AnomalyType.MISSING_BLANK_CONTROL,
                    description=f"{time_point}时间点有供试品检测，但缺少空白对照",
                    location=f"批次{batch_no} {time_point}",
                    severity="严重",
                    related_data={
                        "time_point": time_point,
                        "regular_count": len(groups["regular"]),
                        "blank_count": 0,
                        "explanation": "空白对照用于排除溶剂、基质等因素的干扰，缺失将导致含量测定结果的准确性无法验证"
                    }
                ))

        test_items = self.batch_manager.ledger.test_items.get(batch_no, [])
        for item in test_items:
            if item.item_code in ["CONTENT", "ASSAY"] and item.supplementary_note:
                if "空白" in item.supplementary_note and "未做" in item.supplementary_note:
                    anomalies.append(self._create_anomaly(
                        batch_no=batch_no,
                        anomaly_type=AnomalyType.MISSING_BLANK_CONTROL,
                        description=f"{item.time_point}{item.item_name}备注注明未做空白对照",
                        location=f"批次{batch_no} {item.time_point} {item.item_name}",
                        severity="严重",
                        related_data={
                            "item_code": item.item_code,
                            "note": item.supplementary_note,
                            "explanation": "备注明确说明未做空白对照，该数据的准确性需谨慎评估"
                        }
                    ))

        return anomalies

    def check_value_anomalies(self, batch_no: str) -> List[AnomalyRecord]:
        """检查数值异常"""
        anomalies = []
        test_items = self.batch_manager.ledger.test_items.get(batch_no, [])

        item_groups: Dict[str, List[TestItem]] = {}
        for item in test_items:
            key = item.item_code
            if key not in item_groups:
                item_groups[key] = []
            item_groups[key].append(item)

        for item_code, items in item_groups.items():
            items_sorted = sorted(items, key=lambda x: self._parse_time_point(x.time_point))
            values = [item.measured_value for item in items_sorted if item.measured_value is not None]

            if len(values) >= 3:
                avg = sum(values) / len(values)
                variance = sum((v - avg) ** 2 for v in values) / len(values)
                std_dev = variance ** 0.5

                for item in items_sorted:
                    if item.measured_value is not None and std_dev > 0:
                        z_score = abs(item.measured_value - avg) / std_dev
                        if z_score > 2.5:
                            anomalies.append(self._create_anomaly(
                                batch_no=batch_no,
                                anomaly_type=AnomalyType.ABNORMAL_VALUE,
                                description=f"{item.time_point}{item.item_name}数值{self._format_value(item)}异常偏离(Z={z_score:.2f})",
                                location=f"批次{batch_no} {item.time_point} {item.item_name}",
                                severity="一般",
                                related_data={
                                    "item_code": item_code,
                                    "value": item.measured_value,
                                    "mean": round(avg, 4),
                                    "std_dev": round(std_dev, 4),
                                    "z_score": round(z_score, 2)
                                }
                            ))

            if item_code in ["CONTENT", "ASSAY", "PH"] and len(values) >= 2:
                trend = []
                for i in range(1, len(values)):
                    trend.append(values[i] - values[i - 1])

                if len(trend) >= 2 and all(t <= 0 for t in trend) and sum(trend) != 0:
                    pass
                elif len(trend) >= 3:
                    direction_changes = sum(1 for i in range(1, len(trend))
                                           if (trend[i] > 0) != (trend[i - 1] > 0))
                    if direction_changes >= 2:
                        anomalies.append(self._create_anomaly(
                            batch_no=batch_no,
                            anomaly_type=AnomalyType.ABNORMAL_VALUE,
                            description=f"{item.item_name}数值波动频繁，趋势不明确(方向变化{direction_changes}次)",
                            location=f"批次{batch_no} {item.item_name}",
                            severity="一般",
                            related_data={
                                "item_code": item_code,
                                "trend_values": [round(t, 4) for t in trend],
                                "direction_changes": direction_changes
                            }
                        ))

            for item in items:
                if item.is_qualified is False:
                    anomalies.append(self._create_anomaly(
                        batch_no=batch_no,
                        anomaly_type=AnomalyType.OUT_OF_SPEC,
                        description=f"{item.time_point}{item.item_name}检验结果不合格",
                        location=f"批次{batch_no} {item.time_point} {item.item_name}",
                        severity="严重",
                        related_data={
                            "item_code": item_code,
                            "value": item.measured_value,
                            "specification": item.specification,
                            "unit": item.unit
                        }
                    ))

        return anomalies

    def check_missing_units(self, batch_no: str) -> List[AnomalyRecord]:
        """检查单位漏填"""
        anomalies = []
        test_items = self.batch_manager.ledger.test_items.get(batch_no, [])

        numeric_items = ["CONTENT", "ASSAY", "PH", "VISCOSITY", "DENSITY", "MICROBE"]

        for item in test_items:
            if item.item_code in numeric_items and item.measured_value is not None:
                if not item.unit:
                    anomalies.append(self._create_anomaly(
                        batch_no=batch_no,
                        anomaly_type=AnomalyType.MISSING_UNIT,
                        description=f"{item.time_point}{item.item_name}测定值{self._format_value(item)}缺少单位",
                        location=f"批次{batch_no} {item.time_point} {item.item_name}",
                        severity="一般",
                        related_data={
                            "item_code": item.item_code,
                            "value": item.measured_value,
                            "expected_units": self._suggest_units(item.item_code)
                        }
                    ))

        return anomalies

    def check_time_discrepancies(self, batch_no: str) -> List[AnomalyRecord]:
        """检查时间矛盾"""
        anomalies = []
        test_points = self.batch_manager.ledger.test_points.get(batch_no, [])
        batch = self.batch_manager.ledger.batches.get(batch_no)

        if batch:
            manu_date = self._parse_date(batch.manufacture_date)
            for tp in test_points:
                test_date = self._parse_date(tp.test_date)
                if manu_date and test_date and test_date < manu_date:
                    anomalies.append(self._create_anomaly(
                        batch_no=batch_no,
                        anomaly_type=AnomalyType.TIME_DISCREPANCY,
                        description=f"{tp.time_point}考察检验日期({tp.test_date})早于生产日期({batch.manufacture_date})",
                        location=f"批次{batch_no} {tp.time_point}",
                        severity="严重",
                        related_data={
                            "manufacture_date": batch.manufacture_date,
                            "test_date": tp.test_date,
                            "field": "test_date"
                        }
                    ))

        for i in range(len(test_points)):
            for j in range(i + 1, len(test_points)):
                tp1, tp2 = test_points[i], test_points[j]
                months1 = self._parse_time_point(tp1.time_point)
                months2 = self._parse_time_point(tp2.time_point)
                date1 = self._parse_date(tp1.test_date)
                date2 = self._parse_date(tp2.test_date)

                if months1 < months2 and date1 and date2 and date1 > date2:
                    anomalies.append(self._create_anomaly(
                        batch_no=batch_no,
                        anomaly_type=AnomalyType.TIME_DISCREPANCY,
                        description=f"时间点矛盾：{tp1.time_point}(日期{tp1.test_date})晚于{tp2.time_point}(日期{tp2.test_date})",
                        location=f"批次{batch_no}",
                        severity="严重",
                        related_data={
                            "time_point1": tp1.time_point,
                            "time_point2": tp2.time_point,
                            "date1": tp1.test_date,
                            "date2": tp2.test_date
                        }
                    ))

        return anomalies

    def detect_batch_anomalies(self, batch_no: str, operator: str) -> List[AnomalyRecord]:
        """检测批次所有异常"""
        all_anomalies: List[AnomalyRecord] = []

        check_functions = [
            self.check_missing_records,
            self.check_blank_control,
            self.check_value_anomalies,
            self.check_missing_units,
            self.check_time_discrepancies,
        ]

        for check_func in check_functions:
            try:
                anomalies = check_func(batch_no)
                all_anomalies.extend(anomalies)
            except Exception as e:
                continue

        new_anomalies = []
        for anomaly in all_anomalies:
            added, pr = self.batch_manager.add_anomaly(anomaly, operator)
            if pr is not None:
                new_anomalies.append(added)

        return new_anomalies

    def detect_all_anomalies(self, operator: str) -> Dict[str, List[AnomalyRecord]]:
        """检测所有批次的异常"""
        results = {}
        for batch_no in self.batch_manager.ledger.batches:
            anomalies = self.detect_batch_anomalies(batch_no, operator)
            if anomalies:
                results[batch_no] = anomalies
        return results

    def get_anomaly_summary(self, batch_no: str = None) -> Dict:
        """获取异常汇总"""
        anomalies = self.batch_manager.list_anomalies(batch_no=batch_no)

        by_type: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}
        by_status: Dict[str, int] = {}

        for anomaly in anomalies:
            type_key = anomaly.anomaly_type.value
            by_type[type_key] = by_type.get(type_key, 0) + 1
            by_severity[anomaly.severity] = by_severity.get(anomaly.severity, 0) + 1
            status_key = anomaly.status.value
            by_status[status_key] = by_status.get(status_key, 0) + 1

        return {
            "total": len(anomalies),
            "by_type": by_type,
            "by_severity": by_severity,
            "by_status": by_status,
            "pending_count": sum(1 for a in anomalies if a.status == SampleStatus.PENDING),
            "severe_count": sum(1 for a in anomalies if a.severity == "严重")
        }

    def _parse_time_point(self, tp_str: str) -> float:
        """解析时间点为月数"""
        if not tp_str:
            return 0.0
        tp_str = tp_str.strip()
        if tp_str.endswith("月"):
            return float(tp_str[:-1])
        elif tp_str.endswith("天"):
            return float(tp_str[:-1]) / 30.0
        try:
            return float(tp_str)
        except ValueError:
            return 0.0

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """解析日期"""
        if not date_str:
            return None
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日", "%Y.%m.%d"]:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

    def _format_value(self, item: TestItem) -> str:
        """格式化数值显示"""
        if item.measured_value is None:
            return "无"
        if abs(item.measured_value) >= 1000:
            return f"{item.measured_value:.0f}"
        elif abs(item.measured_value) >= 1:
            return f"{item.measured_value:.2f}"
        else:
            return f"{item.measured_value:.4f}"

    def _suggest_units(self, item_code: str) -> List[str]:
        """根据项目代码推荐单位"""
        suggestions = {
            "CONTENT": ["mg/g", "%", "μg/g"],
            "ASSAY": ["%", "mg/g"],
            "PH": ["pH"],
            "VISCOSITY": ["mPa·s", "Pa·s"],
            "DENSITY": ["g/cm³", "g/mL"],
            "MICROBE": ["CFU/g", "CFU/mL"]
        }
        return suggestions.get(item_code, [])

"""
异常检测与标记模块
核心功能：
1. 综合检测各类异常
2. 异常分级
3. 生成异常说明
4. 异常数据筛选
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

from ..config.settings import get_config


@dataclass
class Anomaly:
    """单条异常"""
    anomaly_id: str
    order_id: str
    original_row_number: int
    anomaly_type: str
    severity: str
    description: str
    details: Dict[str, Any]
    detected_at: datetime


@dataclass
class AnomalyDetectionResult:
    """异常检测总结果"""
    df: pd.DataFrame
    anomalies: List[Anomaly]
    anomaly_summary: Dict[str, Any]
    cross_period_filter: pd.DataFrame
    stacked_coupon_filter: pd.DataFrame
    offline_device_filter: pd.DataFrame
    manual_supplement_filter: pd.DataFrame
    needs_review_filter: pd.DataFrame


class AnomalyDetector:
    """异常检测器"""

    SEVERITY_CRITICAL = "严重"
    SEVERITY_WARNING = "警告"
    SEVERITY_INFO = "提示"

    ANOMALY_TYPES = {
        "cross_period": "跨时段充电",
        "stacked_coupon": "优惠叠加",
        "offline_device": "设备离线",
        "fault_device": "设备故障",
        "manual_supplement": "人工补录",
        "service_fee_diff": "服务费差异",
        "amount_mismatch": "金额不匹配",
        "data_quality": "数据质量问题",
    }

    def __init__(self):
        self.config = get_config()

    def _generate_anomaly_id(self, order_id: str, anomaly_type: str) -> str:
        """生成异常ID"""
        return f"{anomaly_type[:4].upper()}-{order_id[-8:]}"

    def _detect_cross_period(self, row: pd.Series) -> Optional[Anomaly]:
        """检测跨时段充电"""
        if not row.get("is_cross_period", False):
            return None

        order_id = row.get("order_id", "UNKNOWN")
        return Anomaly(
            anomaly_id=self._generate_anomaly_id(order_id, "cross_period"),
            order_id=order_id,
            original_row_number=row.get("_original_row_number", 0),
            anomaly_type="cross_period",
            severity=self.SEVERITY_WARNING,
            description=f"充电跨越多时段：{row.get('crossed_periods', '')}",
            details={
                "start_time": str(row.get("start_time")),
                "end_time": str(row.get("end_time")),
                "crossed_periods": str(row.get("crossed_periods", "")).split(","),
                "energy": row.get("energy"),
            },
            detected_at=datetime.now()
        )

    def _detect_stacked_coupon(self, row: pd.Series) -> Optional[Anomaly]:
        """检测优惠叠加"""
        if not row.get("is_coupon_stacked", False):
            return None

        order_id = row.get("order_id", "UNKNOWN")
        return Anomaly(
            anomaly_id=self._generate_anomaly_id(order_id, "stacked_coupon"),
            order_id=order_id,
            original_row_number=row.get("_original_row_number", 0),
            anomaly_type="stacked_coupon",
            severity=self.SEVERITY_WARNING,
            description=f"优惠叠加，共{row.get('coupon_stack_count', 0)}张优惠券",
            details={
                "coupon_amount": row.get("original_coupon_amount", 0),
                "coupon_type": row.get("coupon_type"),
                "stack_count": row.get("coupon_stack_count", 0),
            },
            detected_at=datetime.now()
        )

    def _detect_offline_device(self, row: pd.Series) -> Optional[Anomaly]:
        """检测设备离线"""
        if not row.get("is_device_offline", False):
            return None

        order_id = row.get("order_id", "UNKNOWN")
        return Anomaly(
            anomaly_id=self._generate_anomaly_id(order_id, "offline_device"),
            order_id=order_id,
            original_row_number=row.get("_original_row_number", 0),
            anomaly_type="offline_device",
            severity=self.SEVERITY_CRITICAL,
            description=f"设备{row.get('device_id')}离线，数据需人工复核",
            details={
                "device_id": row.get("device_id"),
                "device_name": row.get("device_name"),
                "original_status": row.get("device_status"),
                "normalized_status": row.get("normalized_device_status"),
            },
            detected_at=datetime.now()
        )

    def _detect_fault_device(self, row: pd.Series) -> Optional[Anomaly]:
        """检测设备故障"""
        if not row.get("is_device_fault", False):
            return None

        order_id = row.get("order_id", "UNKNOWN")
        return Anomaly(
            anomaly_id=self._generate_anomaly_id(order_id, "fault_device"),
            order_id=order_id,
            original_row_number=row.get("_original_row_number", 0),
            anomaly_type="fault_device",
            severity=self.SEVERITY_CRITICAL,
            description=f"设备{row.get('device_id')}故障",
            details={
                "device_id": row.get("device_id"),
                "device_name": row.get("device_name"),
            },
            detected_at=datetime.now()
        )

    def _detect_manual_supplement(self, row: pd.Series) -> Optional[Anomaly]:
        """检测人工补录"""
        if not row.get("is_manual_supplement", False):
            return None

        order_id = row.get("order_id", "UNKNOWN")
        return Anomaly(
            anomaly_id=self._generate_anomaly_id(order_id, "manual_supplement"),
            order_id=order_id,
            original_row_number=row.get("_original_row_number", 0),
            anomaly_type="manual_supplement",
            severity=self.SEVERITY_WARNING,
            description="人工补录数据，需复核",
            details={
                "remark": row.get("remark"),
                "operator": row.get("operator"),
            },
            detected_at=datetime.now()
        )

    def _detect_service_fee_diff(self, row: pd.Series) -> Optional[Anomaly]:
        """检测服务费差异"""
        service_fee_diff = row.get("service_fee_diff")
        if service_fee_diff is None or pd.isna(service_fee_diff):
            return None

        diff = float(service_fee_diff)
        if abs(diff) < 0.01:
            return None

        order_id = row.get("order_id", "UNKNOWN")
        severity = self.SEVERITY_CRITICAL if abs(diff) >= 10 else self.SEVERITY_WARNING

        return Anomaly(
            anomaly_id=self._generate_anomaly_id(order_id, "service_fee_diff"),
            order_id=order_id,
            original_row_number=row.get("_original_row_number", 0),
            anomaly_type="service_fee_diff",
            severity=severity,
            description=f"服务费计算差异{diff:.2f}元",
            details={
                "original_service_fee": row.get("original_service_fee"),
                "calculated_service_fee": row.get("calculated_service_fee"),
                "difference": diff,
            },
            detected_at=datetime.now()
        )

    def _detect_order(self, row: pd.Series) -> List[Anomaly]:
        """检测单条订单的所有异常"""
        anomalies = []

        detectors = [
            self._detect_cross_period,
            self._detect_stacked_coupon,
            self._detect_offline_device,
            self._detect_fault_device,
            self._detect_manual_supplement,
            self._detect_service_fee_diff,
        ]

        for detector in detectors:
            anomaly = detector(row)
            if anomaly:
                anomalies.append(anomaly)

        return anomalies

    def detect(self, df: pd.DataFrame) -> AnomalyDetectionResult:
        """批量检测异常"""
        df = df.copy()
        all_anomalies = []

        anomaly_columns = {
            "anomaly_count": [],
            "anomaly_types": [],
            "max_severity": [],
        }

        for idx, row in df.iterrows():
            anomalies = self._detect_order(row)
            all_anomalies.extend(anomalies)

            anomaly_count = len(anomalies)
            anomaly_types = [a.anomaly_type for a in anomalies]
            severities = [a.severity for a in anomalies]

            max_severity = self.SEVERITY_CRITICAL if self.SEVERITY_CRITICAL in severities else \
                          self.SEVERITY_WARNING if self.SEVERITY_WARNING in severities else \
                          self.SEVERITY_INFO if self.SEVERITY_INFO in severities else "正常"

            anomaly_columns["anomaly_count"].append(anomaly_count)
            anomaly_columns["anomaly_types"].append(",".join(anomaly_types))
            anomaly_columns["max_severity"].append(max_severity)

        df["anomaly_count"] = anomaly_columns["anomaly_count"]
        df["anomaly_types"] = anomaly_columns["anomaly_types"]
        df["max_severity"] = anomaly_columns["max_severity"]

        type_counts = {}
        severity_counts = {}
        for anomaly in all_anomalies:
            type_counts[anomaly.anomaly_type] = type_counts.get(anomaly.anomaly_type, 0) + 1
            severity_counts[anomaly.severity] = severity_counts.get(anomaly.severity, 0) + 1

        summary = {
            "total_orders": len(df),
            "anomaly_orders": len([a for a in all_anomalies]),
            "total_anomalies": len(all_anomalies),
            "anomaly_type_distribution": {
                self.ANOMALY_TYPES.get(k, k): v for k, v in type_counts.items()
            },
            "severity_distribution": severity_counts,
            "critical_count": severity_counts.get(self.SEVERITY_CRITICAL, 0),
            "warning_count": severity_counts.get(self.SEVERITY_WARNING, 0),
            "info_count": severity_counts.get(self.SEVERITY_INFO, 0),
        }

        cross_period_filter = df[df["is_cross_period"] == True].copy()
        stacked_coupon_filter = df[df["is_coupon_stacked"] == True].copy()
        offline_device_filter = df[df["is_device_offline"] == True].copy()
        manual_supplement_filter = df[df["is_manual_supplement"] == True].copy()
        needs_review_filter = df[df["needs_review"] == True].copy()

        return AnomalyDetectionResult(
            df=df,
            anomalies=all_anomalies,
            anomaly_summary=summary,
            cross_period_filter=cross_period_filter,
            stacked_coupon_filter=stacked_coupon_filter,
            offline_device_filter=offline_device_filter,
            manual_supplement_filter=manual_supplement_filter,
            needs_review_filter=needs_review_filter,
        )

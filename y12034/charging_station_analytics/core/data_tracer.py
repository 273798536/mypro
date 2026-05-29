"""
数据追溯模块
核心功能：
1. 建立完整的数据血缘关系
2. 从结果追溯到原始数据、分时计费、服务费拆分、设备补录
3. 生成可追溯的唯一标识
4. 支持审计追踪
"""
import pandas as pd
import numpy as np
import hashlib
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

from ..config.settings import get_config


@dataclass
class TraceRecord:
    """追溯记录"""
    trace_id: str
    order_id: str
    original_row_number: int
    source_file: str
    processing_steps: List[Dict[str, Any]]
    final_result: Dict[str, Any]
    anomalies: List[str]
    needs_review: bool
    review_reason: Optional[str]
    created_at: datetime


@dataclass
class TraceResult:
    """追溯总结果"""
    records: List[TraceRecord]
    trace_index: Dict[str, TraceRecord]

    def get_by_order_id(self, order_id: str) -> Optional[TraceRecord]:
        return self.trace_index.get(order_id)

    def get_by_trace_id(self, trace_id: str) -> Optional[TraceRecord]:
        for record in self.records:
            if record.trace_id == trace_id:
                return record
        return None


class DataTracer:
    """数据追溯器"""

    def __init__(self):
        self.config = get_config()

    def _generate_trace_id(self, order_id: str, source_file: str, row_num: int) -> str:
        """生成唯一追溯ID"""
        raw = f"{order_id}|{source_file}|{row_num}|{datetime.now().isoformat()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _build_processing_steps(
        self,
        row: pd.Series,
        tariff_trace: Optional[Dict] = None,
        service_fee_trace: Optional[Dict] = None,
        coupon_trace: Optional[Dict] = None,
        device_trace: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """构建处理步骤链"""
        steps = []

        steps.append({
            "step": "数据读取",
            "timestamp": datetime.now().isoformat(),
            "details": {
                "original_row_number": row.get("_original_row_number"),
                "source_fields": {
                    "order_id": row.get("order_id"),
                    "start_time": str(row.get("start_time")),
                    "end_time": str(row.get("end_time")),
                    "energy": row.get("energy"),
                    "total_amount": row.get("total_amount"),
                }
            }
        })

        if tariff_trace:
            steps.append({
                "step": "分时电价计算",
                "timestamp": datetime.now().isoformat(),
                "details": tariff_trace
            })

        if service_fee_trace:
            steps.append({
                "step": "服务费计算",
                "timestamp": datetime.now().isoformat(),
                "details": service_fee_trace
            })

        if coupon_trace:
            steps.append({
                "step": "优惠券处理",
                "timestamp": datetime.now().isoformat(),
                "details": coupon_trace
            })

        if device_trace:
            steps.append({
                "step": "设备状态处理",
                "timestamp": datetime.now().isoformat(),
                "details": device_trace
            })

        return steps

    def _build_final_result(self, row: pd.Series) -> Dict[str, Any]:
        """构建最终结果摘要"""
        result = {
            "order_id": row.get("order_id"),
            "station_name": row.get("station_name"),
            "device_id": row.get("device_id"),
            "start_time": str(row.get("start_time")),
            "end_time": str(row.get("end_time")),
            "energy": row.get("energy"),
            "revenue_breakdown": {
                "electricity_fee": row.get("calculated_electricity_fee", 0),
                "service_fee": row.get("calculated_service_fee", 0),
                "coupon_discount": row.get("original_coupon_amount", 0),
                "net_revenue": round(
                    (row.get("calculated_electricity_fee", 0) or 0) +
                    (row.get("calculated_service_fee", 0) or 0) -
                    (row.get("original_coupon_amount", 0) or 0),
                    2
                )
            },
            "period_breakdown": {
                "peak": {
                    "energy": row.get("peak_energy", 0),
                    "electricity_fee": row.get("peak_fee", 0),
                    "service_fee": row.get("peak_service_fee", 0),
                    "coupon": row.get("peak_coupon", 0)
                },
                "high": {
                    "energy": row.get("high_energy", 0),
                    "electricity_fee": row.get("high_fee", 0),
                    "service_fee": row.get("high_service_fee", 0),
                    "coupon": row.get("high_coupon", 0)
                },
                "flat": {
                    "energy": row.get("flat_energy", 0),
                    "electricity_fee": row.get("flat_fee", 0),
                    "service_fee": row.get("flat_service_fee", 0),
                    "coupon": row.get("flat_coupon", 0)
                },
                "valley": {
                    "energy": row.get("valley_energy", 0),
                    "electricity_fee": row.get("valley_fee", 0),
                    "service_fee": row.get("valley_service_fee", 0),
                    "coupon": row.get("valley_coupon", 0)
                }
            },
            "flags": {
                "is_cross_period": bool(row.get("is_cross_period", False)),
                "is_coupon_stacked": bool(row.get("is_coupon_stacked", False)),
                "is_device_offline": bool(row.get("is_device_offline", False)),
                "is_manual_supplement": bool(row.get("is_manual_supplement", False)),
                "needs_review": bool(row.get("needs_review", False))
            }
        }
        return result

    def _detect_anomalies(self, row: pd.Series) -> List[str]:
        """检测异常标记"""
        anomalies = []

        if row.get("is_cross_period", False):
            anomalies.append("跨时段充电")

        if row.get("is_coupon_stacked", False):
            anomalies.append("优惠叠加")

        if row.get("is_device_offline", False):
            anomalies.append("设备离线")

        if row.get("is_device_fault", False):
            anomalies.append("设备故障")

        if row.get("is_manual_supplement", False):
            anomalies.append("人工补录")

        service_fee_diff = row.get("service_fee_diff")
        if service_fee_diff is not None and abs(float(service_fee_diff)) >= 0.01:
            anomalies.append(f"服务费差异:{float(service_fee_diff):.2f}元")

        return anomalies

    def create_trace(
        self,
        row: pd.Series,
        source_file: str,
        tariff_trace: Optional[Dict] = None,
        service_fee_trace: Optional[Dict] = None,
        coupon_trace: Optional[Dict] = None,
        device_trace: Optional[Dict] = None
    ) -> TraceRecord:
        """创建单条追溯记录"""
        order_id = row.get("order_id", "UNKNOWN")
        original_row = row.get("_original_row_number", 0)

        trace_id = self._generate_trace_id(order_id, source_file, original_row)

        processing_steps = self._build_processing_steps(
            row, tariff_trace, service_fee_trace, coupon_trace, device_trace
        )

        final_result = self._build_final_result(row)
        anomalies = self._detect_anomalies(row)
        needs_review = bool(row.get("needs_review", False))
        review_reason = row.get("review_reason")

        return TraceRecord(
            trace_id=trace_id,
            order_id=order_id,
            original_row_number=original_row,
            source_file=source_file,
            processing_steps=processing_steps,
            final_result=final_result,
            anomalies=anomalies,
            needs_review=needs_review,
            review_reason=review_reason,
            created_at=datetime.now()
        )

    def build_traces(
        self,
        df: pd.DataFrame,
        source_file: str,
        tariff_results: Optional[Dict] = None,
        service_fee_results: Optional[Dict] = None,
        coupon_results: Optional[Dict] = None,
        device_results: Optional[Dict] = None
    ) -> TraceResult:
        """批量构建追溯记录"""
        records = []
        trace_index = {}

        for idx, row in df.iterrows():
            order_id = row.get("order_id", "UNKNOWN")

            tariff_trace = tariff_results.get(order_id).calculation_trace if tariff_results and order_id in tariff_results else None
            service_fee_trace = service_fee_results.get(order_id).calculation_trace if service_fee_results and order_id in service_fee_results else None
            coupon_trace = coupon_results.get(order_id).calculation_trace if coupon_results and order_id in coupon_results else None
            device_trace = device_results.get(order_id).processing_trace if device_results and order_id in device_results else None

            record = self.create_trace(
                row, source_file, tariff_trace, service_fee_trace, coupon_trace, device_trace
            )
            records.append(record)
            trace_index[order_id] = record

        return TraceResult(records=records, trace_index=trace_index)

    def trace_to_dict(self, record: TraceRecord) -> Dict[str, Any]:
        """将追溯记录转换为字典（用于导出）"""
        return {
            "trace_id": record.trace_id,
            "order_id": record.order_id,
            "original_row_number": record.original_row_number,
            "source_file": record.source_file,
            "processing_steps": json.dumps(record.processing_steps, ensure_ascii=False, default=str),
            "final_result": json.dumps(record.final_result, ensure_ascii=False, default=str),
            "anomalies": ",".join(record.anomalies),
            "needs_review": record.needs_review,
            "review_reason": record.review_reason,
            "created_at": record.created_at.isoformat()
        }

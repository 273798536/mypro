"""
主流程协调器
核心功能：
1. 协调整个分析流程
2. 管理各模块之间的数据传递
3. 汇总所有结果
4. 提供统一的分析入口
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

from ..config.settings import get_config, OUTPUT_DIR
from .data_reader import DataReader, RawData
from .data_cleaner import DataCleaner, CleanedData
from .tariff_engine import TariffEngine, TariffEngineResult
from .service_fee_calculator import ServiceFeeCalculator, ServiceFeeEngineResult
from .coupon_processor import CouponProcessor, CouponEngineResult
from .device_status_handler import DeviceStatusHandler, DeviceStatusEngineResult
from .data_tracer import DataTracer, TraceResult
from .anomaly_detector import AnomalyDetector, AnomalyDetectionResult


@dataclass
class AnalysisResult:
    """完整分析结果"""
    raw_data: RawData
    cleaned_data: CleanedData
    tariff_result: TariffEngineResult
    service_fee_result: ServiceFeeEngineResult
    coupon_result: CouponEngineResult
    device_result: DeviceStatusEngineResult
    trace_result: TraceResult
    anomaly_result: AnomalyDetectionResult
    final_normal_df: pd.DataFrame
    final_offline_df: pd.DataFrame
    summary: Dict[str, Any]
    analysis_time: datetime
    source_file: str

    def get_summary(self) -> Dict[str, Any]:
        """获取总摘要"""
        return {
            "analysis_time": self.analysis_time.isoformat(),
            "source_file": self.source_file,
            "data_quality": {
                "total_rows": len(self.raw_data.df) + len(self.raw_data.bad_rows),
                "valid_rows": len(self.cleaned_data.df),
                "bad_rows": len(self.raw_data.bad_rows),
                "empty_rows": len(self.raw_data.empty_rows),
                "remark_rows": len(self.raw_data.remark_rows),
                "data_quality_score": self.cleaned_data.data_quality_score,
                "missing_columns": self.raw_data.missing_columns,
            },
            "device_status": self.device_result.calculation_summary,
            "revenue": {
                "total_electricity_fee": self.tariff_result.calculation_summary["total_electricity_fee"],
                "total_service_fee": self.service_fee_result.calculation_summary["total_service_fee"],
                "total_coupon_discount": self.coupon_result.calculation_summary["total_coupon_amount"],
                "net_revenue": round(
                    self.tariff_result.calculation_summary["total_electricity_fee"] +
                    self.service_fee_result.calculation_summary["total_service_fee"] -
                    self.coupon_result.calculation_summary["total_coupon_amount"],
                    2
                ),
            },
            "period_distribution": {
                "energy": self.tariff_result.calculation_summary["period_energy_distribution"],
                "electricity_fee": self.tariff_result.calculation_summary["period_fee_distribution"],
                "service_fee": self.service_fee_result.calculation_summary["period_distribution"],
            },
            "anomalies": self.anomaly_result.anomaly_summary,
            "cross_period": {
                "count": len(self.tariff_result.cross_period_orders),
                "ratio": self.tariff_result.calculation_summary["cross_period_ratio"],
            },
            "stacked_coupon": {
                "count": len(self.coupon_result.stacked_coupon_orders),
            },
        }


class AnalysisPipeline:
    """分析流程管道"""

    def __init__(self, override_tariff: Optional[Dict] = None):
        self.config = get_config()
        self.override_tariff = override_tariff

        self.reader = DataReader()
        self.cleaner = DataCleaner()
        self.tariff_engine = TariffEngine()
        self.service_fee_calculator = ServiceFeeCalculator()
        self.coupon_processor = CouponProcessor()
        self.device_handler = DeviceStatusHandler()
        self.tracer = DataTracer()
        self.anomaly_detector = AnomalyDetector()

    def run(
        self,
        file_path: str,
        sheet_name: Optional[str] = None
    ) -> AnalysisResult:
        """执行完整分析流程"""
        source_file = str(Path(file_path).name)
        analysis_time = datetime.now()

        raw_data = self.reader.read_file(file_path, sheet_name)
        cleaned_data = self.cleaner.clean(raw_data)
        tariff_result = self.tariff_engine.calculate(cleaned_data, self.override_tariff)
        service_fee_result = self.service_fee_calculator.calculate(cleaned_data.df, tariff_result)

        combined_df = tariff_result.df.merge(
            service_fee_result.df[[
                "order_id", "service_fee_rate_used", "is_service_fee_from_order",
                "calculated_service_fee", "peak_service_fee", "high_service_fee",
                "flat_service_fee", "valley_service_fee", "original_service_fee",
                "service_fee_diff"
            ]],
            on="order_id",
            how="left"
        )

        coupon_result = self.coupon_processor.process(combined_df)
        device_result = self.device_handler.process(coupon_result.df)

        all_normal_results = device_result.normal_results + device_result.offline_results
        all_results_df = pd.concat([device_result.normal_df, device_result.offline_df], ignore_index=True)

        tariff_map = {r.order_id: r for r in tariff_result.results}
        service_fee_map = {r.order_id: r for r in service_fee_result.results}
        coupon_map = {r.order_id: r for r in coupon_result.results}
        device_map = {r.order_id: r for r in all_normal_results}

        trace_result = self.tracer.build_traces(
            all_results_df, source_file, tariff_map, service_fee_map, coupon_map, device_map
        )

        all_results_with_trace = all_results_df.copy()
        trace_ids = []
        for idx, row in all_results_with_trace.iterrows():
            order_id = row.get("order_id")
            trace = trace_result.get_by_order_id(order_id)
            trace_ids.append(trace.trace_id if trace else "")
        all_results_with_trace["trace_id"] = trace_ids

        anomaly_result = self.anomaly_detector.detect(all_results_with_trace)

        final_normal_df = anomaly_result.df[anomaly_result.df["is_device_offline"] == False].copy()
        final_offline_df = anomaly_result.df[anomaly_result.df["is_device_offline"] == True].copy()

        final_normal_df["net_revenue"] = (
            final_normal_df["calculated_electricity_fee"].fillna(0) +
            final_normal_df["calculated_service_fee"].fillna(0) -
            final_normal_df["original_coupon_amount"].fillna(0)
        ).round(2)

        final_offline_df["net_revenue"] = (
            final_offline_df["calculated_electricity_fee"].fillna(0) +
            final_offline_df["calculated_service_fee"].fillna(0) -
            final_offline_df["original_coupon_amount"].fillna(0)
        ).round(2)

        summary = AnalysisResult(
            raw_data=raw_data,
            cleaned_data=cleaned_data,
            tariff_result=tariff_result,
            service_fee_result=service_fee_result,
            coupon_result=coupon_result,
            device_result=device_result,
            trace_result=trace_result,
            anomaly_result=anomaly_result,
            final_normal_df=final_normal_df,
            final_offline_df=final_offline_df,
            summary={},
            analysis_time=analysis_time,
            source_file=source_file
        ).get_summary()

        return AnalysisResult(
            raw_data=raw_data,
            cleaned_data=cleaned_data,
            tariff_result=tariff_result,
            service_fee_result=service_fee_result,
            coupon_result=coupon_result,
            device_result=device_result,
            trace_result=trace_result,
            anomaly_result=anomaly_result,
            final_normal_df=final_normal_df,
            final_offline_df=final_offline_df,
            summary=summary,
            analysis_time=analysis_time,
            source_file=source_file
        )

    def get_order_trace(self, result: AnalysisResult, order_id: str) -> Optional[Dict]:
        """获取单条订单的完整追溯信息"""
        trace = result.trace_result.get_by_order_id(order_id)
        if not trace:
            return None
        return {
            "trace_id": trace.trace_id,
            "order_id": trace.order_id,
            "source_file": trace.source_file,
            "original_row": trace.original_row_number,
            "processing_steps": trace.processing_steps,
            "final_result": trace.final_result,
            "anomalies": trace.anomalies,
            "needs_review": trace.needs_review,
            "review_reason": trace.review_reason,
        }

    def filter_by_anomaly_type(
        self,
        result: AnalysisResult,
        anomaly_type: str
    ) -> pd.DataFrame:
        """按异常类型筛选"""
        anomaly_map = {
            "cross_period": result.anomaly_result.cross_period_filter,
            "stacked_coupon": result.anomaly_result.stacked_coupon_filter,
            "offline_device": result.anomaly_result.offline_device_filter,
            "manual_supplement": result.anomaly_result.manual_supplement_filter,
            "needs_review": result.anomaly_result.needs_review_filter,
        }
        return anomaly_map.get(anomaly_type, pd.DataFrame())

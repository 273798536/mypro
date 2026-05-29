"""
设备状态处理模块
核心功能：
1. 设备状态识别（在线/离线/故障）
2. 离线设备数据单独处理（不混入正常结果）
3. 设备状态异常标记
4. 设备补录标记
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field

from ..config.settings import get_config


@dataclass
class DeviceStatusResult:
    """单条订单设备状态处理结果"""
    order_id: str
    original_row_number: int
    device_id: str
    device_name: Optional[str]
    original_status: Optional[str]
    normalized_status: str
    is_offline: bool
    is_fault: bool
    is_manual_supplement: bool
    needs_review: bool
    review_reason: Optional[str]
    processing_trace: Dict[str, Any]


@dataclass
class DeviceStatusEngineResult:
    """设备状态处理总结果"""
    normal_df: pd.DataFrame
    offline_df: pd.DataFrame
    normal_results: List[DeviceStatusResult]
    offline_results: List[DeviceStatusResult]
    offline_devices: List[str]
    fault_devices: List[str]
    manual_supplement_orders: List[str]
    calculation_summary: Dict[str, Any]


class DeviceStatusHandler:
    """设备状态处理器"""

    def __init__(self):
        self.config = get_config()

        self._offline_keywords = ["离线", "offline", "断线", "断连", "未连接", "失联"]
        self._fault_keywords = ["故障", "fault", "error", "异常", "损坏", "维修中"]
        self._online_keywords = ["在线", "online", "正常", "运行中", "可用"]
        self._supplement_keywords = ["补录", "补登", "手动", "人工", "补填"]

    def _normalize_status(self, status: Optional[str], remark: Optional[str] = None) -> str:
        """标准化设备状态"""
        if status is None or pd.isna(status):
            status = ""
        status_str = str(status).strip().lower()

        remark_str = ""
        if remark and not pd.isna(remark):
            remark_str = str(remark).strip().lower()

        combined = status_str + " " + remark_str

        for kw in self._offline_keywords:
            if kw.lower() in combined:
                return "离线"

        for kw in self._fault_keywords:
            if kw.lower() in combined:
                return "故障"

        for kw in self._online_keywords:
            if kw.lower() in combined:
                return "在线"

        return "在线"

    def _detect_manual_supplement(self, row: pd.Series) -> bool:
        """检测是否为人工补录数据"""
        for field in ["remark", "operator", "coupon_type", "device_status"]:
            value = row.get(field)
            if value and not pd.isna(value):
                value_str = str(value).strip().lower()
                for kw in self._supplement_keywords:
                    if kw.lower() in value_str:
                        return True
        return False

    def _needs_review(self, normalized_status: str, is_supplement: bool) -> Tuple[bool, Optional[str]]:
        """判断是否需要人工复核"""
        if normalized_status == "离线":
            return True, "设备离线，数据需复核"
        if normalized_status == "故障":
            return True, "设备故障，数据需复核"
        if is_supplement:
            return True, "人工补录数据，需复核"
        return False, None

    def process_order(self, row: pd.Series) -> DeviceStatusResult:
        """处理单条订单的设备状态"""
        order_id = row.get("order_id", "UNKNOWN")
        original_row = row.get("_original_row_number", 0)
        device_id = str(row.get("device_id", "UNKNOWN"))
        device_name = row.get("device_name")
        original_status = row.get("device_status")
        remark = row.get("remark")

        normalized_status = self._normalize_status(original_status, remark)
        is_offline = normalized_status == "离线"
        is_fault = normalized_status == "故障"
        is_supplement = self._detect_manual_supplement(row)
        needs_review, review_reason = self._needs_review(normalized_status, is_supplement)

        trace = {
            "original_status": original_status,
            "remark": remark,
            "normalized_status": normalized_status,
            "is_offline": is_offline,
            "is_fault": is_fault,
            "is_manual_supplement": is_supplement,
            "needs_review": needs_review,
            "review_reason": review_reason
        }

        return DeviceStatusResult(
            order_id=order_id,
            original_row_number=original_row,
            device_id=device_id,
            device_name=device_name,
            original_status=original_status,
            normalized_status=normalized_status,
            is_offline=is_offline,
            is_fault=is_fault,
            is_manual_supplement=is_supplement,
            needs_review=needs_review,
            review_reason=review_reason,
            processing_trace=trace
        )

    def process(self, df: pd.DataFrame) -> DeviceStatusEngineResult:
        """批量处理设备状态"""
        df = df.copy()
        normal_results = []
        offline_results = []
        offline_devices = []
        fault_devices = []
        manual_supplement_orders = []

        normal_rows = []
        offline_rows = []

        for idx, row in df.iterrows():
            result = self.process_order(row)

            df.loc[idx, "normalized_device_status"] = result.normalized_status
            df.loc[idx, "is_device_offline"] = result.is_offline
            df.loc[idx, "is_device_fault"] = result.is_fault
            df.loc[idx, "is_manual_supplement"] = result.is_manual_supplement
            df.loc[idx, "needs_review"] = result.needs_review
            df.loc[idx, "review_reason"] = result.review_reason

            if result.is_offline:
                offline_results.append(result)
                offline_rows.append(df.loc[idx])
                if result.device_id not in offline_devices:
                    offline_devices.append(result.device_id)
            else:
                normal_results.append(result)
                normal_rows.append(df.loc[idx])

            if result.is_fault and result.device_id not in fault_devices:
                fault_devices.append(result.device_id)

            if result.is_manual_supplement:
                manual_supplement_orders.append(result.order_id)

        normal_df = pd.DataFrame(normal_rows).reset_index(drop=True) if normal_rows else df.iloc[0:0]
        offline_df = pd.DataFrame(offline_rows).reset_index(drop=True) if offline_rows else df.iloc[0:0]

        summary = {
            "total_orders": len(normal_results) + len(offline_results),
            "normal_orders": len(normal_results),
            "offline_orders": len(offline_results),
            "offline_devices_count": len(offline_devices),
            "fault_devices_count": len(fault_devices),
            "manual_supplement_orders": len(manual_supplement_orders),
            "offline_ratio": round(
                len(offline_results) / (len(normal_results) + len(offline_results)) * 100, 2
            ) if (len(normal_results) + len(offline_results)) > 0 else 0,
            "offline_devices": offline_devices,
            "fault_devices": fault_devices
        }

        return DeviceStatusEngineResult(
            normal_df=normal_df,
            offline_df=offline_df,
            normal_results=normal_results,
            offline_results=offline_results,
            offline_devices=offline_devices,
            fault_devices=fault_devices,
            manual_supplement_orders=manual_supplement_orders,
            calculation_summary=summary
        )

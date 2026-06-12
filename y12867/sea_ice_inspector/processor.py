import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import logging

from .models import (
    BuoyData,
    InspectionPhoto,
    ProcessingRecord,
    ProcessingBatch,
    DataStatus,
    ExceptionType,
    ExceptionTrace,
    DataGap,
)
from .tide import TideCalculator
from config import NO_SAIL_ZONES, ICE_THICKNESS_THRESHOLD

logger = logging.getLogger(__name__)


class DataProcessingEngine:
    def __init__(self):
        self.tide_calculator = TideCalculator()

    def _generate_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:8]}"

    def _check_no_sail_zone(self, lat: float, lon: float) -> Tuple[bool, Optional[str]]:
        for zone_name, zone in NO_SAIL_ZONES.items():
            if (zone["lat_min"] <= lat <= zone["lat_max"] and
                zone["lon_min"] <= lon <= zone["lon_max"]):
                return True, zone_name
        return False, None

    def _create_exception_trace(
        self,
        record: ProcessingRecord,
        ex_type: ExceptionType,
        description: str,
        opinion: str,
    ) -> ExceptionTrace:
        return ExceptionTrace(
            trace_id=self._generate_id("trace"),
            processing_record_id=record.record_id,
            exception_type=ex_type,
            detected_time=datetime.now(),
            description=description,
            original_buoy_data_ref=record.buoy_data.raw_source,
            processing_opinion=opinion,
        )

    def _create_data_gap(
        self,
        record: ProcessingRecord,
        gap_type: ExceptionType,
        description: str,
        reported_to: str = "科研助理",
    ) -> DataGap:
        return DataGap(
            gap_id=self._generate_id("gap"),
            processing_record_id=record.record_id,
            buoy_id=record.buoy_id,
            gap_type=gap_type,
            description=description,
            reported_to=reported_to,
            reported_time=datetime.now(),
        )

    def process_single_record(
        self,
        buoy_data: BuoyData,
        photo_map: Dict[str, InspectionPhoto],
        fail_fast: bool = False,
    ) -> ProcessingRecord:
        record = ProcessingRecord(
            record_id=self._generate_id("rec"),
            buoy_id=buoy_data.buoy_id,
            buoy_data=buoy_data,
            processing_time=datetime.now(),
        )

        photo = photo_map.get(buoy_data.buoy_id)
        if photo:
            record.inspection_photo = photo
        else:
            gap = self._create_data_gap(
                record,
                ExceptionType.MISSING_PHOTO,
                f"浮标 {buoy_data.buoy_id} 缺少巡检照片，请补充上传",
            )
            record.data_gaps.append(gap)

            if fail_fast:
                record.status = DataStatus.FAILED
                logger.warning(f"记录 {record.record_id} 因缺少照片失败（fail_fast模式）")
                return record

            trace = self._create_exception_trace(
                record,
                ExceptionType.MISSING_PHOTO,
                f"浮标 {buoy_data.buoy_id} 未关联巡检照片，已标记数据缺口",
                "先进行潮汐校正计算，待照片补充后可复核修正最终厚度",
            )
            record.exception_traces.append(trace)

        in_zone, zone_name = self._check_no_sail_zone(
            buoy_data.latitude, buoy_data.longitude
        )
        if in_zone:
            record.is_no_sail_violation = True
            record.no_sail_zone = zone_name
            trace = self._create_exception_trace(
                record,
                ExceptionType.NO_SAIL_ZONE_VIOLATION,
                f"浮标 {buoy_data.buoy_id} 位于禁航区 {zone_name} 内",
                "已标记为禁航区越界异常，需海事处特别关注，厚度数据仅供参考",
            )
            record.exception_traces.append(trace)

        if buoy_data.ice_thickness > ICE_THICKNESS_THRESHOLD * 2:
            trace = self._create_exception_trace(
                record,
                ExceptionType.ABNORMAL_THICKNESS,
                f"浮标 {buoy_data.buoy_id} 冰厚 {buoy_data.ice_thickness}cm 超过阈值两倍",
                "数据异常偏高，建议复核浮标读数或现场确认，当前已纳入统计但标记为异常",
            )
            record.exception_traces.append(trace)

        try:
            tide_result = self.tide_calculator.calculate(
                record_id=record.record_id,
                buoy_id=buoy_data.buoy_id,
                latitude=buoy_data.latitude,
                longitude=buoy_data.longitude,
                timestamp=buoy_data.timestamp,
                raw_thickness=buoy_data.ice_thickness,
            )
            record.tide_calculation = tide_result

            if tide_result.current_tide < -1.0:
                trace = self._create_exception_trace(
                    record,
                    ExceptionType.TIDE_ANOMALY,
                    f"浮标 {buoy_data.buoy_id} 潮汐值 {tide_result.current_tide}m 异常偏低",
                    "潮汐校正因子已自动调整，建议人工复核潮汐数据",
                )
                record.exception_traces.append(trace)

            record.final_ice_thickness = tide_result.tide_corrected_thickness

            if photo and not record.exception_traces:
                record.status = DataStatus.PROCESSED
            elif not record.exception_traces and record.data_gaps:
                record.status = DataStatus.PARTIAL
            elif record.exception_traces and not record.data_gaps:
                record.status = DataStatus.PARTIAL
            else:
                record.status = DataStatus.PARTIAL

        except Exception as e:
            logger.error(f"潮汐计算失败: {e}")
            trace = self._create_exception_trace(
                record,
                ExceptionType.TIDE_ANOMALY,
                f"潮汐计算失败: {str(e)}",
                "使用原始厚度作为最终值，待潮汐数据修复后重新计算",
            )
            record.exception_traces.append(trace)
            record.final_ice_thickness = buoy_data.ice_thickness
            record.status = DataStatus.PARTIAL

        return record

    def process_batch(
        self,
        buoy_data_list: List[BuoyData],
        photo_list: List[InspectionPhoto],
        fail_fast: bool = False,
    ) -> ProcessingBatch:
        batch = ProcessingBatch(
            batch_id=self._generate_id("batch"),
            created_at=datetime.now(),
        )

        photo_map = {p.buoy_id: p for p in photo_list}

        logger.info(f"开始处理批数据: {len(buoy_data_list)} 条浮标数据, {len(photo_list)} 张照片")

        for buoy_data in buoy_data_list:
            try:
                record = self.process_single_record(buoy_data, photo_map, fail_fast)
                batch.records.append(record)
            except Exception as e:
                logger.error(f"处理浮标 {buoy_data.buoy_id} 失败: {e}")
                error_record = ProcessingRecord(
                    record_id=self._generate_id("rec"),
                    buoy_id=buoy_data.buoy_id,
                    buoy_data=buoy_data,
                    status=DataStatus.FAILED,
                    processing_time=datetime.now(),
                )
                trace = self._create_exception_trace(
                    error_record,
                    ExceptionType.DATA_GAP,
                    f"处理失败: {str(e)}",
                    "需要重新导入数据或人工介入处理",
                )
                error_record.exception_traces.append(trace)
                batch.records.append(error_record)

        batch.update_stats()

        logger.info(
            f"批处理完成: 总计 {batch.total_count}, "
            f"成功 {batch.processed_count}, "
            f"部分成功 {batch.partial_count}, "
            f"失败 {batch.failed_count}, "
            f"数据缺口 {batch.gaps_count}"
        )

        return batch

    def get_unified_data_source(self, batch: ProcessingBatch) -> List[Dict]:
        return [record.to_dict() for record in batch.records]

    def get_data_gaps_report(self, batch: ProcessingBatch) -> List[Dict]:
        gaps = []
        for record in batch.records:
            for gap in record.data_gaps:
                if not gap.resolved:
                    gaps.append({
                        "gap_id": gap.gap_id,
                        "buoy_id": gap.buoy_id,
                        "gap_type": gap.gap_type.value,
                        "description": gap.description,
                        "reported_to": gap.reported_to,
                        "reported_time": gap.reported_time.isoformat(),
                        "record_id": record.record_id,
                    })
        return gaps

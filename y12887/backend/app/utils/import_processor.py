import pandas as pd
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
import io

from ..models import (
    BeachInfo, InspectionRecord, BuoyData, ProcessingRecord,
    AnomalyRecord, DataGap
)
from .calculator import (
    TrajectoryDriftCalculator, WaterQualityCalculator,
    calculate_risk_level, check_no_navigation_violation,
    TRAJECTORY_DRIFT_FORMULA, WATER_QUALITY_FORMULA
)


class DataImportProcessor:
    """数据导入处理器 - 支持浮标数据缺失容错"""

    def __init__(self, db: Session):
        self.db = db
        self.drift_calc = TrajectoryDriftCalculator()
        self.water_calc = WaterQualityCalculator()
        self.batch_no = f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.gaps: List[DataGap] = []
        self.success_count = 0
        self.partial_count = 0
        self.failed_count = 0

    def _read_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """读取CSV或Excel文件"""
        if filename.lower().endswith('.csv'):
            return pd.read_csv(io.BytesIO(file_content))
        elif filename.lower().endswith(('.xlsx', '.xls')):
            return pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("不支持的文件格式，仅支持CSV和Excel")

    def _get_or_create_beach(self, beach_code: str, beach_name: str,
                              lat: float, lng: float) -> BeachInfo:
        """获取或创建浴场信息"""
        beach = self.db.query(BeachInfo).filter(BeachInfo.code == beach_code).first()
        if not beach:
            beach = BeachInfo(
                code=beach_code,
                name=beach_name or beach_code,
                latitude=lat,
                longitude=lng,
                safe_zone_radius=500.0
            )
            self.db.add(beach)
            self.db.flush()
        return beach

    def _check_missing_fields(self, row: pd.Series, required_fields: List[str]) -> List[str]:
        """检查缺失字段"""
        missing = []
        for field in required_fields:
            if field not in row or pd.isna(row[field]) or str(row[field]).strip() == '':
                missing.append(field)
        return missing

    def _create_inspection_record(self, row: pd.Series, beach: BeachInfo) -> Tuple[Optional[InspectionRecord], Optional[str]]:
        """创建巡检记录"""
        required_fields = ['record_no', 'inspection_time']
        missing = self._check_missing_fields(row, required_fields)

        if missing:
            gap = DataGap(
                batch_no=self.batch_no,
                beach_id=beach.id,
                gap_type="inspection_missing",
                description=f"巡检记录缺失关键字段: {', '.join(missing)}",
                missing_fields=json.dumps(missing, ensure_ascii=False)
            )
            self.gaps.append(gap)
            return None, f"缺失字段: {', '.join(missing)}"

        try:
            inspection_time = pd.to_datetime(row['inspection_time']).to_pydatetime()
        except Exception as e:
            gap = DataGap(
                batch_no=self.batch_no,
                beach_id=beach.id,
                gap_type="inspection_missing",
                description=f"巡检时间格式错误: {row.get('inspection_time')}",
                missing_data_time=datetime.now()
            )
            self.gaps.append(gap)
            return None, f"时间格式错误: {str(e)}"

        inspection = InspectionRecord(
            record_no=str(row['record_no']),
            beach_id=beach.id,
            inspection_time=inspection_time,
            inspector=str(row.get('inspector', '')) if pd.notna(row.get('inspector')) else None,
            weather=str(row.get('weather', '')) if pd.notna(row.get('weather')) else None,
            temperature=float(row['temperature']) if pd.notna(row.get('temperature')) else None,
            wind_direction=str(row.get('wind_direction', '')) if pd.notna(row.get('wind_direction')) else None,
            wind_level=str(row.get('wind_level', '')) if pd.notna(row.get('wind_level')) else None,
            wave_height=float(row['wave_height']) if pd.notna(row.get('wave_height')) else None,
            tide_level=str(row.get('tide_level', '')) if pd.notna(row.get('tide_level')) else None,
            photo_path=str(row.get('photo_path', '')) if pd.notna(row.get('photo_path')) else None,
            photo_name=str(row.get('photo_name', '')) if pd.notna(row.get('photo_name')) else None,
            remark=str(row.get('remark', '')) if pd.notna(row.get('remark')) else None
        )
        self.db.add(inspection)
        self.db.flush()
        return inspection, None

    def _create_buoy_data(self, row: pd.Series, beach: BeachInfo) -> Tuple[Optional[BuoyData], List[str], Optional[str]]:
        """创建浮标数据 - 支持部分字段缺失"""
        required_fields = ['buoy_id', 'record_time']
        missing = self._check_missing_fields(row, required_fields)

        if missing:
            gap = DataGap(
                batch_no=self.batch_no,
                beach_id=beach.id,
                gap_type="buoy_missing",
                description=f"浮标数据缺失关键字段: {', '.join(missing)}",
                missing_fields=json.dumps(missing, ensure_ascii=False)
            )
            self.gaps.append(gap)
            return None, [], f"缺失字段: {', '.join(missing)}"

        try:
            record_time = pd.to_datetime(row['record_time']).to_pydatetime()
        except Exception as e:
            gap = DataGap(
                batch_no=self.batch_no,
                beach_id=beach.id,
                gap_type="buoy_missing",
                description=f"浮标记录时间格式错误: {row.get('record_time')}",
                missing_data_time=datetime.now()
            )
            self.gaps.append(gap)
            return None, [], f"时间格式错误: {str(e)}"

        all_fields = [
            'latitude', 'longitude', 'water_temperature', 'ph_value',
            'dissolved_oxygen', 'turbidity', 'salinity',
            'current_speed', 'current_direction', 'wave_height', 'wave_period'
        ]
        missing_fields = self._check_missing_fields(row, all_fields)

        is_missing = len(missing_fields) > 0

        buoy = BuoyData(
            buoy_id=str(row['buoy_id']),
            beach_id=beach.id,
            record_time=record_time,
            latitude=float(row['latitude']) if pd.notna(row.get('latitude')) else None,
            longitude=float(row['longitude']) if pd.notna(row.get('longitude')) else None,
            water_temperature=float(row['water_temperature']) if pd.notna(row.get('water_temperature')) else None,
            ph_value=float(row['ph_value']) if pd.notna(row.get('ph_value')) else None,
            dissolved_oxygen=float(row['dissolved_oxygen']) if pd.notna(row.get('dissolved_oxygen')) else None,
            turbidity=float(row['turbidity']) if pd.notna(row.get('turbidity')) else None,
            salinity=float(row['salinity']) if pd.notna(row.get('salinity')) else None,
            current_speed=float(row['current_speed']) if pd.notna(row.get('current_speed')) else None,
            current_direction=float(row['current_direction']) if pd.notna(row.get('current_direction')) else None,
            wave_height=float(row['wave_height']) if pd.notna(row.get('wave_height')) else None,
            wave_period=float(row['wave_period']) if pd.notna(row.get('wave_period')) else None,
            is_missing=is_missing,
            missing_fields=json.dumps(missing_fields, ensure_ascii=False) if missing_fields else None
        )
        self.db.add(buoy)
        self.db.flush()

        if is_missing:
            gap = DataGap(
                batch_no=self.batch_no,
                beach_id=beach.id,
                gap_type="buoy_missing",
                description=f"浮标{row['buoy_id']}部分数据缺失: {', '.join(missing_fields)}",
                missing_data_time=record_time,
                missing_fields=json.dumps(missing_fields, ensure_ascii=False)
            )
            self.gaps.append(gap)

        return buoy, missing_fields, None

    def _create_anomaly_record(self, processing_record: ProcessingRecord,
                                anomaly_type: str, anomaly_value: float,
                                threshold: float, unit: str, formula: str,
                                description: str) -> AnomalyRecord:
        """创建异常记录"""
        anomaly_no = f"ANOM{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"

        anomaly_level = "一般"
        if anomaly_type == "trajectory_drift":
            if anomaly_value > threshold * 2:
                anomaly_level = "严重"
            elif anomaly_value > threshold * 1.5:
                anomaly_level = "一般"
            else:
                anomaly_level = "轻微"
        elif anomaly_type == "water_quality":
            if anomaly_value < 30:
                anomaly_level = "严重"
            elif anomaly_value < 50:
                anomaly_level = "一般"
            else:
                anomaly_level = "轻微"

        anomaly = AnomalyRecord(
            anomaly_no=anomaly_no,
            processing_record_id=processing_record.id,
            beach_id=processing_record.beach_id,
            anomaly_type=anomaly_type,
            anomaly_level=anomaly_level,
            description=description,
            anomaly_value=anomaly_value,
            threshold=threshold,
            unit=unit,
            formula=formula,
            occurrence_time=processing_record.process_time
        )
        self.db.add(anomaly)
        return anomaly

    def _process_single_record(self, row: pd.Series, beach: BeachInfo) -> str:
        """处理单条记录 - 核心逻辑：能算的先算，不能算的记缺口"""
        inspection, inspect_error = self._create_inspection_record(row, beach)
        buoy, missing_fields, buoy_error = self._create_buoy_data(row, beach)

        processing = ProcessingRecord(
            batch_no=self.batch_no,
            inspection_id=inspection.id if inspection else None,
            buoy_data_id=buoy.id if buoy else None,
            beach_id=beach.id
        )
        self.db.add(processing)
        self.db.flush()

        drift_result = None
        water_result = None
        calc_status = "success"
        failure_reasons = []

        if buoy and buoy.latitude and buoy.longitude and beach.safe_zone_radius:
            drift_result = self.drift_calc.calculate(
                beach.latitude, beach.longitude,
                buoy.latitude, buoy.longitude,
                beach.safe_zone_radius
            )

            if drift_result["failure_reason"]:
                failure_reasons.append(f"漂移{drift_result['failure_reason']}")
                gap = DataGap(
                    batch_no=self.batch_no,
                    beach_id=beach.id,
                    gap_type="calc_failure",
                    description=f"轨迹漂移计算失败: {drift_result['failure_reason']}",
                    missing_fields=json.dumps(["latitude", "longitude"], ensure_ascii=False)
                )
                self.gaps.append(gap)
            else:
                processing.trajectory_drift = drift_result["drift_distance"]
                processing.is_drift_abnormal = drift_result["is_abnormal"]
                processing.drift_calculation_note = drift_result["calculation_note"]

                if drift_result["is_abnormal"]:
                    self._create_anomaly_record(
                        processing, "trajectory_drift",
                        drift_result["drift_distance"], beach.safe_zone_radius,
                        TRAJECTORY_DRIFT_FORMULA.unit, TRAJECTORY_DRIFT_FORMULA.formula,
                        drift_result["calculation_note"]
                    )

            if beach.no_navigation_coords:
                violation = check_no_navigation_violation(
                    buoy.latitude, buoy.longitude, beach.no_navigation_coords
                )
                if violation["is_violation"]:
                    self._create_anomaly_record(
                        processing, "no_navigation_violation",
                        1.0, 0.0, "是/否", violation["formula"],
                        violation["violation_note"]
                    )

        if buoy:
            water_result = self.water_calc.calculate(
                water_temperature=buoy.water_temperature,
                ph_value=buoy.ph_value,
                dissolved_oxygen=buoy.dissolved_oxygen,
                turbidity=buoy.turbidity,
                salinity=buoy.salinity
            )

            if water_result["failure_reason"]:
                failure_reasons.append(f"水质{water_result['failure_reason']}")
                gap = DataGap(
                    batch_no=self.batch_no,
                    beach_id=beach.id,
                    gap_type="calc_failure",
                    description=f"水质计算失败: {water_result['failure_reason']}",
                    missing_fields=json.dumps(missing_fields, ensure_ascii=False)
                )
                self.gaps.append(gap)
            else:
                processing.water_quality_level = water_result["quality_level"]
                processing.water_quality_score = water_result["quality_score"]
                processing.is_water_abnormal = water_result["is_abnormal"]
                processing.water_calculation_note = water_result["calculation_note"]

                if water_result["is_abnormal"]:
                    self._create_anomaly_record(
                        processing, "water_quality",
                        water_result["quality_score"], WATER_QUALITY_FORMULA.threshold,
                        WATER_QUALITY_FORMULA.unit, WATER_QUALITY_FORMULA.formula,
                        water_result["calculation_note"]
                    )

        drift_abnormal = processing.is_drift_abnormal or False
        water_abnormal = processing.is_water_abnormal or False
        drift_value = processing.trajectory_drift or 0
        water_score = processing.water_quality_score or 100

        risk = calculate_risk_level(drift_abnormal, water_abnormal, drift_value, water_score)
        processing.risk_level = risk["risk_level"]
        processing.risk_score = risk["risk_score"]

        if failure_reasons:
            if (drift_result and drift_result["drift_distance"] is not None) or \
               (water_result and water_result["quality_score"] > 0):
                calc_status = "partial"
                processing.calculation_status = "partial"
                processing.failure_reason = "部分计算失败: " + "; ".join(failure_reasons)
                self.partial_count += 1
            else:
                calc_status = "failed"
                processing.calculation_status = "failed"
                processing.failure_reason = "计算失败: " + "; ".join(failure_reasons)
                self.failed_count += 1
        else:
            processing.calculation_status = "success"
            self.success_count += 1

        processing.has_processed = True
        processing.processing_opinion = "系统自动处理"
        processing.processed_by = "system"
        processing.processed_at = datetime.now()

        return calc_status

    def process(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """处理导入文件"""
        df = self._read_file(file_content, filename)
        total_records = len(df)

        for idx, row in df.iterrows():
            try:
                beach_code = str(row.get('beach_code', f'BEACH{idx:03d}'))
                beach_name = str(row.get('beach_name', beach_code))
                beach_lat = float(row.get('beach_latitude', 36.0671))
                beach_lng = float(row.get('beach_longitude', 120.3826))

                beach = self._get_or_create_beach(beach_code, beach_name, beach_lat, beach_lng)
                self._process_single_record(row, beach)

            except Exception as e:
                self.failed_count += 1
                gap = DataGap(
                    batch_no=self.batch_no,
                    beach_id=1,
                    gap_type="calc_failure",
                    description=f"第{idx+1}行处理异常: {str(e)}"
                )
                self.gaps.append(gap)

        for gap in self.gaps:
            self.db.add(gap)

        self.db.commit()

        gaps_response = []
        for gap in self.gaps:
            gaps_response.append({
                "id": gap.id,
                "batch_no": gap.batch_no,
                "beach_id": gap.beach_id,
                "gap_type": gap.gap_type,
                "description": gap.description,
                "missing_data_time": gap.missing_data_time,
                "missing_fields": gap.missing_fields,
                "is_filled": gap.is_filled,
                "created_at": gap.created_at
            })

        return {
            "batch_no": self.batch_no,
            "total_records": total_records,
            "success_count": self.success_count,
            "partial_count": self.partial_count,
            "failed_count": self.failed_count,
            "gap_count": len(self.gaps),
            "message": f"导入完成：成功{self.success_count}条，部分成功{self.partial_count}条，失败{self.failed_count}条，数据缺口{len(self.gaps)}个",
            "gaps": gaps_response
        }

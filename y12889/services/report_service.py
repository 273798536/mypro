from sqlalchemy.orm import Session
from typing import Dict, Optional, List
from datetime import datetime
from models import (
    Experiment, Report, RiskNotification, BuoyData,
    VesselTrack, WeatherForecast, BlockReason, ExperimentStatus
)
from schemas import ReportCreate, ExportReportResponse, RiskNotificationResponse
from services.trace_service import TraceService
from services.weather_service import WeatherService
import uuid
import json


class ReportService:
    @staticmethod
    def generate_report(
        db: Session,
        experiment_id: int,
        report_type: str,
        generated_by: str = None
    ) -> Report:
        experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not experiment:
            return None

        buoy_data = db.query(BuoyData).filter(BuoyData.experiment_id == experiment_id).all()
        tracks = db.query(VesselTrack).filter(VesselTrack.experiment_id == experiment_id).all()
        risks = db.query(RiskNotification).filter(RiskNotification.experiment_id == experiment_id).all()

        valid_buoys = [b for b in buoy_data if b.depth >= 0]
        blocked_buoys = [b for b in buoy_data if b.depth < 0]

        weather_impact = WeatherService.analyze_weather_impact(db, experiment_id)

        report_no = f"RPT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        depth_block_explanation = None
        depth_blocks = [r for r in risks if r.block_reason == BlockReason.NEGATIVE_DEPTH]
        if depth_blocks:
            blocked_with_depth = [
                {"id": r.related_data_id, "depth": b.depth, "time": b.record_time.isoformat()}
                for r in depth_blocks
                for b in blocked_buoys
                if b.id == r.related_data_id
            ]
            depth_block_explanation = (
                f"本次实验共发现{len(depth_blocks)}条深度为负的记录已被拦截。"
                f"海洋深度测量值不能为负，负值表明传感器可能发生倒置、信号干扰或数据传输错误。"
                f"拦截详情: {json.dumps(blocked_with_depth, ensure_ascii=False)}"
            )

        content_summary = (
            f"实验编号: {experiment.experiment_no}, "
            f"船舶: {experiment.vessel_name}, "
            f"有效数据: {len(valid_buoys)}条, "
            f"拦截数据: {len(blocked_buoys)}条, "
            f"风险通报: {len(risks)}条"
        )

        weather_impact_details = None
        if weather_impact and weather_impact["impacted"]:
            weather_impact_details = "; ".join(weather_impact["impacted_conclusions"])

        report = Report(
            experiment_id=experiment_id,
            report_no=report_no,
            report_type=report_type,
            generated_by=generated_by,
            content_summary=content_summary,
            has_blocked_records=len(blocked_buoys) > 0,
            blocked_count=len(blocked_buoys),
            valid_count=len(valid_buoys),
            weather_impacted=weather_impact["impacted"] if weather_impact else False,
            weather_impact_details=weather_impact_details
        )

        db.add(report)
        db.flush()

        TraceService.add_trace(
            db,
            experiment_id=experiment_id,
            operation="generate_report",
            old_status=experiment.status.value,
            new_status=ExperimentStatus.EXPORTED.value,
            operator=generated_by,
            remark=f"生成报告: {report_no}, 类型: {report_type}",
            affected_data=f"有效数据{len(valid_buoys)}条, 拦截{len(blocked_buoys)}条"
        )

        experiment.status = ExperimentStatus.EXPORTED
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_export_report_data(db: Session, report_id: int) -> Optional[ExportReportResponse]:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return None

        experiment = db.query(Experiment).filter(Experiment.id == report.experiment_id).first()
        risks = db.query(RiskNotification).filter(
            RiskNotification.experiment_id == report.experiment_id
        ).all()

        depth_block_explanation = None
        depth_blocks = [r for r in risks if r.block_reason == BlockReason.NEGATIVE_DEPTH]
        if depth_blocks:
            buoy_data = db.query(BuoyData).filter(
                BuoyData.experiment_id == report.experiment_id,
                BuoyData.depth < 0
            ).all()

            depth_block_explanation = (
                "【深度为负拦截说明】\n"
                "根据海洋观测规范，深度测量值必须大于等于0米。\n"
                f"本次实验共检测到{len(buoy_data)}条深度为负的记录，均已拦截。\n\n"
            )

            for i, bd in enumerate(buoy_data, 1):
                depth_block_explanation += (
                    f"{i}. 记录ID: {bd.id}, 浮标: {bd.buoy_id}, "
                    f"时间: {bd.record_time.strftime('%Y-%m-%d %H:%M:%S')}, "
                    f"测量深度: {bd.depth}米\n"
                    f"   可能原因: 传感器倒置/信号干扰/数据传输错误\n"
                    f"   处理方式: 该记录不纳入酸化分析，已在风险通报中备案\n\n"
                )

            depth_block_explanation += (
                "如船队对拦截有疑问，请联系数据处理人员复核原始数据。"
            )

        period = ""
        if experiment.start_date:
            period += experiment.start_date.strftime("%Y-%m-%d")
        if experiment.end_date:
            period += " 至 " + experiment.end_date.strftime("%Y-%m-%d")

        return ExportReportResponse(
            report_no=report.report_no,
            experiment_no=experiment.experiment_no,
            vessel_name=experiment.vessel_name,
            period=period,
            status=experiment.status.value,
            valid_data_count=report.valid_count,
            blocked_data_count=report.blocked_count,
            risk_notifications=[
                RiskNotificationResponse.model_validate(r) for r in risks
            ],
            weather_impacted=report.weather_impacted,
            weather_impact_details=report.weather_impact_details,
            depth_block_explanation=depth_block_explanation
        )

    @staticmethod
    def get_reports_by_experiment(db: Session, experiment_id: int):
        return (
            db.query(Report)
            .filter(Report.experiment_id == experiment_id)
            .order_by(Report.generated_at.desc())
            .all()
        )

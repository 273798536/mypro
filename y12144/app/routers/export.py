from typing import Optional, Dict, Any
import io
import csv
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Station, Arrival, VelocityModel, InversionResult, InversionStation, DataStatus
from app.schemas import StationOut, ArrivalOut, VelocityModelOut, InversionDetail, InversionStationOut
from app.status_machine import get_status_display, get_verifier_display

router = APIRouter()


@router.get("/stations/csv")
def export_stations_csv(db: Session = Depends(get_db)):
    stations = db.query(Station).order_by(Station.station_code).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "台站代码", "台站名称", "纬度(°N)", "经度(°E)", "海拔(m)",
        "台网", "状态", "创建时间", "更新时间"
    ])
    
    for st in stations:
        writer.writerow([
            st.station_code, st.name or "",
            f"{st.latitude:.6f}", f"{st.longitude:.6f}",
            f"{st.elevation:.1f}", st.network or "",
            st.status.value,
            st.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            st.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename=stations_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/arrivals/csv")
def export_arrivals_csv(
    event_tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Arrival).join(Station).order_by(Arrival.event_tag, Station.station_code, Arrival.phase)
    if event_tag:
        query = query.filter(Arrival.event_tag == event_tag)
    
    arrivals = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "事件标签", "台站代码", "台站名称", "震相",
        "到时(s)", "到时字符串", "不确定度(s)",
        "状态", "下一审核人", "备注", "震级备注", "有震级更新",
        "创建时间", "更新时间"
    ])
    
    for arr in arrivals:
        writer.writerow([
            arr.event_tag,
            arr.station.station_code if arr.station else "",
            arr.station.name if arr.station and arr.station.name else "",
            arr.phase,
            f"{arr.arrival_time:.3f}" if arr.arrival_time is not None else "",
            arr.arrival_time_str or "",
            f"{arr.uncertainty:.3f}" if arr.uncertainty else "",
            arr.status.value,
            arr.next_verifier.value if arr.next_verifier else "",
            arr.remark or "",
            arr.magnitude_remark or "",
            "是" if arr.has_magnitude_update else "否",
            arr.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            arr.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        ])
    
    output.seek(0)
    filename = f"arrivals_{event_tag or 'all'}_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/inversion/{inversion_id}/csv")
def export_inversion_csv(inversion_id: int, db: Session = Depends(get_db)):
    inv = db.query(InversionResult).filter(InversionResult.id == inversion_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"反演结果 {inversion_id} 不存在")
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["=== 震源反演结果 ==="])
    writer.writerow(["事件标签", inv.event_tag])
    writer.writerow(["纬度(°N)", f"{inv.latitude:.6f}"])
    writer.writerow(["经度(°E)", f"{inv.longitude:.6f}"])
    writer.writerow(["深度(km)", f"{inv.depth:.2f}"])
    writer.writerow(["发震时刻(s)", f"{inv.origin_time:.3f}"])
    writer.writerow(["发震时刻", inv.origin_time_str or ""])
    writer.writerow(["震级", f"{inv.magnitude:.2f}" if inv.magnitude else ""])
    writer.writerow(["残差均值(s)", f"{inv.residual_mean:.4f}" if inv.residual_mean else ""])
    writer.writerow(["残差标准差(s)", f"{inv.residual_std:.4f}" if inv.residual_std else ""])
    writer.writerow(["使用台站数", inv.num_stations_used])
    writer.writerow(["剔除台站数", inv.num_stations_rejected])
    writer.writerow(["迭代次数", inv.iterations])
    writer.writerow(["是否收敛", "是" if inv.convergence else "否"])
    writer.writerow(["状态", inv.status.value])
    writer.writerow(["波速模型", inv.velocity_model.model_name if inv.velocity_model else ""])
    writer.writerow(["版本", inv.velocity_model.version if inv.velocity_model else ""])
    writer.writerow(["备注", inv.remark or ""])
    writer.writerow([])
    
    writer.writerow(["=== 台站残差详情 ==="])
    writer.writerow([
        "台站代码", "台站名称", "震相", "观测到时(s)", "计算到时(s)",
        "残差(s)", "权重", "是否剔除", "剔除原因"
    ])
    
    for inv_st in inv.stations_used:
        st = db.query(Station).filter(Station.id == inv_st.station_id).first()
        writer.writerow([
            st.station_code if st else "",
            st.name if st and st.name else "",
            inv_st.phase,
            f"{inv_st.observed_time:.3f}" if inv_st.observed_time else "",
            f"{inv_st.calculated_time:.3f}" if inv_st.calculated_time else "",
            f"{inv_st.residual:.4f}" if inv_st.residual else "",
            f"{inv_st.weight:.2f}",
            "是" if inv_st.is_rejected else "否",
            inv_st.reject_reason or ""
        ])
    
    output.seek(0)
    filename = f"inversion_{inv.event_tag}_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/inversion/{inversion_id}/json")
def export_inversion_json(inversion_id: int, db: Session = Depends(get_db)):
    from app.schemas import InversionDetail, InversionStationOut
    
    inv = db.query(InversionResult).filter(InversionResult.id == inversion_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=f"反演结果 {inversion_id} 不存在")
    
    result = InversionDetail.model_validate(inv)
    station_results = []
    for inv_station in inv.stations_used:
        station = db.query(Station).filter(Station.id == inv_station.station_id).first()
        sr = InversionStationOut(
            id=inv_station.id,
            station_id=inv_station.station_id,
            station_code=station.station_code if station else "未知",
            station_name=station.name if station else None,
            arrival_id=inv_station.arrival_id,
            phase=inv_station.phase,
            observed_time=inv_station.observed_time,
            calculated_time=inv_station.calculated_time,
            residual=inv_station.residual,
            weight=inv_station.weight,
            is_rejected=inv_station.is_rejected,
            reject_reason=inv_station.reject_reason
        )
        station_results.append(sr)
    result.stations_used = station_results
    
    return result


@router.get("/event/{event_tag}/all")
def export_event_all(event_tag: str, db: Session = Depends(get_db)):
    from app.schemas import (
        ArrivalOut, InversionResultOut, InversionDetail, InversionStationOut,
        VelocityModelOut, StationOut
    )
    
    arrivals = db.query(Arrival).filter(
        Arrival.event_tag == event_tag
    ).join(Station).all()
    
    inv = db.query(InversionResult).filter(
        InversionResult.event_tag == event_tag
    ).first()
    
    station_ids = {a.station_id for a in arrivals}
    stations = db.query(Station).filter(Station.id.in_(station_ids)).all()
    
    inv_detail = None
    if inv:
        inv_detail = InversionDetail.model_validate(inv)
        station_results = []
        for inv_station in inv.stations_used:
            station = db.query(Station).filter(Station.id == inv_station.station_id).first()
            sr = InversionStationOut(
                id=inv_station.id,
                station_id=inv_station.station_id,
                station_code=station.station_code if station else "未知",
                station_name=station.name if station else None,
                arrival_id=inv_station.arrival_id,
                phase=inv_station.phase,
                observed_time=inv_station.observed_time,
                calculated_time=inv_station.calculated_time,
                residual=inv_station.residual,
                weight=inv_station.weight,
                is_rejected=inv_station.is_rejected,
                reject_reason=inv_station.reject_reason
            )
            station_results.append(sr)
        inv_detail.stations_used = station_results
    
    velocity_model = None
    if inv and inv.velocity_model:
        velocity_model = VelocityModelOut.model_validate(inv.velocity_model)
    
    return {
        "event_tag": event_tag,
        "export_time": datetime.now().isoformat(),
        "stations": [StationOut.model_validate(st) for st in stations],
        "arrivals": [ArrivalOut.model_validate(a) for a in arrivals],
        "velocity_model": velocity_model,
        "inversion_result": inv_detail
    }


@router.get("/report/monthly")
def generate_monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    from app.models import AuditLog
    
    now = datetime.now()
    report_year = year or now.year
    report_month = month or now.month
    
    start_date = datetime(report_year, report_month, 1)
    if report_month == 12:
        end_date = datetime(report_year + 1, 1, 1)
    else:
        end_date = datetime(report_year, report_month + 1, 1)
    
    total_arrivals = db.query(Arrival).filter(
        Arrival.created_at >= start_date,
        Arrival.created_at < end_date
    ).count()
    
    status_summary = {}
    for status in DataStatus:
        count = db.query(Arrival).filter(
            Arrival.created_at >= start_date,
            Arrival.created_at < end_date,
            Arrival.status == status
        ).count()
        if count > 0:
            status_summary[get_status_display(status)] = count
    
    total_inversions = db.query(InversionResult).filter(
        InversionResult.created_at >= start_date,
        InversionResult.created_at < end_date
    ).count()
    
    converged = db.query(InversionResult).filter(
        InversionResult.created_at >= start_date,
        InversionResult.created_at < end_date,
        InversionResult.convergence == True
    ).count()
    
    magnitude_updates = db.query(Arrival).filter(
        Arrival.updated_at >= start_date,
        Arrival.updated_at < end_date,
        Arrival.has_magnitude_update == True
    ).count()
    
    total_changes = db.query(AuditLog).filter(
        AuditLog.created_at >= start_date,
        AuditLog.created_at < end_date
    ).count()
    
    events_query = db.query(Arrival.event_tag).filter(
        Arrival.created_at >= start_date,
        Arrival.created_at < end_date
    ).distinct().all()
    events = [e[0] for e in events_query]
    
    event_details = []
    for event_tag in events:
        inv = db.query(InversionResult).filter(
            InversionResult.event_tag == event_tag
        ).first()
        
        arrivals = db.query(Arrival).filter(
            Arrival.event_tag == event_tag
        ).all()
        
        status_counts = {}
        for a in arrivals:
            status_display = get_status_display(a.status)
            status_counts[status_display] = status_counts.get(status_display, 0) + 1
        
        event_details.append({
            "event_tag": event_tag,
            "arrival_count": len(arrivals),
            "status_breakdown": status_counts,
            "has_inversion": inv is not None,
            "converged": inv.convergence if inv else None,
            "magnitude_updated": any(a.has_magnitude_update for a in arrivals),
            "location": f"({inv.latitude:.4f}°N, {inv.longitude:.4f}°E)" if inv else None,
            "depth": f"{inv.depth:.1f}km" if inv else None,
            "origin_time": inv.origin_time_str if inv else None,
            "residual_mean": f"{inv.residual_mean:.4f}s" if inv and inv.residual_mean else None,
        })
    
    pending_actions = []
    pending_arrivals = db.query(Arrival).filter(
        Arrival.status.in_([
            DataStatus.PENDING_CONFIRM,
            DataStatus.MISSING_ARRIVAL,
            DataStatus.WRONG_VELOCITY,
            DataStatus.DUPLICATE_STATION
        ])
    ).all()
    
    for arr in pending_arrivals:
        verifier = arr.next_verifier
        pending_actions.append({
            "arrival_id": arr.id,
            "event_tag": arr.event_tag,
            "station_code": arr.station.station_code if arr.station else "",
            "phase": arr.phase,
            "status": get_status_display(arr.status),
            "next_verifier": get_verifier_display(verifier) if verifier else "待指定",
            "remark": arr.remark or ""
        })
    
    report = {
        "report_period": f"{report_year}年{report_month}月",
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total_arrivals": total_arrivals,
            "total_inversions": total_inversions,
            "conversion_rate": f"{converged/max(total_inversions, 1)*100:.1f}%",
            "magnitude_updates": magnitude_updates,
            "total_audit_changes": total_changes,
            "events_processed": len(events),
        },
        "status_breakdown": status_summary,
        "data_quality": {
            "normal_rate": f"{(status_summary.get('正常', 0) + status_summary.get('已确认', 0)) / max(total_arrivals, 1) * 100:.1f}%",
            "pending_rate": f"{(status_summary.get('待确认', 0) + status_summary.get('到时缺失', 0)) / max(total_arrivals, 1) * 100:.1f}%",
            "reject_rate": f"{status_summary.get('已剔除', 0) / max(total_arrivals, 1) * 100:.1f}%",
        },
        "event_details": event_details,
        "pending_actions": pending_actions,
        "next_month_focus": [
            "清理待确认和到时缺失的数据",
            "核对波速版本错误的模型",
            "处理重复台站问题",
            "补录震级备注并审核",
            "复盘本月反演残差较大的事件"
        ]
    }
    
    return report


@router.get("/report/event/{event_tag}")
def generate_event_report(event_tag: str, db: Session = Depends(get_db)):
    from app.models import AuditLog
    from app.schemas import ArrivalOut
    
    arrivals = db.query(Arrival).filter(Arrival.event_tag == event_tag).all()
    if not arrivals:
        raise HTTPException(status_code=404, detail=f"事件 {event_tag} 不存在")
    
    inv = db.query(InversionResult).filter(InversionResult.event_tag == event_tag).first()
    
    station_ids = {a.station_id for a in arrivals}
    stations = db.query(Station).filter(Station.id.in_(station_ids)).all()
    
    arrival_details = []
    for arr in arrivals:
        logs = db.query(AuditLog).filter(AuditLog.arrival_id == arr.id).all()
        
        inv_station = None
        if inv:
            inv_station = db.query(InversionStation).filter(
                InversionStation.inversion_id == inv.id,
                InversionStation.arrival_id == arr.id
            ).first()
        
        arrival_details.append({
            "arrival_id": arr.id,
            "station_code": arr.station.station_code if arr.station else "",
            "station_name": arr.station.name if arr.station else "",
            "phase": arr.phase,
            "arrival_time": arr.arrival_time_str or "",
            "arrival_time_seconds": arr.arrival_time,
            "status": get_status_display(arr.status),
            "next_verifier": get_verifier_display(arr.next_verifier) if arr.next_verifier else "",
            "has_magnitude_update": arr.has_magnitude_update,
            "magnitude_remark": arr.magnitude_remark or "",
            "residual": f"{inv_station.residual:.4f}s" if inv_station and inv_station.residual is not None else "",
            "is_rejected": inv_station.is_rejected if inv_station else False,
            "reject_reason": inv_station.reject_reason or "",
            "change_count": len(logs),
            "remark": arr.remark or ""
        })
    
    report = {
        "event_tag": event_tag,
        "generated_at": datetime.now().isoformat(),
        "overview": {
            "total_stations": len(stations),
            "total_arrivals": len(arrivals),
            "normal_arrivals": len([a for a in arrivals if a.status in [DataStatus.NORMAL, DataStatus.CONFIRMED]]),
            "pending_arrivals": len([a for a in arrivals if a.status in [DataStatus.PENDING_CONFIRM, DataStatus.MISSING_ARRIVAL]]),
            "problem_arrivals": len([a for a in arrivals if a.status in [DataStatus.WRONG_VELOCITY, DataStatus.DUPLICATE_STATION]]),
            "rejected_arrivals": len([a for a in arrivals if a.status == DataStatus.REJECTED]),
            "magnitude_updated_count": len([a for a in arrivals if a.has_magnitude_update]),
        },
        "inversion_result": None,
        "arrival_details": arrival_details,
        "conclusions": []
    }
    
    if inv:
        report["inversion_result"] = {
            "latitude": f"{inv.latitude:.6f}°N",
            "longitude": f"{inv.longitude:.6f}°E",
            "depth": f"{inv.depth:.2f}km",
            "origin_time": inv.origin_time_str,
            "residual_mean": f"{inv.residual_mean:.4f}s",
            "residual_std": f"{inv.residual_std:.4f}s",
            "stations_used": inv.num_stations_used,
            "stations_rejected": inv.num_stations_rejected,
            "iterations": inv.iterations,
            "convergence": "收敛" if inv.convergence else "未收敛",
            "velocity_model": f"{inv.velocity_model.model_name} v{inv.velocity_model.version}" if inv.velocity_model else "",
            "status": get_status_display(inv.status),
        }
    
    conclusions = []
    if inv:
        if inv.residual_mean and abs(inv.residual_mean) > 0.5:
            conclusions.append(f"残差均值较大 ({inv.residual_mean:.3f}s)，建议检查波速模型或到时拾取")
        if inv.num_stations_rejected > 0:
            conclusions.append(f"剔除 {inv.num_stations_rejected} 个台站数据，需复核大残差台站")
        if not inv.convergence:
            conclusions.append("反演未收敛，建议增加迭代次数或检查数据质量")
    
    if any(a.has_magnitude_update for a in arrivals):
        conclusions.append("存在震级备注更新，需审核结论改动")
    
    pending = [a for a in arrivals if a.status in [DataStatus.PENDING_CONFIRM, DataStatus.MISSING_ARRIVAL]]
    if pending:
        conclusions.append(f"还有 {len(pending)} 条待确认/到时缺失记录需要处理")
    
    report["conclusions"] = conclusions
    
    return report


@router.get("/report/event/{event_tag}/txt")
def generate_event_report_txt(event_tag: str, db: Session = Depends(get_db)):
    report = generate_event_report(event_tag, db)
    
    lines = []
    lines.append("=" * 70)
    lines.append(f"地震事件定位报告 - {report['event_tag']}")
    lines.append("=" * 70)
    lines.append(f"生成时间: {report['generated_at']}")
    lines.append("")
    
    overview = report["overview"]
    lines.append("一、数据概览")
    lines.append("-" * 70)
    lines.append(f"台站总数: {overview['total_stations']}")
    lines.append(f"到时记录总数: {overview['total_arrivals']}")
    lines.append(f"正常/已确认: {overview['normal_arrivals']}")
    lines.append(f"待确认/到时缺失: {overview['pending_arrivals']}")
    lines.append(f"波速错/台站重复: {overview['problem_arrivals']}")
    lines.append(f"已剔除: {overview['rejected_arrivals']}")
    lines.append(f"震级备注更新: {overview['magnitude_updated_count']}")
    lines.append("")
    
    if report["inversion_result"]:
        inv = report["inversion_result"]
        lines.append("二、震源反演结果")
        lines.append("-" * 70)
        lines.append(f"震中位置: {inv['latitude']}, {inv['longitude']}")
        lines.append(f"震源深度: {inv['depth']}")
        lines.append(f"发震时刻: {inv['origin_time']}")
        lines.append(f"残差均值: {inv['residual_mean']}")
        lines.append(f"残差标准差: {inv['residual_std']}")
        lines.append(f"使用台站: {inv['stations_used']}")
        lines.append(f"剔除台站: {inv['stations_rejected']}")
        lines.append(f"迭代次数: {inv['iterations']}")
        lines.append(f"收敛状态: {inv['convergence']}")
        lines.append(f"波速模型: {inv['velocity_model']}")
        lines.append(f"结果状态: {inv['status']}")
        lines.append("")
    
    lines.append("三、台站到时详情")
    lines.append("-" * 70)
    lines.append(f"{'台站':<8}{'震相':<6}{'到时':<16}{'状态':<10}{'残差':<12}{'备注'}")
    lines.append("-" * 70)
    
    for detail in report["arrival_details"]:
        reject_mark = "*" if detail["is_rejected"] else " "
        mag_mark = "#" if detail["has_magnitude_update"] else " "
        lines.append(
            f"{detail['station_code']:<8}"
            f"{detail['phase']:<6}"
            f"{detail['arrival_time']:<16}"
            f"{detail['status']:<10}"
            f"{detail['residual'] or '-':<12}"
            f"{reject_mark}{mag_mark}{detail['remark']}"
        )
    
    if report["conclusions"]:
        lines.append("")
        lines.append("四、结论与建议")
        lines.append("-" * 70)
        for i, conc in enumerate(report["conclusions"], 1):
            lines.append(f"{i}. {conc}")
    
    lines.append("")
    lines.append("=" * 70)
    lines.append("图例: * 已剔除  # 有震级更新")
    lines.append("=" * 70)
    
    content = "\n".join(lines)
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=report_{event_tag}_{datetime.now().strftime('%Y%m%d')}.txt"
        }
    )

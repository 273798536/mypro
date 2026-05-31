import pandas as pd
from datetime import datetime, date
from pathlib import Path
from .config import EXPORT_DIR, EXCEL_ENGINE
from .models import get_session, DutyEstimation, AnomalyRecord, GoodsItem, CustomsDeclaration
from .utils import status_text, anomaly_text, parse_period
from .reviewer import get_review_statistics
from .exporter import build_estimation_dataframe, calculate_checksum


def generate_monthly_report(session, period, exported_by=None):
    period = parse_period(period)
    if not period:
        return {"success": False, "error": "无效的期间格式"}

    stats = get_review_statistics(session, period)

    all_df = build_estimation_dataframe(session, period=period, include_anomalies=True)

    pending_df = all_df[all_df["复核状态"] == "待复核"].copy()
    approved_df = all_df[all_df["复核状态"] == "已通过"].copy()

    summary_data = []

    total_duty = all_df["暂估关税"].sum() if not all_df.empty else 0
    total_tax = all_df["暂估增值税"].sum() if not all_df.empty else 0
    total_amount = total_duty + total_tax

    pending_duty = pending_df["暂估关税"].sum() if not pending_df.empty else 0
    pending_tax = pending_df["暂估增值税"].sum() if not pending_df.empty else 0
    pending_amount = pending_duty + pending_tax

    approved_duty = approved_df["暂估关税"].sum() if not approved_df.empty else 0
    approved_tax = approved_df["暂估增值税"].sum() if not approved_df.empty else 0
    approved_amount = approved_duty + approved_tax

    summary_data.append({
        "项目": "总记录数",
        "数量": stats["total_records"],
        "金额(元)": "",
        "备注": "",
    })
    summary_data.append({
        "项目": "待复核",
        "数量": stats["status_breakdown"].get("PENDING", {}).get("count", 0),
        "金额(元)": round(pending_amount, 2),
        "备注": f"占比 {stats['status_breakdown'].get('PENDING', {}).get('percentage', 0)}%",
    })
    summary_data.append({
        "项目": "已复核",
        "数量": stats["status_breakdown"].get("REVIEWED", {}).get("count", 0),
        "金额(元)": "",
        "备注": f"占比 {stats['status_breakdown'].get('REVIEWED', {}).get('percentage', 0)}%",
    })
    summary_data.append({
        "项目": "已通过",
        "数量": stats["status_breakdown"].get("APPROVED", {}).get("count", 0),
        "金额(元)": round(approved_amount, 2),
        "备注": f"占比 {stats['status_breakdown'].get('APPROVED', {}).get('percentage', 0)}%",
    })
    summary_data.append({
        "项目": "已驳回",
        "数量": stats["status_breakdown"].get("REJECTED", {}).get("count", 0),
        "金额(元)": "",
        "备注": f"占比 {stats['status_breakdown'].get('REJECTED', {}).get('percentage', 0)}%",
    })
    summary_data.append({
        "项目": "合计暂估关税",
        "数量": "",
        "金额(元)": round(total_duty, 2),
        "备注": "",
    })
    summary_data.append({
        "项目": "合计暂估增值税",
        "数量": "",
        "金额(元)": round(total_tax, 2),
        "备注": "",
    })
    summary_data.append({
        "项目": "合计暂估税费",
        "数量": "",
        "金额(元)": round(total_amount, 2),
        "备注": "",
    })

    summary_df = pd.DataFrame(summary_data)

    anomaly_summary = []
    for code, info in stats["anomaly_breakdown"].items():
        anomaly_summary.append({
            "异常类型": info["label"],
            "异常代码": code,
            "数量": info["count"],
        })
    anomaly_summary_df = pd.DataFrame(anomaly_summary) if anomaly_summary else pd.DataFrame()

    anomaly_query = session.query(AnomalyRecord).join(DutyEstimation).filter(
        DutyEstimation.period == period,
        AnomalyRecord.resolved == False
    ).order_by(AnomalyRecord.anomaly_type, DutyEstimation.sku).all()

    anomaly_details = []
    for a in anomaly_query:
        est = session.query(DutyEstimation).get(a.estimation_id)
        if not est:
            continue
        anomaly_details.append({
            "SKU": est.sku,
            "暂估编号": est.report_no,
            "异常类型": anomaly_text(a.anomaly_type),
            "异常描述": a.anomaly_description,
            "字段": a.field_name,
            "原值": a.old_value,
            "新值": a.new_value,
            "检测时间": a.detected_at.strftime("%Y-%m-%d %H:%M:%S"),
            "暂估记录ID": est.id,
        })
    anomaly_details_df = pd.DataFrame(anomaly_details)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"月度保税仓进口关税暂估报告_{period}_{timestamp}.xlsx"
    file_path = EXPORT_DIR / filename

    with pd.ExcelWriter(file_path, engine=EXCEL_ENGINE) as writer:
        cover_data = [
            {"项目": "保税仓进口关税暂估月度报告", "值": ""},
            {"项目": "所属期间", "值": period},
            {"项目": "生成时间", "值": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
            {"项目": "生成人", "值": exported_by or ""},
            {"项目": "校验码", "值": calculate_checksum(all_df) if not all_df.empty else ""},
        ]
        pd.DataFrame(cover_data).to_excel(writer, index=False, sheet_name="报告封面")

        summary_df.to_excel(writer, index=False, sheet_name="统计汇总")

        if not anomaly_summary_df.empty:
            anomaly_summary_df.to_excel(writer, index=False, sheet_name="异常汇总")

        if not anomaly_details_df.empty:
            anomaly_details_df.to_excel(writer, index=False, sheet_name="待复核明细")

        if not pending_df.empty:
            pending_df.to_excel(writer, index=False, sheet_name="待复核清单")

        if not approved_df.empty:
            approved_df.to_excel(writer, index=False, sheet_name="已通过清单")

        if not all_df.empty:
            all_df.to_excel(writer, index=False, sheet_name="全部明细")

    return {
        "success": True,
        "period": period,
        "file_path": str(file_path),
        "total_records": stats["total_records"],
        "total_amount": round(total_amount, 2),
        "pending_count": stats["status_breakdown"].get("PENDING", {}).get("count", 0),
        "pending_amount": round(pending_amount, 2),
        "anomaly_types": len(stats["anomaly_breakdown"]),
        "anomaly_count": sum(info["count"] for info in stats["anomaly_breakdown"].values()),
        "statistics": stats,
    }


def generate_summary_text(period, result):
    lines = []
    lines.append("=" * 60)
    lines.append(f"  保税仓进口关税暂估月度报告 - {period}")
    lines.append("=" * 60)
    lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append(f"  总记录数: {result['total_records']} 条")
    lines.append(f"  暂估税费合计: {result['total_amount']:,.2f} 元")
    lines.append("")
    lines.append("  状态分布:")
    for code, info in result["statistics"]["status_breakdown"].items():
        lines.append(f"    - {info['label']}: {info['count']} 条 ({info['percentage']}%)")
    lines.append("")
    if result["anomaly_count"] > 0:
        lines.append(f"  ⚠️  待复核异常: {result['anomaly_count']} 项")
        lines.append(f"  涉及金额: {result['pending_amount']:,.2f} 元")
        lines.append("")
        lines.append("  异常类型分布:")
        for code, info in result["statistics"]["anomaly_breakdown"].items():
            lines.append(f"    - {info['label']}: {info['count']} 项")
    else:
        lines.append("  ✅ 本期无待复核异常")
    lines.append("")
    lines.append(f"  报告文件: {result['file_path']}")
    lines.append("=" * 60)

    return "\n".join(lines)

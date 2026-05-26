from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
import io
import csv

from app.database import get_db
from app.schemas.schemas import RollingReport
from app.services.ar_service import ARService

router = APIRouter()


@router.get("/rolling", response_model=RollingReport, summary="生成逾期滚动报告")
def get_rolling_report(
    report_date: Optional[date] = Query(None, description="报告日期，默认为今天"),
    db: Session = Depends(get_db)
):
    service = ARService(db)
    return service.generate_rolling_report(report_date)


@router.get("/rolling/export", summary="导出逾期滚动报告CSV")
def export_rolling_report(
    report_date: Optional[date] = Query(None, description="报告日期，默认为今天"),
    db: Session = Depends(get_db)
):
    service = ARService(db)
    report = service.generate_rolling_report(report_date)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["应收账款逾期滚动报告"])
    writer.writerow(["报告日期", report.report_date])
    writer.writerow(["生成时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])

    writer.writerow(["汇总概览"])
    writer.writerow(["客户总数", report.total_customers])
    writer.writerow(["发票总金额", report.total_invoice_amount])
    writer.writerow(["已回款金额", report.total_paid_amount])
    writer.writerow(["剩余金额", report.total_remaining])
    writer.writerow(["未逾期金额", report.current_amount])
    writer.writerow(["逾期总金额", report.total_overdue])
    writer.writerow([])

    writer.writerow(["账龄分桶汇总"])
    writer.writerow(["账龄区间", "金额", "发票数", "占比(%)"])
    for bucket in report.aging_summary:
        writer.writerow([
            bucket.bucket.value,
            bucket.amount,
            bucket.invoice_count,
            round(bucket.percentage, 2)
        ])
    writer.writerow([])

    writer.writerow(["客户明细"])
    writer.writerow([
        "客户编码", "客户名称", "发票总额", "已回款", "剩余金额",
        "未逾期", "逾期金额", "最近催收日", "信用额度", "已用额度",
        "是否冻结", "预警数"
    ])
    for cust in report.customer_details:
        writer.writerow([
            cust.customer_code,
            cust.customer_name,
            cust.total_invoice_amount,
            cust.total_paid_amount,
            cust.total_remaining,
            cust.current_amount,
            cust.overdue_amount,
            cust.last_collection_date,
            cust.credit_limit or "",
            cust.credit_used or "",
            "是" if cust.is_credit_frozen else "否",
            len(cust.alerts)
        ])
    writer.writerow([])

    writer.writerow(["预警信息"])
    writer.writerow(["预警类型", "客户", "相关发票", "相关回款", "消息", "创建时间"])
    for alert in report.alerts:
        customer = next((c for c in report.customer_details if c.customer_id == alert.customer_id), None)
        writer.writerow([
            alert.alert_type.value,
            customer.customer_name if customer else "",
            alert.invoice_id or "",
            alert.receipt_id or "",
            alert.message,
            alert.created_at.strftime("%Y-%m-%d %H:%M:%S") if alert.created_at else ""
        ])

    output.seek(0)
    filename = f"ar_rolling_report_{report.report_date}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/invoices/export", summary="导出逾期发票明细")
def export_overdue_invoices(
    min_overdue_days: int = Query(0, description="最小逾期天数"),
    db: Session = Depends(get_db)
):
    from app.models.models import Invoice, Customer, AgingBucket
    invoices = db.query(Invoice).filter(
        Invoice.remaining_amount > 0.01,
        Invoice.overdue_days >= min_overdue_days
    ).order_by(Invoice.overdue_days.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "客户编码", "客户名称", "发票号", "开票日期", "到期日",
        "发票金额", "已回款", "剩余金额", "逾期天数", "账龄区间",
        "承诺付款日", "状态"
    ])

    for inv in invoices:
        customer = db.query(Customer).filter(Customer.id == inv.customer_id).first()
        writer.writerow([
            customer.customer_code if customer else "",
            customer.customer_name if customer else "",
            inv.invoice_no,
            inv.invoice_date,
            inv.due_date,
            inv.total_amount,
            inv.paid_amount,
            inv.remaining_amount,
            inv.overdue_days,
            inv.aging_bucket.value,
            inv.promise_date or "",
            inv.status
        ])

    output.seek(0)
    filename = f"overdue_invoices_{date.today()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

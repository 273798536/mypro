"""报告导出：CSV格式，数据与状态互相对齐。"""

from __future__ import annotations

import csv
from pathlib import Path

from . import models

STATUS_LABEL = {
    "PENDING": "待处理",
    "LOCKED": "已锁定",
    "PROCESSING": "处理中",
    "DEFERRED": "顺延中",
    "COMPLETED": "已到账",
    "CANCELLED": "已撤单",
    "REJECTED": "已拒绝",
}


def export_queue_report(output_path: str) -> Path:
    """导出赎回排队明细报告。"""
    orders = models.list_orders()
    path = Path(output_path)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "赎回单号", "产品代码", "客户编号", "申请金额", "申请日期",
            "当前状态", "是否开放日", "是否巨额赎回", "顺延次数",
            "下次处理日", "来源", "创建时间", "更新时间",
            "撤单日期", "到账日期", "到账金额",
        ])
        for o in orders:
            cancel = models.get_cancellation(o.order_no)
            arrival = models.get_arrival_report(o.order_no)
            writer.writerow([
                o.order_no,
                o.product_code,
                o.customer_id,
                f"{o.amount:.4f}",
                o.apply_date,
                STATUS_LABEL.get(o.status, o.status),
                "是" if o.is_open_day else "否",
                "是" if o.is_large_redemption else "否",
                o.defer_count,
                o.next_process_date or "",
                o.source,
                o.created_at or "",
                o.updated_at or "",
                cancel.cancel_date if cancel else "",
                arrival.arrive_date if arrival else "",
                f"{arrival.arrive_amount:.4f}" if arrival else "",
            ])
    return path


def export_share_report(output_path: str) -> Path:
    """导出份额余额报告。"""
    from .db import get_conn
    path = Path(output_path)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM share_balances ORDER BY product_code, customer_id, snapshot_date DESC"
        ).fetchall()
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "产品代码", "客户编号", "总份额", "已锁定", "可用份额", "快照日期", "来源",
        ])
        for r in rows:
            writer.writerow([
                r["product_code"],
                r["customer_id"],
                f"{r['balance']:.4f}",
                f"{r['locked']:.4f}",
                f"{r['balance'] - r['locked']:.4f}",
                r["snapshot_date"],
                r["source"],
            ])
    return path


def export_open_days_report(output_path: str, product_code: str | None = None) -> Path:
    """导出开放日日历。"""
    if product_code:
        days = models.list_open_days(product_code)
    else:
        from .db import get_conn
        with get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM open_days ORDER BY product_code, open_date"
            ).fetchall()
        days = [models.OpenDay(**dict(r)) for r in rows]

    path = Path(output_path)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["产品代码", "开放日", "来源", "备注"])
        for d in days:
            writer.writerow([
                d.product_code,
                d.open_date,
                d.source,
                d.note or "",
            ])
    return path


def export_audit_report(output_path: str, entity_type: str | None = None, entity_id: str | None = None) -> Path:
    """导出审计痕迹报告。"""
    logs = models.list_audit_logs(entity_type, entity_id)
    path = Path(output_path)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "时间", "实体类型", "实体ID", "操作", "旧值", "新值", "操作人",
        ])
        for log in logs:
            writer.writerow([
                log.created_at or "",
                log.entity_type,
                log.entity_id,
                log.action,
                log.old_value or "",
                log.new_value or "",
                log.operator,
            ])
    return path


def export_all(output_dir: str) -> dict[str, Path]:
    """一键导出全部报告。"""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    paths = {
        "queue": export_queue_report(str(out / "赎回排队报告.csv")),
        "shares": export_share_report(str(out / "份额余额报告.csv")),
        "open_days": export_open_days_report(str(out / "开放日日历.csv")),
        "audit": export_audit_report(str(out / "审计痕迹.csv")),
    }
    return paths

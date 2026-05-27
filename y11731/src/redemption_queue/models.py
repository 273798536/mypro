"""数据模型：赎回相关实体的类型定义与数据库操作。"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from typing import Optional

from .db import get_conn


ORDER_STATUS_PENDING = "PENDING"
ORDER_STATUS_LOCKED = "LOCKED"
ORDER_STATUS_PROCESSING = "PROCESSING"
ORDER_STATUS_DEFERRED = "DEFERRED"
ORDER_STATUS_COMPLETED = "COMPLETED"
ORDER_STATUS_CANCELLED = "CANCELLED"
ORDER_STATUS_REJECTED = "REJECTED"


@dataclass
class Product:
    id: Optional[int]
    code: str
    name: str


@dataclass
class OpenDay:
    id: Optional[int]
    product_code: str
    open_date: str
    source: str
    note: Optional[str] = None


@dataclass
class ShareBalance:
    id: Optional[int]
    product_code: str
    customer_id: str
    balance: float
    locked: float
    snapshot_date: str
    source: str


@dataclass
class RedemptionOrder:
    id: Optional[int]
    order_no: str
    product_code: str
    customer_id: str
    amount: float
    apply_date: str
    status: str = ORDER_STATUS_PENDING
    is_open_day: int = 1
    is_large_redemption: int = 0
    defer_count: int = 0
    next_process_date: Optional[str] = None
    source: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class CancellationRecord:
    id: Optional[int]
    order_no: str
    cancel_date: str
    reason: Optional[str]
    source: str


@dataclass
class ArrivalReport:
    id: Optional[int]
    order_no: str
    arrive_date: str
    arrive_amount: float
    source: str


@dataclass
class AuditLog:
    id: Optional[int]
    entity_type: str
    entity_id: str
    action: str
    old_value: Optional[str]
    new_value: Optional[str]
    operator: str = "SYSTEM"
    created_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

def upsert_product(code: str, name: str) -> Product:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM products WHERE code = ?", (code,)
        ).fetchone()
        if row:
            conn.execute("UPDATE products SET name = ? WHERE code = ?", (name, code))
            return Product(id=row["id"], code=code, name=name)
        cur = conn.execute(
            "INSERT INTO products (code, name) VALUES (?, ?)", (code, name)
        )
        return Product(id=cur.lastrowid, code=code, name=name)


def list_products() -> list[Product]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM products ORDER BY code").fetchall()
        return [Product(**dict(r)) for r in rows]


# ---------------------------------------------------------------------------
# OpenDay
# ---------------------------------------------------------------------------

def upsert_open_day(product_code: str, open_date: str, source: str, note: str | None = None) -> OpenDay:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM open_days WHERE product_code = ? AND open_date = ?",
            (product_code, open_date),
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE open_days SET source = ?, note = ? WHERE id = ?",
                (source, note, row["id"]),
            )
            return OpenDay(id=row["id"], product_code=product_code, open_date=open_date, source=source, note=note)
        cur = conn.execute(
            "INSERT INTO open_days (product_code, open_date, source, note) VALUES (?, ?, ?, ?)",
            (product_code, open_date, source, note),
        )
        return OpenDay(id=cur.lastrowid, product_code=product_code, open_date=open_date, source=source, note=note)


def is_open_day(product_code: str, apply_date: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM open_days WHERE product_code = ? AND open_date = ?",
            (product_code, apply_date),
        ).fetchone()
        return row is not None


def next_open_day(product_code: str, from_date: str) -> Optional[str]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT open_date FROM open_days WHERE product_code = ? AND open_date > ? ORDER BY open_date ASC LIMIT 1",
            (product_code, from_date),
        ).fetchone()
        return row["open_date"] if row else None


def list_open_days(product_code: str) -> list[OpenDay]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM open_days WHERE product_code = ? ORDER BY open_date", (product_code,)
        ).fetchall()
        return [OpenDay(**dict(r)) for r in rows]


# ---------------------------------------------------------------------------
# ShareBalance
# ---------------------------------------------------------------------------

def upsert_share_balance(
    product_code: str, customer_id: str, balance: float, snapshot_date: str, source: str
) -> ShareBalance:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM share_balances WHERE product_code = ? AND customer_id = ? AND snapshot_date = ?",
            (product_code, customer_id, snapshot_date),
        ).fetchone()
        if row:
            return ShareBalance(**dict(row))
        cur = conn.execute(
            "INSERT INTO share_balances (product_code, customer_id, balance, locked, snapshot_date, source) "
            "VALUES (?, ?, ?, 0, ?, ?)",
            (product_code, customer_id, balance, snapshot_date, source),
        )
        return ShareBalance(
            id=cur.lastrowid, product_code=product_code, customer_id=customer_id,
            balance=balance, locked=0, snapshot_date=snapshot_date, source=source,
        )


def get_share_balance(product_code: str, customer_id: str) -> Optional[ShareBalance]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM share_balances WHERE product_code = ? AND customer_id = ? ORDER BY snapshot_date DESC LIMIT 1",
            (product_code, customer_id),
        ).fetchone()
        return ShareBalance(**dict(row)) if row else None


def get_available_shares(product_code: str, customer_id: str) -> float:
    bal = get_share_balance(product_code, customer_id)
    if not bal:
        return 0.0
    return bal.balance - bal.locked


def lock_shares(product_code: str, customer_id: str, amount: float) -> bool:
    with get_conn() as conn:
        bal = conn.execute(
            "SELECT * FROM share_balances WHERE product_code = ? AND customer_id = ? ORDER BY snapshot_date DESC LIMIT 1",
            (product_code, customer_id),
        ).fetchone()
        if not bal:
            return False
        available = bal["balance"] - bal["locked"]
        if available < amount:
            return False
        conn.execute(
            "UPDATE share_balances SET locked = locked + ? WHERE id = ?",
            (amount, bal["id"]),
        )
        return True


def unlock_shares(product_code: str, customer_id: str, amount: float) -> bool:
    with get_conn() as conn:
        bal = conn.execute(
            "SELECT * FROM share_balances WHERE product_code = ? AND customer_id = ? ORDER BY snapshot_date DESC LIMIT 1",
            (product_code, customer_id),
        ).fetchone()
        if not bal:
            return False
        actual_unlock = min(amount, bal["locked"])
        conn.execute(
            "UPDATE share_balances SET locked = locked - ? WHERE id = ?",
            (actual_unlock, bal["id"]),
        )
        return True


def deduct_shares(product_code: str, customer_id: str, amount: float) -> bool:
    with get_conn() as conn:
        bal = conn.execute(
            "SELECT * FROM share_balances WHERE product_code = ? AND customer_id = ? ORDER BY snapshot_date DESC LIMIT 1",
            (product_code, customer_id),
        ).fetchone()
        if not bal:
            return False
        actual_deduct = min(amount, bal["locked"])
        conn.execute(
            "UPDATE share_balances SET balance = balance - ?, locked = locked - ? WHERE id = ?",
            (actual_deduct, actual_deduct, bal["id"]),
        )
        return True


# ---------------------------------------------------------------------------
# RedemptionOrder
# ---------------------------------------------------------------------------

def create_order(
    order_no: str, product_code: str, customer_id: str,
    amount: float, apply_date: str, source: str,
) -> RedemptionOrder:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO redemption_orders (order_no, product_code, customer_id, amount, apply_date, status, source) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (order_no, product_code, customer_id, amount, apply_date, ORDER_STATUS_PENDING, source),
        )
        row = conn.execute("SELECT * FROM redemption_orders WHERE order_no = ?", (order_no,)).fetchone()
        return RedemptionOrder(**dict(row))


def get_order(order_no: str) -> Optional[RedemptionOrder]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM redemption_orders WHERE order_no = ?", (order_no,)).fetchone()
        return RedemptionOrder(**dict(row)) if row else None


def list_orders(status: str | None = None) -> list[RedemptionOrder]:
    with get_conn() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM redemption_orders WHERE status = ? ORDER BY apply_date, order_no", (status,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM redemption_orders ORDER BY apply_date, order_no"
            ).fetchall()
        return [RedemptionOrder(**dict(r)) for r in rows]


def update_order_status(order_no: str, new_status: str, **extra_fields) -> None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM redemption_orders WHERE order_no = ?", (order_no,)).fetchone()
        if not row:
            return
        old_status = row["status"]
        fields = {"status": new_status, "updated_at": datetime.now().isoformat()}
        fields.update(extra_fields)
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [order_no]
        conn.execute(f"UPDATE redemption_orders SET {set_clause} WHERE order_no = ?", values)
        _audit(conn, "redemption_order", order_no, "STATUS_CHANGE",
               old_status, new_status)


# ---------------------------------------------------------------------------
# CancellationRecord
# ---------------------------------------------------------------------------

def add_cancellation(order_no: str, cancel_date: str, source: str, reason: str | None = None) -> CancellationRecord:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO cancellation_records (order_no, cancel_date, reason, source) VALUES (?, ?, ?, ?)",
            (order_no, cancel_date, reason, source),
        )
        return CancellationRecord(
            id=cur.lastrowid, order_no=order_no, cancel_date=cancel_date, reason=reason, source=source,
        )


def get_cancellation(order_no: str) -> Optional[CancellationRecord]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM cancellation_records WHERE order_no = ? ORDER BY id DESC LIMIT 1", (order_no,)
        ).fetchone()
        return CancellationRecord(**dict(row)) if row else None


# ---------------------------------------------------------------------------
# ArrivalReport
# ---------------------------------------------------------------------------

def add_arrival_report(order_no: str, arrive_date: str, arrive_amount: float, source: str) -> ArrivalReport:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO arrival_reports (order_no, arrive_date, arrive_amount, source) VALUES (?, ?, ?, ?)",
            (order_no, arrive_date, arrive_amount, source),
        )
        return ArrivalReport(
            id=cur.lastrowid, order_no=order_no, arrive_date=arrive_date, arrive_amount=arrive_amount, source=source,
        )


def get_arrival_report(order_no: str) -> Optional[ArrivalReport]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM arrival_reports WHERE order_no = ? ORDER BY id DESC LIMIT 1", (order_no,)
        ).fetchone()
        return ArrivalReport(**dict(row)) if row else None


def list_arrival_reports() -> list[ArrivalReport]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM arrival_reports ORDER BY arrive_date").fetchall()
        return [ArrivalReport(**dict(r)) for r in rows]


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

def _audit(conn, entity_type: str, entity_id: str, action: str, old_value: str | None, new_value: str | None):
    conn.execute(
        "INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
        (entity_type, entity_id, action, str(old_value) if old_value is not None else None,
         str(new_value) if new_value is not None else None),
    )


def list_audit_logs(entity_type: str | None = None, entity_id: str | None = None) -> list[AuditLog]:
    with get_conn() as conn:
        sql = "SELECT * FROM audit_log WHERE 1=1"
        params: list = []
        if entity_type:
            sql += " AND entity_type = ?"
            params.append(entity_type)
        if entity_id:
            sql += " AND entity_id = ?"
            params.append(entity_id)
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        return [AuditLog(**dict(r)) for r in rows]

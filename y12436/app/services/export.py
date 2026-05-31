from __future__ import annotations
import io
from datetime import datetime
from openpyxl import Workbook
from sqlalchemy.orm import Session
from app.models import PnLAllocation, BunkeringSlip, VoyagePlan, HedgeContract, AllocationStatus


def export_allocations(db: Session, status: AllocationStatus | None = None) -> bytes:
    q = db.query(PnLAllocation)
    if status:
        q = q.filter(PnLAllocation.status == status)
    allocs = q.all()
    wb = Workbook()
    ws = wb.active
    ws.title = "损益归集"
    headers = [
        "归集ID", "加油单号", "船名", "加油港", "油种", "加油量MT",
        "航次号", "套保合约", "现货损益", "套保损益", "净损益",
        "航次分摊金额", "汇率", "汇率日期", "状态", "复核人", "复核时间", "审批人", "审批时间",
    ]
    ws.append(headers)
    for alloc in allocs:
        slip = db.query(BunkeringSlip).filter(BunkeringSlip.id == alloc.bunkering_slip_id).first()
        voyage = db.query(VoyagePlan).filter(VoyagePlan.id == alloc.voyage_id).first() if alloc.voyage_id else None
        contract = db.query(HedgeContract).filter(HedgeContract.id == alloc.hedge_contract_id).first() if alloc.hedge_contract_id else None
        ws.append([
            alloc.id,
            slip.slip_no if slip else "",
            slip.vessel_name if slip else "",
            slip.port if slip else "",
            slip.fuel_type if slip else "",
            slip.quantity_mt if slip else "",
            voyage.voyage_no if voyage else "",
            f"{contract.contract_no}-v{contract.version}" if contract else "",
            alloc.spot_pnl,
            alloc.hedge_pnl,
            alloc.net_pnl,
            alloc.voyage_allocation_amount,
            alloc.exchange_rate_used,
            alloc.exchange_rate_date_used.isoformat() if alloc.exchange_rate_date_used else "",
            alloc.status.value,
            alloc.reviewed_by or "",
            alloc.reviewed_at.isoformat() if alloc.reviewed_at else "",
            alloc.approved_by or "",
            alloc.approved_at.isoformat() if alloc.approved_at else "",
        ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()

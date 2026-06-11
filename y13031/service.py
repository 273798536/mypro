import uuid
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from models import (
    AdvancePayment,
    HistoryEntry,
    PaymentStatus,
    ChangeSource,
    ReplayResult,
    BatchReplaySummary,
)


STORAGE_FILE = "data/payments.json"
os.makedirs("data", exist_ok=True)


class PaymentStore:
    def __init__(self):
        self._payments: Dict[str, AdvancePayment] = {}
        self._batch_index: Dict[str, List[str]] = defaultdict(list)
        self._load()

    def _load(self):
        if os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                payment = AdvancePayment(**item)
                self._payments[payment.id] = payment
                self._batch_index[payment.batch_id].append(payment.id)

    def _save(self):
        data = [p.model_dump(mode="json") for p in self._payments.values()]
        with open(STORAGE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def add_payment(self, payment: AdvancePayment) -> str:
        self._payments[payment.id] = payment
        self._batch_index[payment.batch_id].append(payment.id)
        self._save()
        return payment.id

    def get_payment(self, payment_id: str) -> Optional[AdvancePayment]:
        return self._payments.get(payment_id)

    def list_payments(self, batch_id: Optional[str] = None) -> List[AdvancePayment]:
        if batch_id:
            ids = self._batch_index.get(batch_id, [])
            return [self._payments[i] for i in ids if i in self._payments]
        return list(self._payments.values())

    def list_batches(self) -> List[str]:
        return sorted(self._batch_index.keys())

    def clear_all(self):
        self._payments.clear()
        self._batch_index.clear()
        self._save()

    def _add_history(self, payment: AdvancePayment, entry: HistoryEntry):
        payment.history.append(entry)
        payment.updated_at = datetime.now()
        self._save()


store = PaymentStore()


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def detect_duplicate_claims(payments: List[AdvancePayment]) -> Dict[str, List[str]]:
    amount_map: Dict[Tuple[float, str], List[str]] = defaultdict(list)
    for p in payments:
        key = (round(p.amount, 2), p.business_date)
        amount_map[key].append(p.id)
    return {k: v for k, v in amount_map.items() if len(v) > 1}


def change_status(
    payment_id: str,
    new_status: PaymentStatus,
    source: ChangeSource,
    operator: str = "系统",
    remark: Optional[str] = None,
    screenshot_ref: Optional[str] = None,
    detail: Optional[str] = None,
    new_amount: Optional[float] = None,
) -> Optional[AdvancePayment]:
    payment = store.get_payment(payment_id)
    if not payment:
        return None

    old_status = payment.current_status
    old_amount = payment.amount

    entry = HistoryEntry(
        id=_gen_id(),
        source=source,
        operator=operator,
        old_status=old_status,
        new_status=new_status,
        old_amount=old_amount,
        new_amount=new_amount if new_amount is not None else old_amount,
        remark=remark,
        screenshot_ref=screenshot_ref,
        detail=detail,
    )

    payment.current_status = new_status
    if new_amount is not None:
        payment.amount = new_amount
    if remark is not None:
        payment.current_remark = remark

    store._add_history(payment, entry)
    return payment


def add_remark(
    payment_id: str,
    remark: str,
    operator: str = "老许",
    screenshot_ref: Optional[str] = None,
) -> Optional[AdvancePayment]:
    payment = store.get_payment(payment_id)
    if not payment:
        return None

    combined_remark = remark
    if payment.current_remark:
        combined_remark = f"{payment.current_remark}\n{remark}"

    entry = HistoryEntry(
        id=_gen_id(),
        source=ChangeSource.REMARK_ADD,
        operator=operator,
        old_status=payment.current_status,
        new_status=payment.current_status,
        remark=remark,
        screenshot_ref=screenshot_ref,
        detail="补充业务备注",
    )

    payment.current_remark = combined_remark
    store._add_history(payment, entry)
    return payment


def update_voucher(
    payment_id: str,
    voucher_no: str,
    operator: str = "系统",
) -> Optional[AdvancePayment]:
    payment = store.get_payment(payment_id)
    if not payment:
        return None

    payment.voucher_no = voucher_no
    payment.voucher_arrived = True

    entry = HistoryEntry(
        id=_gen_id(),
        source=ChangeSource.VOUCHER_ARRIVED,
        operator=operator,
        old_status=payment.current_status,
        new_status=PaymentStatus.MATCHED,
        detail=f"凭证到账：{voucher_no}",
    )

    payment.current_status = PaymentStatus.MATCHED
    store._add_history(payment, entry)
    return payment


def _determine_action(status: PaymentStatus, payment: AdvancePayment) -> Optional[str]:
    if status == PaymentStatus.NEED_VOUCHER:
        return "联系财务确认凭证号，到账后在系统中录入凭证号即可自动匹配"
    if status == PaymentStatus.NEED_SUPPLEMENT:
        return f"请供应商补充合同/付款说明材料，当前备注：{payment.current_remark or '无'}"
    if status == PaymentStatus.DISPUTED:
        return "核实该笔款项是否已被其他口径认领，检查业务台账重复记录"
    if status == PaymentStatus.DUPLICATE:
        return "同一金额同一日期存在多笔认领，需核对原始凭证确认归属，保留正确一笔其余标记作废"
    if status == PaymentStatus.RELEASED:
        return "材料齐全，可正常放行付款"
    return None


def replay_single(payment: AdvancePayment) -> ReplayResult:
    previous = payment.current_status
    new_status = previous
    action_needed = None

    all_payments = store.list_payments(payment.batch_id)
    duplicates = detect_duplicate_claims(all_payments)

    is_duplicate = False
    for key, ids in duplicates.items():
        if payment.id in ids:
            is_duplicate = True
            break

    if is_duplicate and previous not in [PaymentStatus.RELEASED]:
        new_status = PaymentStatus.DUPLICATE
    elif payment.voucher_arrived and payment.voucher_no:
        new_status = PaymentStatus.MATCHED
    elif not payment.voucher_arrived:
        new_status = PaymentStatus.NEED_VOUCHER
    elif payment.current_remark and "补" in payment.current_remark:
        new_status = PaymentStatus.NEED_SUPPLEMENT
    else:
        new_status = PaymentStatus.RELEASED

    changed = previous != new_status
    if changed:
        change_status(
            payment.id,
            new_status,
            ChangeSource.AUTO_REPLAY,
            operator="系统",
            detail=f"异常回放：{previous.value} → {new_status.value}",
        )

    action_needed = _determine_action(new_status, payment)

    return ReplayResult(
        payment_id=payment.id,
        payment_no=payment.payment_no,
        supplier_name=payment.supplier_name,
        previous_status=previous,
        new_status=new_status,
        action_needed=action_needed,
        is_status_changed=changed,
    )


def replay_batch(batch_id: str) -> Tuple[List[ReplayResult], BatchReplaySummary]:
    payments = store.list_payments(batch_id)
    results = []
    for p in payments:
        results.append(replay_single(p))

    changed = sum(1 for r in results if r.is_status_changed)
    released = sum(1 for r in results if r.new_status == PaymentStatus.RELEASED)
    need_sup = sum(1 for r in results if r.new_status == PaymentStatus.NEED_SUPPLEMENT)
    disputed = sum(1 for r in results if r.new_status in [PaymentStatus.DISPUTED, PaymentStatus.DUPLICATE])

    summary = BatchReplaySummary(
        batch_id=batch_id,
        total_count=len(results),
        changed_count=changed,
        released_count=released,
        need_supplement_count=need_sup,
        disputed_count=disputed,
        replay_time=datetime.now(),
    )
    return results, summary


def import_from_rows(rows: List[Dict], batch_id: str) -> List[str]:
    ids = []
    for row in rows:
        payment = AdvancePayment(
            id=_gen_id(),
            batch_id=batch_id,
            payment_no=str(row.get("payment_no", row.get("付款单号", ""))),
            supplier_name=str(row.get("supplier_name", row.get("供应商名称", ""))),
            amount=float(row.get("amount", row.get("金额", 0))),
            currency=str(row.get("currency", row.get("币种", "CNY"))),
            business_date=str(row.get("business_date", row.get("业务日期", ""))),
            current_status=PaymentStatus.PENDING,
            current_remark=str(row.get("remark", row.get("备注", ""))) or None,
            voucher_no=str(row.get("voucher_no", row.get("凭证号", ""))) or None,
            voucher_arrived=bool(row.get("voucher_arrived", row.get("凭证已到", False))),
            recon_caliber=str(row.get("recon_caliber", row.get("对账口径", ""))) or None,
            claimed_by=[str(x) for x in (row.get("claimed_by", []) if isinstance(row.get("claimed_by"), list) else [])],
            history=[],
        )
        if payment.voucher_arrived and payment.voucher_no:
            payment.current_status = PaymentStatus.MATCHED
        entry = HistoryEntry(
            id=_gen_id(),
            source=ChangeSource.AUTO_REPLAY,
            operator="系统导入",
            old_status=None,
            new_status=payment.current_status,
            detail=f"批次 {batch_id} 导入初始数据",
        )
        payment.history.append(entry)
        ids.append(store.add_payment(payment))
    return ids


def generate_sample_data() -> str:
    store.clear_all()
    batch_id = f"BATCH_{datetime.now().strftime('%Y%m%d')}_001"

    sample_rows = [
        {
            "payment_no": "FK20260601001",
            "supplier_name": "华东建材有限公司",
            "amount": 500000.00,
            "business_date": "2026-06-01",
            "remark": "首批钢材预付款，合同已签",
            "voucher_no": "PZ2026060015",
            "voucher_arrived": True,
            "recon_caliber": "采购口径A",
        },
        {
            "payment_no": "FK20260601002",
            "supplier_name": "华东建材有限公司",
            "amount": 500000.00,
            "business_date": "2026-06-01",
            "remark": "首批钢材预付款，另一部门认领",
            "voucher_no": "",
            "voucher_arrived": False,
            "recon_caliber": "采购口径B",
        },
        {
            "payment_no": "FK20260602003",
            "supplier_name": "北方物流集团",
            "amount": 120000.00,
            "business_date": "2026-06-02",
            "remark": "",
            "voucher_no": "",
            "voucher_arrived": False,
            "recon_caliber": "物流口径",
        },
        {
            "payment_no": "FK20260603004",
            "supplier_name": "南方设备制造",
            "amount": 890000.00,
            "business_date": "2026-06-03",
            "remark": "设备款，待补发票扫描件",
            "voucher_no": "",
            "voucher_arrived": False,
            "recon_caliber": "设备口径",
        },
        {
            "payment_no": "FK20260603005",
            "supplier_name": "中原化工原料",
            "amount": 335000.00,
            "business_date": "2026-06-03",
            "remark": "",
            "voucher_no": "PZ2026060088",
            "voucher_arrived": True,
            "recon_caliber": "化工口径",
        },
    ]
    import_from_rows(sample_rows, batch_id)
    return batch_id

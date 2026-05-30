from cf_diag.core.models import ColdStartRecord

COLD_START_THRESHOLD = 2


def detect_cold_start(store, *item_ids) -> list[ColdStartRecord]:
    counts = store.get_item_interaction_count()
    records = []
    for iid in item_ids:
        if iid in store.cold_starts:
            records.append(store.cold_starts[iid])
            continue
        c = counts.get(iid, 0)
        if c < COLD_START_THRESHOLD:
            rec = ColdStartRecord(
                item_id=iid,
                reason=f"交互次数({c})低于阈值({COLD_START_THRESHOLD})",
                status="pending",
                assigned_to="待分配",
            )
            store.add_cold_start(rec)
            records.append(rec)
    return records


def confirm_cold_start(store, item_id: str, operator: str, decision: str) -> ColdStartRecord:
    rec = store.cold_starts.get(item_id)
    if rec is None:
        rec = ColdStartRecord(item_id=item_id, reason="手动标记", status=decision, assigned_to=operator)
        store.add_cold_start(rec)
    else:
        rec.status = decision
        rec.assigned_to = operator
    for key, sim in store.similarity_results.items():
        if (sim.item_a == item_id or sim.item_b == item_id) and sim.is_cold_start:
            if decision == "confirmed_normal":
                sim.is_cold_start = False
                sim.status = "confirmed"
            elif decision == "confirmed_cold":
                sim.status = "cold_start_confirmed"
    return rec


def list_pending_cold_starts(store) -> list[ColdStartRecord]:
    return [r for r in store.cold_starts.values() if r.status == "pending"]

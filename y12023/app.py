from flask import Flask, request, jsonify
from datetime import datetime
import uuid
import json
import copy

app = Flask(__name__)

rental_orders = {}
device_returns = {}
warehouse_inventory = {}
arbitration_records = {}
refund_attempts = {}
arbitration_log = []


def _ts():
    return datetime.now().isoformat()


def _new_id():
    return str(uuid.uuid4())[:8]


def _reset():
    rental_orders.clear()
    device_returns.clear()
    warehouse_inventory.clear()
    arbitration_records.clear()
    refund_attempts.clear()
    arbitration_log.clear()


def _match_returns_to_orders():
    matched = {}
    for rid, ret in device_returns.items():
        for oid, order in rental_orders.items():
            if order["device_serial"] == ret["device_serial"] and oid not in matched:
                matched[oid] = (rid, ret, True)
                break

    unmatched_orders = [oid for oid in rental_orders if oid not in matched]
    unmatched_returns = [
        (rid, ret) for rid, ret in device_returns.items()
        if not any(oid == m_oid and rid == m_rid for m_oid, (m_rid, _, _) in matched.items())
    ]

    for oid in unmatched_orders:
        order = rental_orders[oid]
        for rid, ret in unmatched_returns:
            already_used = any(
                m_oid != oid and m_rid == rid for m_oid, (m_rid, _, _) in matched.items()
            )
            if not already_used:
                matched[oid] = (rid, ret, False)
                break

    return matched


def _get_return_for_order(order_id, match_cache):
    if order_id in match_cache:
        rid, ret, serial_match = match_cache[order_id]
        return ret, serial_match
    return None, False


def _calc_delay_hours(order, ret):
    fmt = "%Y-%m-%dT%H:%M:%S"
    expected = datetime.strptime(order["expected_return_time"], fmt)
    actual = datetime.strptime(ret["return_time"], fmt)
    delta = (actual - expected).total_seconds() / 3600
    return max(0, delta)


def _calc_penalty(deposit, delay_hours):
    if delay_hours <= 0:
        return 0
    if delay_hours <= 2:
        return round(deposit * 0.1, 2)
    if delay_hours <= 24:
        return round(deposit * 0.3, 2)
    return round(deposit * 0.5, 2)


def _check_duplicate_refund(order_id, amount):
    for a in refund_attempts.values():
        if a["order_id"] == order_id and a["amount"] == amount and a["status"] == "processed":
            return True
    return False


def _warehouse_confirms_device(serial):
    for rec in warehouse_inventory.values():
        if rec["device_serial"] == serial and rec["device_status"] in ("in_stock", "damaged"):
            return rec
    return None


def _build_factors(order_id, ret, delay_hours, serial_match, warehouse_rec, old_record=None):
    factors = []
    order = rental_orders[order_id]
    deposit = order["deposit_amount"]

    if serial_match:
        if delay_hours > 0:
            penalty = _calc_penalty(deposit, delay_hours)
            factors.append({
                "type": "return_delay",
                "description": f"归还延迟{delay_hours:.1f}小时，扣罚{penalty}元",
                "impact": "negative",
                "severity": "high" if delay_hours > 24 else "medium" if delay_hours > 2 else "low",
                "penalty": penalty,
                "delay_hours": delay_hours,
            })
        else:
            factors.append({
                "type": "on_time_return",
                "description": "按时归还，无扣罚",
                "impact": "positive",
                "severity": "low",
                "penalty": 0,
                "delay_hours": 0,
            })
    else:
        if ret is not None:
            factors.append({
                "type": "serial_mismatch",
                "description": f"归还设备串码{ret['device_serial']}与租借设备{order['device_serial']}不一致",
                "impact": "negative",
                "severity": "high",
                "penalty": deposit,
                "delay_hours": 0,
            })
        else:
            factors.append({
                "type": "not_returned",
                "description": "未查到归还记录",
                "impact": "negative",
                "severity": "high",
                "penalty": deposit,
                "delay_hours": 0,
            })

    if warehouse_rec:
        factors.append({
            "type": "warehouse_confirmed",
            "description": f"仓库盘点确认设备{warehouse_rec['device_serial']}在库(状态:{warehouse_rec['device_status']})",
            "impact": "positive",
            "severity": "medium",
            "penalty": 0,
            "delay_hours": 0,
        })

    if old_record:
        for f in old_record.get("factors", []):
            if f["type"] == "duplicate_refund":
                factors.append(f)
                break

    return factors


def _determine_status(factors):
    has_serial_mismatch = any(f["type"] == "serial_mismatch" for f in factors)
    has_not_returned = any(f["type"] == "not_returned" for f in factors)
    has_warehouse = any(f["type"] == "warehouse_confirmed" for f in factors)
    has_delay = any(f["type"] == "return_delay" for f in factors)
    has_on_time = any(f["type"] == "on_time_return" for f in factors)

    if has_serial_mismatch:
        if has_warehouse:
            return "REVIEW_REQUIRED"
        return "SERIAL_MISMATCH"

    if has_not_returned:
        if has_warehouse:
            return "WAREHOUSE_CONFIRMED"
        return "NOT_RETURNED"

    if has_delay:
        return "DELAYED_RETURN"

    if has_on_time:
        return "MATCHED"

    return "PENDING"


def _calc_refund(order_id, factors, status):
    order = rental_orders[order_id]
    deposit = order["deposit_amount"]
    total_penalty = sum(f.get("penalty", 0) for f in factors)

    if status in ("NOT_RETURNED", "SERIAL_MISMATCH"):
        if any(f["type"] == "warehouse_confirmed" for f in factors):
            return round(deposit * 0.5, 2)
        return 0

    if status == "WAREHOUSE_CONFIRMED":
        return round(deposit * 0.5, 2)

    if status == "REVIEW_REQUIRED":
        return round(deposit * 0.5, 2)

    if status == "DELAYED_RETURN":
        return round(max(0, deposit - total_penalty), 2)

    if status == "MATCHED":
        return deposit

    return 0


def _arbitrate_order(order_id, phase="initial", match_cache=None):
    order = rental_orders[order_id]
    device_serial = order["device_serial"]

    if match_cache is None:
        match_cache = _match_returns_to_orders()

    ret, serial_match = _get_return_for_order(order_id, match_cache)
    delay_hours = 0
    if ret and serial_match:
        delay_hours = _calc_delay_hours(order, ret)

    warehouse_rec = _warehouse_confirms_device(device_serial)
    if not warehouse_rec:
        warehouse_rec = _warehouse_confirms_device(ret["device_serial"]) if ret and not serial_match else None

    old_record = arbitration_records.get(order_id)
    old_status = old_record["deposit_status"] if old_record else None

    factors = _build_factors(order_id, ret, delay_hours, serial_match, warehouse_rec, old_record)
    status = _determine_status(factors)
    refund = _calc_refund(order_id, factors, status)

    review_status = "auto"
    if status in ("REVIEW_REQUIRED", "SERIAL_MISMATCH", "NOT_RETURNED"):
        review_status = "pending"
    if old_record and old_record.get("review_status") in ("approved", "partial_approved", "rejected"):
        review_status = old_record["review_status"]
        if review_status == "pending" and status in ("MATCHED", "DELAYED_RETURN"):
            review_status = "auto"

    refund_blocked = False
    if review_status == "rejected":
        refund_blocked = True
    if _check_duplicate_refund(order_id, refund):
        refund_blocked = True
        factors.append({
            "type": "duplicate_refund",
            "description": f"订单{order_id}已存在{refund}元退款，重复退款已拦截",
            "impact": "negative",
            "severity": "high",
            "penalty": 0,
            "delay_hours": 0,
        })

    warehouse_impact = None
    if old_record and phase == "warehouse_update":
        changes = []
        if old_status != status:
            changes.append(f"状态变更: {old_status} → {status}")
        old_refund = old_record.get("refund_amount", 0)
        if old_refund != refund:
            changes.append(f"退款金额变更: {old_refund} → {refund}")
        old_review = old_record.get("review_status", "")
        if old_review != review_status:
            changes.append(f"复核状态变更: {old_review} → {review_status}")
        if changes:
            warehouse_impact = {
                "affected": True,
                "triggered_by": "warehouse_inventory",
                "changes": changes,
                "previous_status": old_status,
                "previous_refund": old_refund,
                "previous_review": old_review,
            }
        else:
            warehouse_impact = None

    version = (old_record["version"] + 1) if old_record else 1

    record = {
        "arbitration_id": old_record["arbitration_id"] if old_record else _new_id(),
        "order_id": order_id,
        "deposit_status": status,
        "refund_amount": refund,
        "refund_blocked": refund_blocked,
        "factors": factors,
        "review_status": review_status,
        "warehouse_impact": warehouse_impact,
        "version": version,
        "phase": phase,
        "created_at": old_record["created_at"] if old_record else _ts(),
        "updated_at": _ts(),
    }

    arbitration_records[order_id] = record
    arbitration_log.append({
        "timestamp": _ts(),
        "order_id": order_id,
        "action": f"arbitrate:{phase}",
        "from_status": old_status,
        "to_status": status,
        "version": version,
    })

    return record


def _rerun_all(phase="initial"):
    match_cache = _match_returns_to_orders()
    for order_id in rental_orders:
        _arbitrate_order(order_id, phase, match_cache)
    return list(arbitration_records.values())


@app.route("/api/reset", methods=["POST"])
def api_reset():
    _reset()
    return jsonify({"ok": True, "message": "all data cleared"})


@app.route("/api/import/rental-orders", methods=["POST"])
def api_import_rental_orders():
    data = request.get_json(force=True)
    orders = data if isinstance(data, list) else data.get("orders", [data])
    imported = []
    for o in orders:
        oid = o.get("order_id", _new_id())
        order = {
            "order_id": oid,
            "user_id": o["user_id"],
            "device_serial": o["device_serial"],
            "deposit_amount": float(o["deposit_amount"]),
            "rent_time": o["rent_time"],
            "expected_return_time": o["expected_return_time"],
        }
        rental_orders[oid] = order
        imported.append(order)
    results = _rerun_all("initial")
    return jsonify({"ok": True, "imported": len(imported), "arbitration_results": results})


@app.route("/api/import/device-returns", methods=["POST"])
def api_import_device_returns():
    data = request.get_json(force=True)
    returns = data if isinstance(data, list) else data.get("returns", [data])
    imported = []
    for r in returns:
        rid = r.get("return_id", _new_id())
        ret = {
            "return_id": rid,
            "device_serial": r["device_serial"],
            "return_time": r["return_time"],
            "return_station": r.get("return_station", ""),
        }
        device_returns[rid] = ret
        imported.append(ret)

    results = _rerun_all("initial")
    return jsonify({"ok": True, "imported": len(imported), "arbitration_results": results})


@app.route("/api/import/warehouse-inventory", methods=["POST"])
def api_import_warehouse_inventory():
    data = request.get_json(force=True)
    items = data if isinstance(data, list) else data.get("items", [data])
    imported = []
    for item in items:
        wid = item.get("record_id", _new_id())
        rec = {
            "record_id": wid,
            "device_serial": item["device_serial"],
            "device_status": item["device_status"],
            "check_time": item.get("check_time", _ts()),
            "location": item.get("location", ""),
        }
        warehouse_inventory[wid] = rec
        imported.append(rec)

    results = _rerun_all("warehouse_update")
    return jsonify({"ok": True, "imported": len(imported), "arbitration_results": results})


@app.route("/api/arbitration/run", methods=["POST"])
def api_arbitration_run():
    data = request.get_json(force=True) if request.data else {}
    order_ids = data.get("order_ids") if data else None
    phase = data.get("phase", "initial") if data else "initial"

    if order_ids:
        results = []
        for oid in order_ids:
            if oid in rental_orders:
                results.append(_arbitrate_order(oid, phase))
    else:
        results = _rerun_all(phase)

    return jsonify({"ok": True, "results": results})


@app.route("/api/arbitration/result", methods=["GET"])
def api_arbitration_result():
    order_id = request.args.get("order_id")
    if order_id:
        rec = arbitration_records.get(order_id)
        if not rec:
            return jsonify({"ok": False, "error": "order not found"}), 404
        return jsonify({"ok": True, "result": rec})
    return jsonify({"ok": True, "results": list(arbitration_records.values())})


@app.route("/api/arbitration/review", methods=["POST"])
def api_arbitration_review():
    data = request.get_json(force=True)
    order_id = data["order_id"]
    action = data["action"]

    if order_id not in arbitration_records:
        return jsonify({"ok": False, "error": "order not found"}), 404

    rec = arbitration_records[order_id]

    if action == "approve":
        rec["review_status"] = "approved"
    elif action == "reject":
        rec["review_status"] = "rejected"
        rec["refund_blocked"] = True
        rec["refund_amount"] = 0
        rec["factors"].append({
            "type": "review_rejected",
            "description": "客服复核驳回，退款已拦截",
            "impact": "negative",
            "severity": "high",
            "penalty": 0,
            "delay_hours": 0,
        })
    elif action == "partial":
        amount = float(data.get("amount", 0))
        rec["review_status"] = "partial_approved"
        rec["refund_amount"] = amount
        rec["factors"].append({
            "type": "review_partial",
            "description": f"客服部分批准退款{amount}元",
            "impact": "neutral",
            "severity": "medium",
            "penalty": 0,
            "delay_hours": 0,
        })
    else:
        return jsonify({"ok": False, "error": "invalid action"}), 400

    rec["updated_at"] = _ts()
    rec["version"] += 1

    arbitration_log.append({
        "timestamp": _ts(),
        "order_id": order_id,
        "action": f"review:{action}",
        "to_status": rec["review_status"],
        "version": rec["version"],
    })

    return jsonify({"ok": True, "result": rec})


@app.route("/api/refund/attempt", methods=["POST"])
def api_refund_attempt():
    data = request.get_json(force=True)
    order_id = data["order_id"]
    amount = float(data["amount"])

    if order_id not in arbitration_records:
        return jsonify({"ok": False, "error": "order not found"}), 404

    rec = arbitration_records[order_id]

    if _check_duplicate_refund(order_id, amount):
        return jsonify({"ok": False, "error": "duplicate refund", "reason": f"order {order_id} already has a {amount} refund processed"})

    if rec["refund_blocked"]:
        return jsonify({"ok": False, "error": "refund blocked", "reason": "current arbitration blocks refund"})

    if rec["review_status"] in ("pending", "rejected"):
        return jsonify({"ok": False, "error": "refund blocked", "reason": f"review status is {rec['review_status']}"})

    attempt_id = _new_id()
    refund_attempts[attempt_id] = {
        "attempt_id": attempt_id,
        "order_id": order_id,
        "amount": amount,
        "timestamp": _ts(),
        "status": "processed",
    }

    _arbitrate_order(order_id, rec.get("phase", "initial"))

    return jsonify({"ok": True, "attempt_id": attempt_id, "amount": amount, "status": "processed"})


@app.route("/api/arbitration/export", methods=["GET"])
def api_arbitration_export():
    records = list(arbitration_records.values())
    summary = {
        "total_orders": len(rental_orders),
        "total_records": len(records),
        "by_status": {},
        "by_review_status": {},
        "total_refund": 0,
        "total_blocked": 0,
        "warehouse_affected": [],
    }

    for r in records:
        s = r["deposit_status"]
        summary["by_status"][s] = summary["by_status"].get(s, 0) + 1
        rs = r["review_status"]
        summary["by_review_status"][rs] = summary["by_review_status"].get(rs, 0) + 1
        if r["refund_blocked"]:
            summary["total_blocked"] += 1
        else:
            summary["total_refund"] += r["refund_amount"]
        wi = r.get("warehouse_impact")
        if wi and wi.get("affected"):
            summary["warehouse_affected"].append({
                "order_id": r["order_id"],
                "changes": wi["changes"],
                "previous_status": wi.get("previous_status"),
                "current_status": r["deposit_status"],
            })

    return jsonify({"ok": True, "records": records, "summary": summary})


@app.route("/api/arbitration/log", methods=["GET"])
def api_arbitration_log():
    return jsonify({"ok": True, "log": arbitration_log})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)

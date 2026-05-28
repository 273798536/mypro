import json
import sqlite3
from database import get_conn

STEP_RETURN_OF_CAPITAL = "return_of_capital"
STEP_PREFERRED_RETURN = "preferred_return"
STEP_CATCH_UP = "catch_up"
STEP_CARRIED_INTEREST = "carried_interest"
STEP_RESIDUAL = "residual"

STEP_LABELS = {
    STEP_RETURN_OF_CAPITAL: "资本返还",
    STEP_PREFERRED_RETURN: "优先回报(门槛收益)",
    STEP_CATCH_UP: "追赶条款",
    STEP_CARRIED_INTEREST: "超额收益(业绩报酬)",
    STEP_RESIDUAL: "剩余分配",
}

REASON_HURDLE_CROSS_TIER = "hurdle_cross_tier"
REASON_CO_INVEST_DISCOUNT = "co_invest_discount"
REASON_BATCH_DISTRIBUTION = "batch_distribution"


def detect_hurdle_cross_tier(investor_id: int, rule_id: int, conn: sqlite3.Connection) -> list[dict]:
    rule = conn.execute("SELECT * FROM distribution_rules WHERE id = ?", (rule_id,)).fetchone()
    if not rule:
        return []
    tiers = json.loads(rule["hurdle_tiers"])
    if not tiers or len(tiers) < 2:
        return []

    investor = conn.execute("SELECT * FROM investors WHERE id = ?", (investor_id,)).fetchone()
    if not investor:
        return []

    fund = conn.execute("SELECT * FROM funds WHERE id = ?", (investor["fund_id"],)).fetchone()
    if not fund:
        return []

    results = []
    prev_distributions = conn.execute(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM distributions WHERE fund_id = ? AND status = 'completed'",
        (investor["fund_id"],),
    ).fetchone()
    cumulative = prev_distributions["total"] if prev_distributions else 0

    share_pct = investor["share_percentage"]
    investor_cumulative = cumulative * share_pct
    investor_commitment = investor["commitment_amount"]

    if investor_commitment <= 0:
        return results

    return_rate = investor_cumulative / investor_commitment

    for i in range(len(tiers) - 1):
        lower = tiers[i]["threshold"]
        upper = tiers[i + 1]["threshold"]
        if lower <= return_rate < upper:
            results.append({
                "investor_id": investor_id,
                "investor_name": investor["name"],
                "current_rate": round(return_rate, 6),
                "lower_tier": tiers[i]["label"],
                "upper_tier": tiers[i + 1]["label"],
                "lower_threshold": lower,
                "upper_threshold": upper,
                "reason_type": REASON_HURDLE_CROSS_TIER,
            })
            break

    return results


def detect_co_invest_issues(investor_id: int, conn: sqlite3.Connection) -> list[dict]:
    co_invests = conn.execute(
        "SELECT * FROM co_investments WHERE investor_id = ? AND status = 'active'",
        (investor_id,),
    ).fetchall()
    results = []
    for ci in co_invests:
        if ci["discount_rate"] > 0:
            results.append({
                "investor_id": investor_id,
                "co_investment_id": ci["id"],
                "discount_rate": ci["discount_rate"],
                "co_invest_amount": ci["co_invest_amount"],
                "reason_type": REASON_CO_INVEST_DISCOUNT,
            })
    return results


def detect_batch_distribution(investor_id: int, conn: sqlite3.Connection) -> list[dict]:
    co_invests = conn.execute(
        "SELECT * FROM co_investments WHERE investor_id = ? AND status = 'active'",
        (investor_id,),
    ).fetchall()
    results = []
    for ci in co_invests:
        if ci["batch_number"] > 1:
            results.append({
                "investor_id": investor_id,
                "co_investment_id": ci["id"],
                "batch_number": ci["batch_number"],
                "co_invest_amount": ci["co_invest_amount"],
                "reason_type": REASON_BATCH_DISTRIBUTION,
            })
    return results


def calculate_waterfall(distribution_id: int, conn: sqlite3.Connection) -> dict:
    dist = conn.execute("SELECT * FROM distributions WHERE id = ?", (distribution_id,)).fetchone()
    if not dist:
        return {"error": "分配记录不存在"}

    rule = conn.execute("SELECT * FROM distribution_rules WHERE id = ?", (dist["rule_id"],)).fetchone()
    if not rule:
        return {"error": "分配规则不存在"}

    fund_id = dist["fund_id"]
    total_amount = dist["total_amount"]

    investors = conn.execute("SELECT * FROM investors WHERE fund_id = ?", (fund_id,)).fetchall()
    if not investors:
        return {"error": "基金下无投资人"}

    hurdle_tiers = json.loads(rule["hurdle_tiers"])

    total_commitment = sum(inv["commitment_amount"] for inv in investors)
    shares = {inv["id"]: inv["share_percentage"] for inv in investors}
    commitments = {inv["id"]: inv["commitment_amount"] for inv in investors}
    names = {inv["id"]: inv["name"] for inv in investors}

    co_invest_map = {}
    for inv in investors:
        cis = conn.execute(
            "SELECT * FROM co_investments WHERE investor_id = ? AND fund_id = ? AND status = 'active'",
            (inv["id"], fund_id),
        ).fetchall()
        for ci in cis:
            co_invest_map.setdefault(inv["id"], []).append(dict(ci))

    pending = conn.execute(
        "SELECT * FROM pending_confirmations WHERE distribution_id = ? AND reason_type = ? AND status != 'approved'",
        (distribution_id, REASON_HURDLE_CROSS_TIER),
    ).fetchall()
    hurdle_blocked_investors = {p["investor_id"] for p in pending}

    conn.execute("DELETE FROM waterfall_steps WHERE distribution_id = ?", (distribution_id,))
    conn.execute("DELETE FROM distribution_details WHERE distribution_id = ?", (distribution_id,))
    conn.commit()

    steps = []
    details = []
    remaining = total_amount
    step_order = 0

    step1_total = min(remaining, total_commitment)
    step_order += 1
    steps.append({
        "distribution_id": distribution_id,
        "step_order": step_order,
        "step_type": STEP_RETURN_OF_CAPITAL,
        "total_amount": round(step1_total, 2),
        "description": STEP_LABELS[STEP_RETURN_OF_CAPITAL],
    })
    for inv in investors:
        if inv["id"] in hurdle_blocked_investors:
            amt = 0.0
        else:
            amt = step1_total * shares[inv["id"]]
        details.append({
            "distribution_id": distribution_id,
            "waterfall_step_order": step_order,
            "investor_id": inv["id"],
            "amount": round(amt, 2),
            "percentage": shares[inv["id"]],
            "is_co_invest": 0,
        })
    remaining -= step1_total

    step2_total = 0.0
    step2_details = []
    step_order += 1
    for inv in investors:
        if inv["id"] in hurdle_blocked_investors:
            continue
        inv_commitment = commitments[inv["id"]]
        preferred = inv_commitment * rule["preferred_return_rate"]
        alloc = min(preferred, remaining * shares[inv["id"]])
        step2_total += alloc
        step2_details.append({
            "distribution_id": distribution_id,
            "waterfall_step_order": step_order,
            "investor_id": inv["id"],
            "amount": round(alloc, 2),
            "percentage": shares[inv["id"]],
            "is_co_invest": 0,
        })

        if inv["id"] in co_invest_map:
            for ci in co_invest_map[inv["id"]]:
                ci_preferred = ci["co_invest_amount"] * rule["preferred_return_rate"] * (1 - ci["discount_rate"])
                ci_alloc = min(ci_preferred, remaining * 0.01)
                step2_total += ci_alloc
                step2_details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": round(ci_alloc, 2),
                    "percentage": ci["discount_rate"],
                    "is_co_invest": 1,
                })

    steps.append({
        "distribution_id": distribution_id,
        "step_order": step_order,
        "step_type": STEP_PREFERRED_RETURN,
        "total_amount": round(step2_total, 2),
        "description": STEP_LABELS[STEP_PREFERRED_RETURN],
    })
    details.extend(step2_details)
    remaining -= step2_total

    if remaining > 0 and rule["catch_up_rate"] > 0:
        gp_catch_up = remaining * rule["catch_up_rate"] / (1 + rule["catch_up_rate"])
        step_order += 1
        steps.append({
            "distribution_id": distribution_id,
            "step_order": step_order,
            "step_type": STEP_CATCH_UP,
            "total_amount": round(gp_catch_up, 2),
            "description": STEP_LABELS[STEP_CATCH_UP],
        })
        for inv in investors:
            if inv["investor_type"] == "gp":
                details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": round(gp_catch_up, 2),
                    "percentage": 1.0,
                    "is_co_invest": 0,
                })
            else:
                details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": 0.0,
                    "percentage": 0.0,
                    "is_co_invest": 0,
                })
        remaining -= gp_catch_up

    if remaining > 0:
        carried = remaining * rule["carried_interest_rate"]
        step_order += 1
        steps.append({
            "distribution_id": distribution_id,
            "step_order": step_order,
            "step_type": STEP_CARRIED_INTEREST,
            "total_amount": round(carried, 2),
            "description": STEP_LABELS[STEP_CARRIED_INTEREST],
        })
        for inv in investors:
            if inv["investor_type"] == "gp":
                details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": round(carried, 2),
                    "percentage": rule["carried_interest_rate"],
                    "is_co_invest": 0,
                })
            else:
                details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": 0.0,
                    "percentage": 0.0,
                    "is_co_invest": 0,
                })
        remaining -= carried

    if remaining > 0:
        step_order += 1
        steps.append({
            "distribution_id": distribution_id,
            "step_order": step_order,
            "step_type": STEP_RESIDUAL,
            "total_amount": round(remaining, 2),
            "description": STEP_LABELS[STEP_RESIDUAL],
        })
        for inv in investors:
            if inv["investor_type"] == "gp":
                alloc = remaining * rule["residual_split_gp"]
                details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": round(alloc, 2),
                    "percentage": rule["residual_split_gp"],
                    "is_co_invest": 0,
                })
            else:
                alloc = remaining * rule["residual_split_lp"] * shares[inv["id"]]
                details.append({
                    "distribution_id": distribution_id,
                    "waterfall_step_order": step_order,
                    "investor_id": inv["id"],
                    "amount": round(alloc, 2),
                    "percentage": rule["residual_split_lp"] * shares[inv["id"]],
                    "is_co_invest": 0,
                })

    for step in steps:
        conn.execute(
            "INSERT INTO waterfall_steps (distribution_id, step_order, step_type, total_amount, description) VALUES (?, ?, ?, ?, ?)",
            (step["distribution_id"], step["step_order"], step["step_type"], step["total_amount"], step["description"]),
        )
    conn.commit()

    for det in details:
        step_row = conn.execute(
            "SELECT id FROM waterfall_steps WHERE distribution_id = ? AND step_order = ?",
            (det["distribution_id"], det["waterfall_step_order"]),
        ).fetchone()
        step_id = step_row["id"] if step_row else 0
        conn.execute(
            "INSERT INTO distribution_details (distribution_id, waterfall_step_id, investor_id, amount, percentage, is_co_invest) VALUES (?, ?, ?, ?, ?, ?)",
            (det["distribution_id"], step_id, det["investor_id"], det["amount"], det["percentage"], det["is_co_invest"]),
        )
    conn.commit()

    return {
        "distribution_id": distribution_id,
        "steps": steps,
        "detail_count": len(details),
        "hurdle_blocked_investors": list(hurdle_blocked_investors),
    }

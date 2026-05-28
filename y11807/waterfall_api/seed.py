from database import get_conn, init_db
import json


def load_sample():
    init_db()
    conn = get_conn()
    try:
        existing = conn.execute("SELECT COUNT(*) as cnt FROM funds").fetchone()
        if existing["cnt"] > 0:
            return {"status": "skipped", "message": "数据库已有数据，跳过种子导入"}

        cur = conn.execute(
            "INSERT INTO funds (name, total_commitment) VALUES (?, ?)",
            ("华创成长一期基金", 500000000.0),
        )
        fund_id = cur.lastrowid

        investors = [
            ("国信资本", 0.30, 150000000.0, "lp"),
            ("深投控股", 0.25, 125000000.0, "lp"),
            ("招商产投", 0.20, 100000000.0, "lp"),
            ("中金鼎信", 0.15, 75000000.0, "lp"),
            ("华创GP", 0.10, 50000000.0, "gp"),
        ]
        for name, share, commit, itype in investors:
            conn.execute(
                "INSERT INTO investors (fund_id, name, share_percentage, commitment_amount, investor_type) VALUES (?, ?, ?, ?, ?)",
                (fund_id, name, share, commit, itype),
            )
        conn.commit()

        hurdle_tiers = [
            {"threshold": 0.0, "rate": 0.08, "label": "一档-基础门槛(8%)"},
            {"threshold": 0.08, "rate": 0.10, "label": "二档-标准门槛(10%)"},
            {"threshold": 0.10, "rate": 0.12, "label": "三档-超额门槛(12%)"},
        ]
        cur = conn.execute(
            """INSERT INTO distribution_rules
            (fund_id, version, effective_date, preferred_return_rate, catch_up_rate,
             carried_interest_rate, residual_split_gp, residual_split_lp, hurdle_tiers)
            VALUES (?, 1, '2024-01-01', 0.08, 1.0, 0.20, 0.20, 0.80, ?)""",
            (fund_id, json.dumps(hurdle_tiers)),
        )
        rule_id = cur.lastrowid

        inv_rows = conn.execute("SELECT * FROM investors WHERE fund_id = ?", (fund_id,)).fetchall()
        inv_map = {r["name"]: r["id"] for r in inv_rows}

        co_investments = [
            ("招商产投", 30000000.0, 0.15, 1),
            ("中金鼎信", 20000000.0, 0.10, 2),
            ("深投控股", 15000000.0, 0.0, 1),
        ]
        for name, amount, discount, batch in co_investments:
            iid = inv_map.get(name)
            if iid:
                conn.execute(
                    "INSERT INTO co_investments (investor_id, fund_id, co_invest_amount, discount_rate, batch_number, status) VALUES (?, ?, ?, ?, ?, 'active')",
                    (iid, fund_id, amount, discount, batch),
                )
        conn.commit()

        cur = conn.execute(
            "INSERT INTO distributions (fund_id, rule_id, total_amount, status) VALUES (?, ?, ?, 'draft')",
            (fund_id, rule_id, 200000000.0),
        )
        dist_id = cur.lastrowid
        conn.commit()

        from waterfall import calculate_waterfall, detect_hurdle_cross_tier, detect_co_invest_issues, detect_batch_distribution
        from waterfall import REASON_HURDLE_CROSS_TIER, REASON_CO_INVEST_DISCOUNT, REASON_BATCH_DISTRIBUTION

        result = calculate_waterfall(dist_id, conn)

        for inv in inv_rows:
            cross_tier = detect_hurdle_cross_tier(inv["id"], rule_id, conn)
            for ct in cross_tier:
                detail = f"投资人{inv['name']}的累计回报率{ct['current_rate']}处于门槛跨档区间[{ct['lower_threshold']}, {ct['upper_threshold']})"
                next_action = "请确认是否按跨档后门槛计算分配"
                conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                    (dist_id, inv["id"], REASON_HURDLE_CROSS_TIER, detail, next_action),
                )
            if not cross_tier:
                detail = f"模拟门槛跨档检测：投资人{inv['name']}当前回报率为0（首次分配），默认触发门槛档位确认"
                next_action = "请确认本次分配适用的门槛档位"
                conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                    (dist_id, inv["id"], REASON_HURDLE_CROSS_TIER, detail, next_action),
                )

            co_issues = detect_co_invest_issues(inv["id"], conn)
            for ci in co_issues:
                detail = f"投资人{inv['name']}存在跟投折扣率{ci['discount_rate']}，跟投金额{ci['co_invest_amount']}"
                next_action = "请确认跟投折扣在本次分配中是否适用"
                conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                    (dist_id, inv["id"], REASON_CO_INVEST_DISCOUNT, detail, next_action),
                )

            batch_issues = detect_batch_distribution(inv["id"], conn)
            for bi in batch_issues:
                detail = f"投资人{inv['name']}存在第{bi['batch_number']}批跟投回款，金额{bi['co_invest_amount']}"
                next_action = "请确认本批次回款是否参与本次分配"
                conn.execute(
                    "INSERT INTO pending_confirmations (distribution_id, investor_id, reason_type, reason_detail, status, next_action) VALUES (?, ?, ?, ?, 'pending', ?)",
                    (dist_id, inv["id"], REASON_BATCH_DISTRIBUTION, detail, next_action),
                )

        conn.commit()

        return {
            "status": "ok",
            "fund_id": fund_id,
            "rule_id": rule_id,
            "distribution_id": dist_id,
            "waterfall_result": result,
        }
    finally:
        conn.close()

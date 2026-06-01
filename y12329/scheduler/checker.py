import json
from datetime import datetime, timezone
from scheduler.db import (
    get_connection,
    compute_issue_hash,
    insert_issue,
    get_issues_by_type,
    get_all_issues,
)


def _parse_iso(s):
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _wait_minutes(create_time, assigned_time):
    c = _parse_iso(create_time)
    a = _parse_iso(assigned_time)
    if c and a:
        return (a - c).total_seconds() / 60.0
    return None


def _get_tickets(conn):
    rows = conn.execute("SELECT * FROM tickets").fetchall()
    return [dict(r) for r in rows]


def _get_levels(conn):
    rows = conn.execute("SELECT * FROM customer_levels").fetchall()
    return {r["level_name"]: dict(r) for r in rows}


def _get_timeout_rules(conn):
    rows = conn.execute("SELECT * FROM timeout_rules").fetchall()
    rules = {}
    for r in rows:
        key = (r["skill_group"], r["level"])
        rules[key] = dict(r)
    return rules


def _get_durations(conn):
    rows = conn.execute("SELECT * FROM handling_durations").fetchall()
    return [dict(r) for r in rows]


def _get_sched_records(conn):
    rows = conn.execute("SELECT * FROM scheduling_records").fetchall()
    return [dict(r) for r in rows]


def check_vip_preemption(conn, run_id):
    """
    VIP挤占检查：VIP工单插入队列后，同技能组的普通工单等待时间是否异常增长。
    """
    print("\n[检查] VIP挤占...")
    tickets = _get_tickets(conn)
    levels = _get_levels(conn)
    rules = _get_timeout_rules(conn)
    durations = _get_durations(conn)

    by_skill = {}
    for t in tickets:
        sg = t["skill_group"]
        by_skill.setdefault(sg, []).append(t)

    dur_map = {}
    for d in durations:
        dur_map[d["ticket_id"]] = d["duration_minutes"]

    issues = []
    for sg, group_tickets in by_skill.items():
        vip_tickets = [t for t in group_tickets if _is_vip(t["customer_level"], levels)]
        normal_tickets = [t for t in group_tickets if not _is_vip(t["customer_level"], levels)]

        if not vip_tickets or not normal_tickets:
            continue

        for nt in normal_tickets:
            wait = _wait_minutes(nt["create_time"], nt["assigned_time"])
            if wait is None:
                continue

            rule_key = (sg, nt["customer_level"])
            rule = rules.get(rule_key) or rules.get((sg, "默认"))
            max_wait = rule["max_wait_minutes"] if rule else 30

            preempting_vips = []
            for vt in vip_tickets:
                if vt["assigned_time"] and nt["assigned_time"]:
                    v_assign = _parse_iso(vt["assigned_time"])
                    n_assign = _parse_iso(nt["assigned_time"])
                    n_create = _parse_iso(nt["create_time"])
                    v_create = _parse_iso(vt["create_time"])
                    if v_create and n_create and v_assign:
                        if n_create < v_create < n_assign:
                            preempting_vips.append(vt["ticket_id"])

            if preempting_vips and wait > max_wait:
                desc_core = f"VIP_preempt_normal_in_{sg}"
                affected = [nt["ticket_id"]] + preempting_vips
                issue_hash = compute_issue_hash("VIP挤占", affected, desc_core)
                desc = (
                    f"技能组[{sg}]中，VIP工单 {preempting_vips} "
                    f"插队导致普通工单 {nt['ticket_id']} 等待{wait:.1f}分钟，"
                    f"超过上限{max_wait}分钟"
                )
                source_records = {
                    "受影响工单来源": nt["source"],
                    "VIP工单来源": next(
                        (t["source"] for t in group_tickets if t["ticket_id"] in preempting_vips), "未知"
                    ),
                    "超时规则来源": rule["source"] if rule else "无匹配规则",
                    "检查依据": "工单列表 + 客户等级 + 超时规则",
                }
                result = insert_issue(
                    conn, "VIP挤占", issue_hash, desc, affected,
                    source_records, "高", run_id,
                )
                if result:
                    issues.append(issue_hash)
                    print(f"  发现VIP挤占: 工单{nt['ticket_id']}")

    if not issues:
        print("  未发现VIP挤占问题")
    return issues


def _is_vip(level_name, levels):
    if not levels:
        return level_name in ("VIP", "SVIP", "钻石", "金牌")
    info = levels.get(level_name)
    if info:
        return info["priority_weight"] >= 5.0
    return level_name in ("VIP", "SVIP", "钻石", "金牌")


def check_skill_group_understaffed(conn, run_id):
    """
    技能组缺人检查：某技能组排队工单数量远超正在处理的工单，
    或平均等待时间远超超时规则上限。
    """
    print("\n[检查] 技能组缺人...")
    tickets = _get_tickets(conn)
    rules = _get_timeout_rules(conn)
    durations = _get_durations(conn)
    sched_records = _get_sched_records(conn)

    by_skill = {}
    for t in tickets:
        sg = t["skill_group"]
        by_skill.setdefault(sg, []).append(t)

    skill_agent_counts = {}
    for d in durations:
        sg = d["skill_group"]
        skill_agent_counts.setdefault(sg, set()).add(d["agent_id"])

    issues = []
    for sg, group_tickets in by_skill.items():
        waiting = [t for t in group_tickets if t["status"] in ("待处理", "排队中")]
        in_progress = [t for t in group_tickets if t["status"] == "处理中"]

        agent_count = len(skill_agent_counts.get(sg, set()))

        wait_times = []
        for t in waiting:
            wt = _wait_minutes(t["create_time"], t["assigned_time"])
            if wt is not None:
                wait_times.append(wt)

        avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0

        rule = rules.get((sg, "默认")) or rules.get((sg, "普通"))
        max_wait = rule["max_wait_minutes"] if rule else 30

        queue_overflow = len(waiting) > 3 * max(len(in_progress), 1)
        wait_exceeded = avg_wait > max_wait * 1.5
        agent_shortage = agent_count > 0 and len(waiting) > agent_count * 3

        if queue_overflow or wait_exceeded or agent_shortage:
            affected = [t["ticket_id"] for t in waiting]
            reasons = []
            if queue_overflow:
                reasons.append(f"排队{len(waiting)}条远超处理中{len(in_progress)}条")
            if wait_exceeded:
                reasons.append(f"平均等待{avg_wait:.1f}分钟超过上限{max_wait}分钟的1.5倍")
            if agent_shortage:
                reasons.append(f"仅{agent_count}位坐席面对{len(waiting)}条排队工单")

            desc_core = f"understaffed_{sg}"
            issue_hash = compute_issue_hash("技能组缺人", [sg], desc_core)
            desc = f"技能组[{sg}]人力不足: {'; '.join(reasons)}"
            source_records = {
                "工单列表来源": group_tickets[0]["source"] if group_tickets else "无",
                "超时规则来源": rule["source"] if rule else "无匹配规则",
                "处理时长来源": next(
                    (d["source"] for d in durations if d["skill_group"] == sg), "无"
                ),
                "检查依据": "工单列表 + 超时规则 + 处理时长",
            }
            result = insert_issue(
                conn, "技能组缺人", issue_hash, desc, affected,
                source_records, "中", run_id,
            )
            if result:
                issues.append(issue_hash)
                print(f"  发现技能组缺人: {sg}")

    if not issues:
        print("  未发现技能组缺人问题")
    return issues


def check_timeout_cascade(conn, run_id):
    """
    超时连锁检查：一个工单超时后，是否引发后续工单连锁超时。
    通过调度记录中的转派/升级动作追踪连锁反应。
    """
    print("\n[检查] 超时连锁...")
    tickets = _get_tickets(conn)
    rules = _get_timeout_rules(conn)
    sched_records = _get_sched_records(conn)
    durations = _get_durations(conn)

    ticket_map = {t["ticket_id"]: t for t in tickets}

    by_ticket = {}
    for r in sched_records:
        by_ticket.setdefault(r["ticket_id"], []).append(r)

    timeout_ticket_ids = set()
    for t in tickets:
        wait = _wait_minutes(t["create_time"], t["assigned_time"])
        if wait is None:
            continue
        rule_key = (t["skill_group"], t["customer_level"])
        rule = rules.get(rule_key) or rules.get((t["skill_group"], "默认"))
        max_wait = rule["max_wait_minutes"] if rule else 30
        if wait > max_wait:
            timeout_ticket_ids.add(t["ticket_id"])

    cascade_chains = []
    visited = set()

    for tid in timeout_ticket_ids:
        if tid in visited:
            continue
        chain = [tid]
        visited.add(tid)
        current = tid
        while True:
            records = by_ticket.get(current, [])
            escalated = False
            for rec in records:
                if rec["action"] in ("超时升级", "转派", "升级"):
                    next_tickets = [
                        r["ticket_id"]
                        for r in sched_records
                        if (r["from_queue"] == rec["to_queue"]
                            and r["timestamp"] > rec["timestamp"]
                            and r["ticket_id"] != current
                            and r["ticket_id"] in timeout_ticket_ids)
                    ]
                    for nt in next_tickets:
                        if nt not in visited:
                            chain.append(nt)
                            visited.add(nt)
                            current = nt
                            escalated = True
                            break
                    if escalated:
                        break
            if not escalated:
                break

        if len(chain) >= 2:
            cascade_chains.append(chain)

    issues = []
    for chain in cascade_chains:
        affected = chain
        desc_core = f"cascade_{'_'.join(chain[:3])}"
        issue_hash = compute_issue_hash("超时连锁", affected, desc_core)

        sources = set()
        for tid in chain:
            t = ticket_map.get(tid)
            if t:
                sources.add(t["source"])
            for r in by_ticket.get(tid, []):
                sources.add(r["source"])

        desc = (
            f"超时连锁: 工单 {' → '.join(chain)} "
            f"形成{len(chain)}级连锁超时"
        )
        source_records = {
            "工单列表来源": list(sources),
            "调度记录来源": list({
                r["source"]
                for tid in chain
                for r in by_ticket.get(tid, [])
            }),
            "超时规则来源": list({
                (rules.get((ticket_map[t]["skill_group"], ticket_map[t]["customer_level"]))
                 or rules.get((ticket_map[t]["skill_group"], "默认")) or {}).get("source", "无")
                for t in chain if t in ticket_map
            }),
            "检查依据": "工单列表 + 调度记录 + 超时规则",
        }
        result = insert_issue(
            conn, "超时连锁", issue_hash, desc, affected,
            source_records, "高", run_id,
        )
        if result:
            issues.append(issue_hash)
            print(f"  发现超时连锁: {' → '.join(chain)}")

    if not issues:
        print("  未发现超时连锁问题")
    return issues


def run_all_checks(conn, run_id):
    print("=" * 50)
    print("开始公平性检查")
    print("=" * 50)

    vip_issues = check_vip_preemption(conn, run_id)
    skill_issues = check_skill_group_understaffed(conn, run_id)
    cascade_issues = check_timeout_cascade(conn, run_id)

    print("\n" + "=" * 50)
    print("检查完成")
    print(f"  VIP挤占: {len(vip_issues)} 条新问题")
    print(f"  技能组缺人: {len(skill_issues)} 条新问题")
    print(f"  超时连锁: {len(cascade_issues)} 条新问题")
    print("=" * 50)

    return {
        "VIP挤占": len(vip_issues),
        "技能组缺人": len(skill_issues),
        "超时连锁": len(cascade_issues),
    }

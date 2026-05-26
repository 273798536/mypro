"""P2P历史兑付清算 - CSV导出"""

import csv
import os
from typing import List, Dict


def export_csv(rows: List[dict], filepath: str) -> int:
    """导出数据到CSV，返回行数"""
    if not rows:
        return 0
    fieldnames = list(rows[0].keys())
    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def export_all(dataset, engine, output_dir: str = "output") -> Dict[str, int]:
    """导出所有分类CSV，返回各文件行数"""
    results = {}
    os.makedirs(output_dir, exist_ok=True)

    # 1. 投资人汇总
    summary = engine.investor_summary()
    results["investor_summary"] = export_csv(summary, os.path.join(output_dir, "investor_summary.csv"))

    # 2. 合同兑付明细
    recalc = engine.recalculate()
    results["contract_details"] = export_csv(recalc, os.path.join(output_dir, "contract_details.csv"))

    # 3. 兑付记录明细
    repayments = [r.to_dict() for r in dataset.repayments.values()]
    results["repayments"] = export_csv(repayments, os.path.join(output_dir, "repayments.csv"))

    # 4. 凭证明细
    vouchers = [v.to_dict() for v in dataset.vouchers.values()]
    results["vouchers"] = export_csv(vouchers, os.path.join(output_dir, "vouchers.csv"))

    # 5. 争议清单
    disputes = [d.to_dict() for d in dataset.disputes]
    results["disputes"] = export_csv(disputes, os.path.join(output_dir, "disputes.csv"))

    # 6. 修正日志
    audit = [a.to_dict() for a in dataset.audit_log]
    results["audit_log"] = export_csv(audit, os.path.join(output_dir, "audit_log.csv"))

    # 7. 投资人名单（含别名/归并信息）
    investors = []
    for inv in dataset.investors.values():
        investors.append({
            "investor_id": inv.investor_id,
            "name": inv.name,
            "aliases": "; ".join(inv.aliases) if inv.aliases else "",
            "id_card": inv.id_card or "",
            "merged_into": inv.merged_into or "",
            "notes": inv.notes,
        })
    results["investors"] = export_csv(investors, os.path.join(output_dir, "investors.csv"))

    return results

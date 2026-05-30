from cf_diag.core.models import DiagnosisResult


CONTACT_MAP = {
    "hot_crowding": "推荐策略组负责人",
    "sparse_matrix": "数据工程组负责人",
    "cold_start": "内容运营组负责人",
}


def build_routing(store) -> list[dict]:
    routings = []
    for diag in store.diagnoses:
        contact = CONTACT_MAP.get(diag.diag_type, diag.next_contact)
        routings.append({
            "diagnosis_type": diag.diag_type,
            "severity": diag.severity,
            "summary": diag.details,
            "next_step": diag.next_step,
            "contact": contact,
        })
    for rec in store.cold_starts.values():
        if rec.status == "pending":
            routings.append({
                "diagnosis_type": "cold_start",
                "severity": "medium",
                "summary": f"物品{rec.item_id}冷启动待确认: {rec.reason}",
                "next_step": "确认该物品是否应进入正常推荐流程",
                "contact": CONTACT_MAP["cold_start"],
            })
    return routings

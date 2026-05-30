from cf_diag.core.store import DataStore


def explain_recommendation(store: DataStore, item_id: str) -> dict:
    tags = store.item_tags.get(item_id, [])
    similar_items = []
    for key, sim in store.similarity_results.items():
        if sim.item_a == item_id or sim.item_b == item_id:
            other = sim.item_b if sim.item_a == item_id else sim.item_a
            similar_items.append({
                "item_id": other,
                "similarity": sim.score,
                "method": sim.method,
                "status": sim.status,
                "other_tags": store.item_tags.get(other, []),
            })

    similar_items.sort(key=lambda x: x["similarity"], reverse=True)

    cold_start_info = None
    if item_id in store.cold_starts:
        r = store.cold_starts[item_id]
        cold_start_info = {
            "status": r.status,
            "reason": r.reason,
            "assigned_to": r.assigned_to,
        }

    return {
        "item_id": item_id,
        "tags": tags,
        "similar_items": similar_items[:10],
        "cold_start": cold_start_info,
        "data_version": store.data_version,
    }

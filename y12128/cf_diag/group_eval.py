from cf_diag.core.store import DataStore


def group_evaluate(store: DataStore) -> dict:
    groups: dict[str, list] = {}
    for key, sim in store.similarity_results.items():
        if sim.method not in groups:
            groups[sim.method] = []
        groups[sim.method].append({
            "item_a": sim.item_a,
            "item_b": sim.item_b,
            "score": sim.score,
            "status": sim.status,
            "is_cold_start": sim.is_cold_start,
        })

    evaluation = {}
    for method, items in groups.items():
        scores = [i["score"] for i in items]
        cold_count = sum(1 for i in items if i["is_cold_start"])
        avg_score = sum(scores) / len(scores) if scores else 0.0
        max_score = max(scores) if scores else 0.0
        min_score = min(scores) if scores else 0.0

        evaluation[method] = {
            "total_pairs": len(items),
            "avg_score": round(avg_score, 6),
            "max_score": round(max_score, 6),
            "min_score": round(min_score, 6),
            "cold_start_affected": cold_count,
            "confirmed": sum(1 for i in items if i["status"] == "confirmed"),
            "pending": sum(1 for i in items if i["status"] == "pending"),
        }

    return evaluation

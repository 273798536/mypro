from cf_diag.core.models import CorrectionRecord


def list_corrections(store) -> list[dict]:
    return [
        {
            "correction_id": c.correction_id,
            "timestamp": c.timestamp,
            "field": c.field,
            "old_value": c.old_value,
            "new_value": c.new_value,
            "reason": c.reason,
            "operator": c.operator,
            "affected_results": c.affected_result_keys,
        }
        for c in store.corrections
    ]


def get_correction_history_for_item(store, item_id: str) -> list[dict]:
    results = []
    for c in store.corrections:
        if any(item_id in k for k in c.affected_result_keys):
            results.append({
                "correction_id": c.correction_id,
                "timestamp": c.timestamp,
                "field": c.field,
                "old_value": c.old_value,
                "new_value": c.new_value,
                "reason": c.reason,
                "operator": c.operator,
            })
    return results


def get_exposure_impact_report(store) -> list[dict]:
    return store.get_changed_after_exposure()

import uuid
from datetime import datetime
from cf_diag.core.models import CorrectionRecord


def apply_correction(
    store,
    item_a: str,
    item_b: str,
    method: str,
    field: str,
    new_value: str,
    reason: str,
    operator: str,
) -> CorrectionRecord:
    key = store._make_sim_key(item_a, item_b, method)
    sim = store.similarity_results.get(key)
    if sim is None:
        raise ValueError(f"未找到相似度记录: {key}")

    old_value = str(getattr(sim, field))
    correction = CorrectionRecord(
        correction_id=str(uuid.uuid4())[:8],
        timestamp=datetime.now().isoformat(),
        field=field,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        operator=operator,
        affected_result_keys=[key],
    )

    if field == "score":
        sim.score = float(new_value)
    elif field == "status":
        sim.status = new_value
    else:
        setattr(sim, field, new_value)

    sim.correction_id = correction.correction_id
    store.add_correction(correction)
    return correction

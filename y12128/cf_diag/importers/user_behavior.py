import json
from cf_diag.core.models import BehaviorRecord


def import_user_behaviors(store, source) -> list[BehaviorRecord]:
    if isinstance(source, str):
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif isinstance(source, list):
        data = source
    else:
        data = source

    records = []
    for item in data:
        r = BehaviorRecord(
            user_id=str(item["user_id"]),
            item_id=str(item["item_id"]),
            action=item["action"],
            timestamp=item["timestamp"],
            duration=item.get("duration"),
        )
        records.append(r)
    store.add_behaviors(records)
    return records

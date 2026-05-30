import json
from cf_diag.core.models import ExposureRecord


def import_exposures(store, source) -> list[ExposureRecord]:
    if isinstance(source, str):
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif isinstance(source, list):
        data = source
    else:
        data = source

    store.snapshot_before_exposure()

    records = []
    for item in data:
        r = ExposureRecord(
            user_id=str(item["user_id"]),
            item_id=str(item["item_id"]),
            position=int(item["position"]),
            timestamp=item["timestamp"],
            clicked=bool(item.get("clicked", False)),
        )
        records.append(r)
    store.add_exposures(records)
    return records

import json


def import_item_tags(store, source) -> dict:
    if isinstance(source, str):
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif isinstance(source, dict):
        data = source
    else:
        data = source

    tags = {str(k): list(v) for k, v in data.items()}
    store.set_item_tags(tags)
    return tags

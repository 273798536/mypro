import json


def import_rating_matrix(store, source) -> dict:
    if isinstance(source, str):
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif isinstance(source, dict):
        data = source
    else:
        data = source

    matrix = {}
    for uid, ratings in data.items():
        matrix[str(uid)] = {str(iid): float(score) for iid, score in ratings.items()}
    store.set_rating_matrix(matrix)
    return matrix

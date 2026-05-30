def trace_forward(store, user_id: str) -> list:
    return store.trace_forward_from_behavior(user_id)


def trace_backward(store, item_id: str) -> dict:
    return store.trace_backward_to_tags(item_id)

from typing import List, Dict, Any


def _tokenize(text: str) -> List[str]:
    tokens = []
    buf = []
    for ch in text:
        if ch.isspace() or ch in "，。、；：？！,.!?;:()[]{}<>\"'\\/+-*=":
            if buf:
                tokens.append("".join(buf))
                buf = []
            tokens.append(ch)
        else:
            buf.append(ch)
    if buf:
        tokens.append("".join(buf))
    return tokens


def diff_text(a: str, b: str) -> List[Dict[str, Any]]:
    ta = _tokenize(a)
    tb = _tokenize(b)
    n, m = len(ta), len(tb)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            if ta[i] == tb[j]:
                dp[i][j] = dp[i + 1][j + 1] + 1
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    ops = []
    i, j = 0, 0
    while i < n and j < m:
        if ta[i] == tb[j]:
            ops.append({"type": "equal", "value": ta[i]})
            i += 1
            j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            ops.append({"type": "delete", "value": ta[i]})
            i += 1
        else:
            ops.append({"type": "insert", "value": tb[j]})
            j += 1
    while i < n:
        ops.append({"type": "delete", "value": ta[i]})
        i += 1
    while j < m:
        ops.append({"type": "insert", "value": tb[j]})
        j += 1
    return _coalesce(ops)


def _coalesce(ops: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    buf_type = None
    buf_val = []
    for op in ops:
        if op["type"] == buf_type:
            buf_val.append(op["value"])
        else:
            if buf_type is not None:
                out.append({"type": buf_type, "value": "".join(buf_val)})
            buf_type = op["type"]
            buf_val = [op["value"]]
    if buf_type is not None:
        out.append({"type": buf_type, "value": "".join(buf_val)})
    return out


def char_diff_count(a: str, b: str) -> int:
    ops = diff_text(a, b)
    count = 0
    for op in ops:
        if op["type"] != "equal":
            count += len(op["value"])
    return count

from __future__ import annotations

import hashlib
import re


def normalize_value(value: str) -> str:
    s = value.strip()
    s = s.replace("\u00a0", " ")
    s = s.replace("\u3000", " ")
    s = re.sub(r"\s+", " ", s)
    s = s.rstrip("\u0000")
    s = s.lower()
    s = _normalize_numeric(s)
    return s


def _normalize_numeric(s: str) -> str:
    s_clean = s.replace(",", "")
    if re.fullmatch(r"-?\d+\.\d+", s_clean):
        s_clean = s_clean.rstrip("0").rstrip(".")
        return s_clean
    if re.fullmatch(r"-?\d+", s_clean):
        return s_clean
    return s


def compute_row_fingerprint(row: dict[str, str], key_fields: list[str] | None = None) -> str:
    if key_fields:
        parts = []
        for kf in sorted(key_fields):
            raw = row.get(kf, "")
            parts.append(f"{kf}={normalize_value(raw)}")
        payload = "|".join(parts)
    else:
        sorted_items = sorted(row.items())
        parts = [f"{k}={normalize_value(v)}" for k, v in sorted_items if normalize_value(v)]
        payload = "|".join(parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def compute_batch_fingerprint(file_paths: list[str], extra: str = "") -> str:
    normalized = sorted(p.strip() for p in file_paths if p.strip())
    payload = "|".join(normalized)
    if extra:
        payload += f"|{extra}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def compute_content_fingerprint(rows: list[dict[str, str]], key_fields: list[str] | None = None) -> str:
    fps = sorted(compute_row_fingerprint(r, key_fields) for r in rows)
    payload = "|".join(fps)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def rows_match(row_a: dict[str, str], row_b: dict[str, str], key_fields: list[str] | None = None) -> bool:
    return compute_row_fingerprint(row_a, key_fields) == compute_row_fingerprint(row_b, key_fields)

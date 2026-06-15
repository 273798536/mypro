"""曲目表解析器 —— 保留原始来源，识别授权备注，不掩盖脏数据"""
from __future__ import annotations

import csv
import io
import re
from pathlib import Path
from typing import Optional

from .models import (
    TrackRow,
    AuthorizationNote,
    AUTHORIZATION_PATTERNS,
    INTRO_KEYWORDS,
)
from .exceptions import RowIssue


DATE_PATTERNS = [
    re.compile(r"(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?)"),
    re.compile(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})"),
    re.compile(r"有效期至[:：]?\s*([^\s,，;；]+)"),
    re.compile(r"到期[:：]?\s*([^\s,，;；]+)"),
    re.compile(r"授权期[:：]?\s*([^\s,，;；]+)"),
]

REHEARSAL_PATTERNS = [
    "排练", "rehearsal", "彩排", "试演", "录排", "走台",
]


def _detect_header(fields: list[str]) -> dict[str, int]:
    """启发式识别列映射"""
    mapping: dict[str, int] = {}
    if not fields:
        return mapping
    lower = [f.strip().lower() for f in fields]
    for i, name in enumerate(lower):
        stripped = name.replace(" ", "").replace("_", "")
        if stripped in ("曲目", "曲名", "标题", "名称", "track", "title", "name", "歌曲", "歌名"):
            mapping["track_title"] = i
        elif stripped in ("版本", "版次", "version", "ver", "edition", "tag", "版本号"):
            mapping["version_tag"] = i
        elif stripped in ("时长", "时间", "长度", "duration", "length", "time"):
            mapping["duration"] = i
        elif stripped in ("备注", "注释", "说明", "remark", "note", "comment", "说明"):
            mapping["remark"] = i
        elif stripped in ("表演者", "演奏", "演唱", "performer", "artist"):
            mapping["performer"] = i
        elif stripped in ("交付编号", "交付单号", "交付", "delivery", "deliver", "delno", "交付号"):
            mapping["delivery_ref"] = i
    return mapping


def _parse_authorization(text: str, source: str) -> Optional[AuthorizationNote]:
    """从备注文本中抽取授权信息"""
    if not text:
        return None
    low = text.lower()
    has_auth = any(p in low or p in text for p in AUTHORIZATION_PATTERNS)
    expiry: Optional[str] = None
    for pat in DATE_PATTERNS:
        m = pat.search(text)
        if m:
            expiry = m.group(1)
            break
    if has_auth or expiry:
        return AuthorizationNote(
            raw_text=text,
            has_authorization=has_auth,
            expiry_date=expiry,
            source=source,
        )
    return None


def _detect_rehearsal_note(text: str) -> bool:
    if not text:
        return False
    low = text.lower()
    return any(p in low or p in text for p in REHEARSAL_PATTERNS)


def _is_header_row(fields: list[str]) -> bool:
    if not fields or len(fields) < 2:
        return False
    text = ",".join(fields).lower()
    header_markers = ["曲目", "曲名", "标题", "版本", "时长", "备注", "track", "title", "version", "duration", "remark"]
    hits = sum(1 for m in header_markers if m in text)
    return hits >= 2


def parse_tracklist(csv_path: str) -> list[TrackRow]:
    """
    解析曲目表 CSV。

    原则：
    1. 保留原始 CSV 行在 raw_csv_line / raw_fields 中，永不丢弃
    2. 启发式识别表头，但不修正字段内容
    3. 格式不合法的行标记为 bad_row，但原始数据仍保留
    4. 备注中的授权/排练信息单独抽取到结构化字段
    """
    path = Path(csv_path)
    raw_bytes = path.read_bytes()
    encoding = "utf-8"
    try:
        content = raw_bytes.decode(encoding)
    except UnicodeDecodeError:
        try:
            encoding = "gbk"
            content = raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            encoding = "utf-8-sig"
            content = raw_bytes.decode(encoding, errors="replace")

    # 保留原始逐行文本（用于证据链）
    raw_lines = content.splitlines(keepends=False)

    tracks: list[TrackRow] = []
    col_mapping: dict[str, int] = {}
    header_detected = False

    reader = csv.reader(io.StringIO(content))
    for idx, fields in enumerate(reader, start=1):
        raw_line = raw_lines[idx - 1] if idx - 1 < len(raw_lines) else ",".join(fields)

        # 空行标记为跳过，保留原始行
        if not fields or all(not f.strip() for f in fields):
            tr = TrackRow(
                row_number=idx,
                raw_csv_line=raw_line,
                raw_fields=fields,
                source_file=str(path),
            )
            tr.mark_skipped("空行")
            tracks.append(tr)
            continue

        # 自动检测表头
        if not header_detected and _is_header_row(fields):
            col_mapping = _detect_header(fields)
            header_detected = True
            # 表头本身标记跳过
            tr = TrackRow(
                row_number=idx,
                raw_csv_line=raw_line,
                raw_fields=fields,
                source_file=str(path),
            )
            tr.mark_skipped("表头行")
            tracks.append(tr)
            continue

        # 字段过少视为坏行
        if len(fields) < 2:
            tr = TrackRow(
                row_number=idx,
                raw_csv_line=raw_line,
                raw_fields=fields,
                source_file=str(path),
            )
            tr.mark_bad(
                f"字段数不足：仅 {len(fields)} 列，至少需要 2 列",
                suggestion="检查是否为分隔符错误（应为英文逗号）或行未闭合引号",
            )
            tracks.append(tr)
            continue

        # 基于列映射填充结构化字段（缺列则留空，不报错）
        track_title = fields[col_mapping["track_title"]].strip() if "track_title" in col_mapping else fields[0].strip()
        version_tag = fields[col_mapping["version_tag"]].strip() if "version_tag" in col_mapping else ""
        duration = fields[col_mapping["duration"]].strip() if "duration" in col_mapping else ""
        performer = fields[col_mapping["performer"]].strip() if "performer" in col_mapping else ""
        delivery_ref = fields[col_mapping["delivery_ref"]].strip() if "delivery_ref" in col_mapping else ""
        remark = fields[col_mapping["remark"]].strip() if "remark" in col_mapping else ""

        # 若没有显式备注列，尝试从尾部字段中猜测备注（包含授权关键词或逗号拼接剩余）
        if not remark and len(fields) > len(col_mapping):
            extra = fields[max(col_mapping.values()) + 1:]
            remark = " ".join(e.strip() for e in extra if e.strip())

        # 无曲目名的行视为坏行
        if not track_title:
            tr = TrackRow(
                row_number=idx,
                raw_csv_line=raw_line,
                raw_fields=fields,
                source_file=str(path),
                version_tag=version_tag,
                duration=duration,
                remark=remark,
                performer=performer,
                delivery_ref=delivery_ref,
            )
            tr.mark_bad("曲目名称为空", suggestion="请在第一列或「曲目」列填写曲名")
            tracks.append(tr)
            continue

        tr = TrackRow(
            row_number=idx,
            raw_csv_line=raw_line,
            raw_fields=fields,
            source_file=str(path),
            track_title=track_title,
            version_tag=version_tag,
            duration=duration,
            remark=remark,
            performer=performer,
            delivery_ref=delivery_ref,
        )

        # 抽取授权信息（优先从备注，失败则从版本、曲名等连串文本）
        auth = _parse_authorization(remark, f"row_{idx}_remark")
        if auth is None:
            concat = " ".join([track_title, version_tag, performer]).strip()
            auth = _parse_authorization(concat, f"row_{idx}_other_fields")
        tr.authorization = auth

        tracks.append(tr)

    return tracks


def parse_delivery_list(csv_path: str) -> set[str]:
    """
    解析交付清单，返回交付编号集合。
    没有文件则返回空集。
    """
    path = Path(csv_path)
    if not path.exists():
        return set()
    content = path.read_text(encoding="utf-8", errors="replace")
    refs: set[str] = set()
    reader = csv.reader(io.StringIO(content))
    for fields in reader:
        for f in fields:
            stripped = f.strip()
            if stripped and len(stripped) >= 3:
                refs.add(stripped)
    return refs


def parse_annotation_file(json_path: str) -> dict[str, dict]:
    """
    解析人工批注文件（JSON 行或对象）。
    返回 {row_hash: annotation_dict}。
    """
    path = Path(json_path)
    if not path.exists():
        return {}
    try:
        data = __import__("json").loads(path.read_text(encoding="utf-8"))
    except Exception:
        # 尝试按 JSON Lines 解析
        annotations: dict[str, dict] = {}
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = __import__("json").loads(line)
                if "row_hash" in obj:
                    annotations[obj["row_hash"]] = obj
            except Exception:
                continue
        return annotations
    if isinstance(data, list):
        return {item["row_hash"]: item for item in data if "row_hash" in item}
    if isinstance(data, dict) and "row_hash" in data:
        return {data["row_hash"]: data}
    if isinstance(data, dict):
        return {k: v for k, v in data.items() if isinstance(v, dict)}
    return {}

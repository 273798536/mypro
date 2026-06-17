import json
import csv
import os
from typing import List, Tuple
from .models import ClusterRecord, ParseStats


def parse_file(file_path: str) -> Tuple[List[ClusterRecord], ParseStats]:
    stats = ParseStats()
    records = []

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".json":
        records, stats = _parse_json(file_path)
    elif ext == ".csv":
        records, stats = _parse_csv(file_path)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    return records, stats


def _parse_json(file_path: str) -> Tuple[List[ClusterRecord], ParseStats]:
    stats = ParseStats()
    records = []

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            stats.bad_lines += 1
            stats.bad_details.append(f"JSON解析失败: {str(e)}")
            stats.total = 1
            return records, stats

    if isinstance(data, list):
        items = data
    elif isinstance(data, dict) and "data" in data:
        items = data.get("data", [])
    else:
        items = [data]

    stats.total = len(items)

    for idx, item in enumerate(items):
        try:
            record = _dict_to_record(item)
            records.append(record)
            stats.processed += 1
        except ValueError as e:
            stats.bad_lines += 1
            stats.bad_details.append(f"第{idx + 1}行: {str(e)}")
        except Exception as e:
            stats.skipped_lines += 1
            stats.skipped_details.append(f"第{idx + 1}行: {str(e)}")

    return records, stats


def _parse_csv(file_path: str) -> Tuple[List[ClusterRecord], ParseStats]:
    stats = ParseStats()
    records = []

    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        stats.total = len(rows)

        for idx, row in enumerate(rows):
            try:
                record = _dict_to_record(row)
                records.append(record)
                stats.processed += 1
            except ValueError as e:
                stats.bad_lines += 1
                stats.bad_details.append(f"第{idx + 1}行: {str(e)}")
            except Exception as e:
                stats.skipped_lines += 1
                stats.skipped_details.append(f"第{idx + 1}行: {str(e)}")

    return records, stats


def _dict_to_record(item: dict) -> ClusterRecord:
    required_fields = ["cluster_id", "title", "sentiment", "confidence"]
    missing = [f for f in required_fields if f not in item or item[f] is None or item[f] == ""]

    if missing:
        raise ValueError(f"缺少必填字段: {', '.join(missing)}")

    try:
        confidence = float(item["confidence"])
        if confidence < 0 or confidence > 1:
            raise ValueError("confidence 必须在 0-1 之间")
    except (ValueError, TypeError):
        raise ValueError(f"confidence 格式错误: {item.get('confidence')}")

    has_citation = item.get("has_citation", "true").lower() == "true" if isinstance(item.get("has_citation"), str) else bool(item.get("has_citation", True))

    return ClusterRecord(
        cluster_id=str(item["cluster_id"]),
        title=str(item.get("title", "")),
        content=str(item.get("content", "")),
        sentiment=str(item["sentiment"]),
        confidence=confidence,
        source=str(item.get("source", "")),
        publish_time=str(item.get("publish_time", "")),
        has_citation=has_citation,
        citation_note=item.get("citation_note"),
    )

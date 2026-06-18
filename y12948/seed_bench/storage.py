from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator, Optional

import pandas as pd

from .errors import DuplicateRecordError, InputDataError
from .models import (
    DataRecord,
    DedupResult,
    ReviewRecord,
    ReviewStatus,
    ShuffleResult,
    compute_content_hash,
    generate_id,
)


class FileSystemStorage:
    """基于文件系统的幂等存储后端

    目录结构:
      data_dir/
        batches/
          {batch_id}/
            records.jsonl       # 原始记录（幂等写入）
            dedup_results.json  # 去重结果
            shuffle_result.json # 混洗结果
            review.json         # 复核记录
            versions.json       # 版本元数据
        exports/
          {batch_id}_{name}.{ext}
        sample/                  # 示例数据缓存
    """

    def __init__(self, data_dir: str | Path = "./data"):
        self.data_dir = Path(data_dir)
        self.batches_dir = self.data_dir / "batches"
        self.exports_dir = self.data_dir / "exports"
        self.sample_dir = self.data_dir / "sample"
        for d in (self.data_dir, self.batches_dir, self.exports_dir, self.sample_dir):
            d.mkdir(parents=True, exist_ok=True)

    # ---------- 批处理目录 ----------
    def _batch_dir(self, batch_id: str) -> Path:
        p = self.batches_dir / batch_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def _versions_path(self, batch_id: str) -> Path:
        return self._batch_dir(batch_id) / "versions.json"

    def _load_versions(self, batch_id: str) -> dict[str, Any]:
        path = self._versions_path(batch_id)
        if not path.exists():
            return {"records": {}, "last_updated": None}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_versions(self, batch_id: str, versions: dict[str, Any]) -> None:
        versions["last_updated"] = datetime.now().isoformat()
        with open(self._versions_path(batch_id), "w", encoding="utf-8") as f:
            json.dump(versions, f, ensure_ascii=False, indent=2)

    # ---------- 数据记录（幂等写入） ----------
    def load_records(self, batch_id: str) -> list[DataRecord]:
        path = self._batch_dir(batch_id) / "records.jsonl"
        if not path.exists():
            return []
        records = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(DataRecord.model_validate_json(line))
        return records

    def save_records(self, batch_id: str, records: list[DataRecord], version: str,
                     force_overwrite: bool = False) -> int:
        """幂等写入记录：相同 record_id 只保留相同版本；版本冲突时抛异常"""
        versions = self._load_versions(batch_id)
        records_meta: dict[str, Any] = versions.get("records", {})
        existing = {r.record_id: r for r in self.load_records(batch_id)}

        new_written = 0
        for rec in records:
            rid = rec.record_id
            if rid in existing:
                prev_version = records_meta.get(rid, {}).get("version")
                if prev_version == version:
                    continue
                if not force_overwrite:
                    raise DuplicateRecordError(
                        record_id=rid,
                        existing_version=prev_version or "unknown",
                        new_version=version,
                    )
            existing[rid] = rec
            records_meta[rid] = {
                "version": version,
                "content_hash": rec.content_hash,
                "saved_at": datetime.now().isoformat(),
            }
            new_written += 1

        self._write_jsonl(self._batch_dir(batch_id) / "records.jsonl", existing.values())
        versions["records"] = records_meta
        self._save_versions(batch_id, versions)
        return new_written

    def update_records_fields(self, batch_id: str, updates: dict[str, dict[str, Any]],
                              source_version: str, target_version: str,
                              force_overwrite: bool = False) -> int:
        """按 record_id 幂等更新部分字段（如 split_type）

        Args:
            batch_id: 批次号
            updates: {record_id: {field_name: new_value, ...}} 字典
            source_version: 期望当前版本（用于乐观锁校验）
            target_version: 更新后的新版本号
            force_overwrite: 是否跳过版本校验强制覆盖

        Returns:
            实际更新的记录条数
        """
        versions = self.load_record_versions(batch_id)
        records_meta: dict[str, Any] = versions.get("records", {})
        existing = {r.record_id: r for r in self.load_records(batch_id)}

        updated_count = 0
        for rid, fields in updates.items():
            if rid not in existing:
                continue
            rec = existing[rid]
            cur_version = records_meta.get(rid, {}).get("version")

            # 版本一致性检查（幂等保护）
            if cur_version == target_version:
                continue  # 已经是目标版本，幂等跳过
            if not force_overwrite and cur_version != source_version:
                raise DuplicateRecordError(
                    record_id=rid,
                    existing_version=cur_version or "unknown",
                    new_version=target_version,
                )

            # 应用字段更新
            for field_name, new_val in fields.items():
                if hasattr(rec, field_name):
                    setattr(rec, field_name, new_val)
                else:
                    rec.raw_content[field_name] = new_val

            records_meta[rid] = {
                "version": target_version,
                "content_hash": rec.content_hash,
                "saved_at": datetime.now().isoformat(),
                "updated_from": cur_version,
                "updated_fields": list(fields.keys()),
            }
            updated_count += 1

        if updated_count > 0:
            self._write_jsonl(self._batch_dir(batch_id) / "records.jsonl", existing.values())
            versions["records"] = records_meta
            self._save_versions(batch_id, versions)
        return updated_count

    @staticmethod
    def _write_jsonl(path: Path, records: Iterator[Any]) -> None:
        with open(path, "w", encoding="utf-8") as f:
            for rec in records:
                if hasattr(rec, "model_dump_json"):
                    f.write(rec.model_dump_json() + "\n")
                else:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # ---------- 去重结果 ----------
    def save_dedup_results(self, batch_id: str, results: list[DedupResult]) -> None:
        path = self._batch_dir(batch_id) / "dedup_results.json"
        payload = {
            "batch_id": batch_id,
            "generated_at": datetime.now().isoformat(),
            "total_groups": len(results),
            "total_duplicates_removed": sum(r.duplicate_count for r in results),
            "results": [r.model_dump() for r in results],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    def load_dedup_results(self, batch_id: str) -> Optional[dict[str, Any]]:
        path = self._batch_dir(batch_id) / "dedup_results.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ---------- 混洗结果 ----------
    def save_shuffle_result(self, batch_id: str, result: ShuffleResult) -> None:
        path = self._batch_dir(batch_id) / "shuffle_result.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result.model_dump(), f, ensure_ascii=False, indent=2)

    def load_shuffle_result(self, batch_id: str) -> Optional[ShuffleResult]:
        path = self._batch_dir(batch_id) / "shuffle_result.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return ShuffleResult.model_validate_json(f.read())

    # ---------- 复核记录 ----------
    def save_review(self, batch_id: str, review: ReviewRecord) -> None:
        path = self._batch_dir(batch_id) / "review.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(review.model_dump(), f, ensure_ascii=False, indent=2)

    def load_review(self, batch_id: str) -> Optional[ReviewRecord]:
        path = self._batch_dir(batch_id) / "review.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return ReviewRecord.model_validate_json(f.read())

    # ---------- 输入数据读取 ----------
    def read_input_files(self, input_dir: str | Path, hash_algorithm: str = "xxhash64") -> list[DataRecord]:
        in_dir = Path(input_dir)
        if not in_dir.exists():
            raise InputDataError(str(in_dir), "目录不存在")

        records: list[DataRecord] = []
        supported = {".csv": "csv", ".json": "json", ".jsonl": "jsonl", ".parquet": "parquet"}
        files = sorted(p for p in in_dir.iterdir() if p.is_file() and p.suffix.lower() in supported)

        for fp in files:
            fmt = supported[fp.suffix.lower()]
            try:
                rows = self._read_dataframe(fp, fmt)
            except Exception as exc:
                raise InputDataError(str(fp), f"读取失败: {exc}") from exc
            for idx, row in enumerate(rows):
                raw = {k: (None if pd.isna(v) else v) for k, v in row.items()}
                ch = compute_content_hash(raw, hash_algorithm)
                rid = raw.get("record_id") or raw.get("id") or generate_id("rec")
                split_val = str(raw.get("split_type") or raw.get("split") or "unassigned").lower()
                split_map = {"train": "train", "val": "val", "valid": "val", "validation": "val",
                             "test": "test"}
                rec = DataRecord(
                    record_id=str(rid),
                    content_hash=ch,
                    raw_content=raw,
                    split_type=split_map.get(split_val, "unassigned"),
                    user_id=None if not raw.get("user_id") else str(raw["user_id"]),
                    timestamp=None if not raw.get("timestamp") else float(raw["timestamp"]),
                    session_id=None if not raw.get("session_id") else str(raw["session_id"]),
                    source_file=str(fp.resolve()),
                    line_number=idx + 1,
                )
                records.append(rec)
        return records

    @staticmethod
    def _read_dataframe(fp: Path, fmt: str) -> list[dict]:
        if fmt == "csv":
            df = pd.read_csv(fp)
        elif fmt == "json":
            obj = pd.read_json(fp)
            if isinstance(obj, pd.DataFrame):
                df = obj
            else:
                df = pd.DataFrame([obj])
        elif fmt == "jsonl":
            df = pd.read_json(fp, lines=True)
        elif fmt == "parquet":
            df = pd.read_parquet(fp)
        else:
            raise ValueError(f"不支持的格式: {fmt}")
        return df.to_dict(orient="records")

    # ---------- 导出 ----------
    def export_path(self, batch_id: str, name: str, ext: str) -> Path:
        ext = ext.lstrip(".")
        return self.exports_dir / f"{batch_id}_{name}.{ext}"

    def copy_file(self, src: str | Path, dst: str | Path) -> None:
        shutil.copy2(src, dst)

    # ---------- 示例数据 ----------
    def save_sample_data(self, name: str, df: pd.DataFrame) -> Path:
        out = self.sample_dir / f"{name}.csv"
        df.to_csv(out, index=False, encoding="utf-8")
        return out

    def list_sample_files(self) -> list[Path]:
        return sorted(p for p in self.sample_dir.iterdir() if p.is_file())

"""存储管理器 - 负责输入输出目录管理和幂等执行机制"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Type, TypeVar

from pydantic import BaseModel

from .models import (
    AnomalyTrace,
    AuditLog,
    BatchInfo,
    DuplicateMigrationInfo,
    MigrationExecutionRecord,
    PaginationOrderConfig,
    ProcessingRecord,
    SchemaDiffResult,
    SchemaSnapshot,
    TableSchema,
)

T = TypeVar("T", bound=BaseModel)


class StorageManager:
    """
    存储管理器
    - 管理输入输出目录
    - 实现幂等执行：同一批材料重复跑，结果稳定不越跑越乱
    - 统一持久化所有数据模型
    """

    INPUT_SUBDIRS = ["migrations", "schemas", "snapshots", "rollbacks"]
    OUTPUT_SUBDIRS = ["records", "snapshots", "audit", "reports", "traces", "tmp"]

    def __init__(self, input_dir: str, output_dir: str, batch_id: Optional[str] = None):
        self.input_dir = Path(input_dir).resolve()
        self.output_dir = Path(output_dir).resolve()
        self.batch_id = batch_id or self._generate_batch_id()
        self.batch_output_dir = self.output_dir / "batches" / self.batch_id
        self._ensure_dirs()

    def _generate_batch_id(self) -> str:
        """基于输入目录路径+时间生成批次ID，保证可追溯"""
        dir_hash = hashlib.md5(str(self.input_dir).encode()).hexdigest()[:8]
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"batch_{ts}_{dir_hash}"

    def _ensure_dirs(self) -> None:
        """确保所有目录存在"""
        self.input_dir.mkdir(parents=True, exist_ok=True)
        for sub in self.INPUT_SUBDIRS:
            (self.input_dir / sub).mkdir(parents=True, exist_ok=True)
        for sub in self.OUTPUT_SUBDIRS:
            (self.output_dir / sub).mkdir(parents=True, exist_ok=True)
        self.batch_output_dir.mkdir(parents=True, exist_ok=True)
        for sub in ["records", "snapshots", "audit", "traces"]:
            (self.batch_output_dir / sub).mkdir(parents=True, exist_ok=True)

    def get_input_path(self, subdir: str, filename: str) -> Path:
        path = self.input_dir / subdir / filename
        return path

    def list_input_files(self, subdir: str, pattern: str = "*.json") -> List[Path]:
        d = self.input_dir / subdir
        if not d.exists():
            return []
        return sorted(d.glob(pattern))

    def _model_to_path(self, model: BaseModel, subdir: str, prefix: str,
                       key_field: str = "record_id") -> Path:
        key = getattr(model, key_field, None)
        if not key:
            key = hashlib.md5(model.model_dump_json().encode()).hexdigest()[:16]
        filename = f"{prefix}_{key}.json"
        return self.batch_output_dir / subdir / filename

    def _global_path(self, subdir: str, prefix: str, key: str) -> Path:
        filename = f"{prefix}_{key}.json"
        return self.output_dir / subdir / filename

    @staticmethod
    def _dump_json(model: BaseModel) -> str:
        return json.dumps(model.model_dump(mode="json"), indent=2, ensure_ascii=False, default=str)

    def save_model(self, model: T, subdir: str, prefix: str,
                   key_field: str = "record_id", global_store: bool = True) -> Path:
        """保存模型，同时存到批次目录和全局目录（幂等）"""
        batch_path = self._model_to_path(model, subdir, prefix, key_field)
        batch_path.parent.mkdir(parents=True, exist_ok=True)
        with open(batch_path, "w", encoding="utf-8") as f:
            f.write(self._dump_json(model))
        if global_store:
            key = getattr(model, key_field, batch_path.stem.replace(f"{prefix}_", ""))
            global_path = self._global_path(subdir, prefix, key)
            global_path.parent.mkdir(parents=True, exist_ok=True)
            with open(global_path, "w", encoding="utf-8") as f:
                f.write(self._dump_json(model))
        return batch_path

    def load_model(self, path: Path, model_cls: Type[T]) -> Optional[T]:
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return model_cls(**data)

    def load_models(self, subdir: str, prefix: str, model_cls: Type[T],
                    batch_only: bool = False) -> List[T]:
        """加载模型，优先批次内，再全局"""
        results: Dict[str, T] = {}
        search_dirs = [self.batch_output_dir / subdir]
        if not batch_only:
            search_dirs.append(self.output_dir / subdir)
        for d in search_dirs:
            if not d.exists():
                continue
            for p in sorted(d.glob(f"{prefix}_*.json")):
                m = self.load_model(p, model_cls)
                if m:
                    key = getattr(m, list(m.model_fields.keys())[0], p.stem)
                    results[str(key)] = m
        return list(results.values())

    # -------- ProcessingRecord --------
    def save_processing_record(self, record: ProcessingRecord) -> Path:
        return self.save_model(record, "records", "rec", key_field="record_id")

    def load_processing_records(self, batch_only: bool = False) -> List[ProcessingRecord]:
        return self.load_models("records", "rec", ProcessingRecord, batch_only=batch_only)

    def find_processing_record(self, **filters) -> Optional[ProcessingRecord]:
        for r in self.load_processing_records():
            match = all(getattr(r, k, None) == v for k, v in filters.items())
            if match:
                return r
        return None

    # -------- SchemaSnapshot --------
    def save_snapshot(self, snapshot: SchemaSnapshot) -> Path:
        return self.save_model(snapshot, "snapshots", "snp", key_field="snapshot_id")

    def load_snapshots(self, batch_only: bool = False) -> List[SchemaSnapshot]:
        return self.load_models("snapshots", "snp", SchemaSnapshot, batch_only=batch_only)

    def load_snapshot(self, snapshot_id: str) -> Optional[SchemaSnapshot]:
        p = self._global_path("snapshots", "snp", snapshot_id)
        if p.exists():
            return self.load_model(p, SchemaSnapshot)
        p = self.batch_output_dir / "snapshots" / f"snp_{snapshot_id}.json"
        if p.exists():
            return self.load_model(p, SchemaSnapshot)
        return None

    def get_snapshots_by_table(self, table_name: str) -> List[SchemaSnapshot]:
        snaps = [s for s in self.load_snapshots() if s.table_schema.table_name == table_name]
        return sorted(snaps, key=lambda s: s.snapshot_time)

    # -------- AuditLog --------
    def save_audit_log(self, log: AuditLog) -> Path:
        return self.save_model(log, "audit", "aud", key_field="log_id")

    def load_audit_logs(self, batch_only: bool = False) -> List[AuditLog]:
        logs = self.load_models("audit", "aud", AuditLog, batch_only=batch_only)
        return sorted(logs, key=lambda l: l.action_time)

    def get_audit_for_target(self, target_type: str, target_id: str) -> List[AuditLog]:
        return [l for l in self.load_audit_logs()
                if l.target_type == target_type and l.target_id == target_id]

    # -------- AnomalyTrace --------
    def save_anomaly_trace(self, trace: AnomalyTrace) -> Path:
        return self.save_model(trace, "traces", "anm", key_field="anomaly_id")

    def load_anomaly_traces(self, batch_only: bool = False) -> List[AnomalyTrace]:
        return self.load_models("traces", "anm", AnomalyTrace, batch_only=batch_only)

    def load_anomaly_trace(self, anomaly_id: str) -> Optional[AnomalyTrace]:
        p = self._global_path("traces", "anm", anomaly_id)
        if p.exists():
            return self.load_model(p, AnomalyTrace)
        return None

    # -------- BatchInfo --------
    def save_batch_info(self, batch: BatchInfo) -> Path:
        path = self.batch_output_dir / "batch_info.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(self._dump_json(batch))
        global_path = self.output_dir / "batches" / f"{batch.batch_id}.json"
        global_path.parent.mkdir(parents=True, exist_ok=True)
        with open(global_path, "w", encoding="utf-8") as f:
            f.write(self._dump_json(batch))
        return path

    def load_batch_info(self) -> Optional[BatchInfo]:
        path = self.batch_output_dir / "batch_info.json"
        if path.exists():
            return self.load_model(path, BatchInfo)
        return None

    def list_all_batches(self) -> List[BatchInfo]:
        batches_dir = self.output_dir / "batches"
        if not batches_dir.exists():
            return []
        result = []
        for p in sorted(batches_dir.glob("batch_*.json")):
            b = self.load_model(p, BatchInfo)
            if b:
                result.append(b)
        return sorted(result, key=lambda b: b.start_time, reverse=True)

    # -------- 幂等执行：检测输入指纹 --------
    def compute_input_fingerprint(self) -> str:
        """计算输入目录指纹，用于判断是否相同批次材料"""
        hasher = hashlib.sha256()
        for subdir in self.INPUT_SUBDIRS:
            d = self.input_dir / subdir
            if not d.exists():
                continue
            for fp in sorted(d.rglob("*")):
                if fp.is_file():
                    hasher.update(fp.relative_to(self.input_dir).as_posix().encode())
                    hasher.update(str(fp.stat().st_size).encode())
                    hasher.update(str(fp.stat().st_mtime_ns).encode())
        return hasher.hexdigest()[:16]

    def find_previous_batch_by_fingerprint(self) -> Optional[BatchInfo]:
        """查找是否有相同输入指纹的历史批次（用于幂等重跑）"""
        current_fp = self.compute_input_fingerprint()
        for b in self.list_all_batches():
            test_storage = StorageManager(self.input_dir, self.output_dir, b.batch_id)
            fp_path = test_storage.batch_output_dir / "input_fingerprint.txt"
            if fp_path.exists():
                old_fp = fp_path.read_text().strip()
                if old_fp == current_fp and b.batch_id != self.batch_id:
                    return b
        return None

    def mark_input_fingerprint(self) -> None:
        fp = self.compute_input_fingerprint()
        (self.batch_output_dir / "input_fingerprint.txt").write_text(fp)

    def prepare_rerun(self, source_batch_id: str) -> None:
        """幂等重跑：从历史批次复制已有稳定结论，避免越跑越乱"""
        src_dir = self.output_dir / "batches" / source_batch_id
        if not src_dir.exists():
            return
        for sub in ["records", "snapshots", "audit", "traces"]:
            src_sub = src_dir / sub
            dst_sub = self.batch_output_dir / sub
            if src_sub.exists():
                for fp in src_sub.glob("*.json"):
                    dst = dst_sub / fp.name
                    if not dst.exists():
                        shutil.copy2(fp, dst)

    # -------- 输入文件加载辅助 --------
    def load_input_table_schemas(self, source: str = "schemas") -> List[TableSchema]:
        schemas = []
        for fp in self.list_input_files(source):
            data = json.loads(fp.read_text(encoding="utf-8"))
            if isinstance(data, list):
                schemas.extend(TableSchema(**d) for d in data)
            else:
                schemas.append(TableSchema(**data))
        return schemas

    def load_input_migrations(self) -> List[MigrationExecutionRecord]:
        records = []
        for fp in self.list_input_files("migrations"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            if isinstance(data, list):
                records.extend(MigrationExecutionRecord(**d) for d in data)
            else:
                records.append(MigrationExecutionRecord(**data))
        return sorted(records, key=lambda r: (r.execution_time, r.execution_order))

    # -------- 导出 --------
    def export_batch_archive(self, dest_path: Optional[str] = None) -> Path:
        """导出整批归档"""
        dest = Path(dest_path) if dest_path else self.output_dir / f"{self.batch_id}_archive.zip"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.make_archive(str(dest.with_suffix("")), "zip",
                            root_dir=str(self.batch_output_dir.parent),
                            base_dir=self.batch_output_dir.name)
        return dest

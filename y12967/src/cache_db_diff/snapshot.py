"""表结构快照对比 - 新旧结论并排展示，共用处理记录"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .models import (
    ColumnType,
    DiffConclusion,
    IndexDefinition,
    ProcessingOpinion,
    ProcessingRecord,
    RecordStatus,
    RecordType,
    SchemaDiffItem,
    SchemaDiffResult,
    SchemaSnapshot,
    TableSchema,
)
from .storage import StorageManager


class SnapshotComparator:
    """
    表结构快照对比器
    - 支持 cache vs db 对比（供审计组、后端负责人共用）
    - 支持 旧快照 vs 新快照 并排对比（表结构被改过以后看影响范围）
    - 生成统一的 ProcessingRecord，回滚记录和 schema 对比共用
    """

    def __init__(self, storage: StorageManager):
        self.storage = storage

    # ---------- 列对比 ----------
    def _compare_columns(self, cache_cols: List[ColumnType],
                         db_cols: List[ColumnType]) -> List[SchemaDiffItem]:
        diffs: List[SchemaDiffItem] = []
        cache_map = {c.name: c for c in cache_cols}
        db_map = {c.name: c for c in db_cols}

        all_names = sorted(set(cache_map.keys()) | set(db_map.keys()))

        for name in all_names:
            c_col = cache_map.get(name)
            d_col = db_map.get(name)

            if c_col is None and d_col is not None:
                diffs.append(SchemaDiffItem(
                    diff_type=DiffConclusion.COLUMN_EXTRA,
                    column_name=name,
                    db_value=d_col.model_dump(),
                    description=f"DB 存在列 '{name}'，但缓存中缺失",
                ))
                continue

            if d_col is None and c_col is not None:
                diffs.append(SchemaDiffItem(
                    diff_type=DiffConclusion.COLUMN_MISSING,
                    column_name=name,
                    cache_value=c_col.model_dump(),
                    description=f"缓存存在列 '{name}'，但 DB 中缺失",
                ))
                continue

            for field in ["data_type", "is_nullable", "default", "comment", "extra"]:
                cv = getattr(c_col, field)
                dv = getattr(d_col, field)
                if cv != dv:
                    diffs.append(SchemaDiffItem(
                        diff_type=DiffConclusion.TYPE_MISMATCH,
                        column_name=name,
                        field=field,
                        cache_value=cv,
                        db_value=dv,
                        description=f"列 '{name}' 的 {field} 不一致: cache={cv} vs db={dv}",
                    ))
        return diffs

    # ---------- 索引对比 ----------
    def _compare_indexes(self, cache_idx: List[IndexDefinition],
                         db_idx: List[IndexDefinition]) -> List[SchemaDiffItem]:
        diffs: List[SchemaDiffItem] = []
        cache_map = {i.name: i for i in cache_idx}
        db_map = {i.name: i for i in db_idx}
        all_names = sorted(set(cache_map.keys()) | set(db_map.keys()))

        for name in all_names:
            ci = cache_map.get(name)
            di = db_map.get(name)
            if ci is None:
                diffs.append(SchemaDiffItem(
                    diff_type=DiffConclusion.INDEX_MISMATCH,
                    column_name=name,
                    db_value=di.model_dump() if di else None,
                    description=f"索引 '{name}' 仅存在于 DB",
                ))
            elif di is None:
                diffs.append(SchemaDiffItem(
                    diff_type=DiffConclusion.INDEX_MISMATCH,
                    column_name=name,
                    cache_value=ci.model_dump(),
                    description=f"索引 '{name}' 仅存在于缓存",
                ))
            else:
                for field in ["columns", "is_unique", "index_type"]:
                    cv = getattr(ci, field)
                    dv = getattr(di, field)
                    if cv != dv:
                        diffs.append(SchemaDiffItem(
                            diff_type=DiffConclusion.INDEX_MISMATCH,
                            column_name=name,
                            field=field,
                            cache_value=cv,
                            db_value=dv,
                            description=f"索引 '{name}' 的 {field} 不一致",
                        ))
        return diffs

    # ---------- 主键对比 ----------
    def _compare_primary_key(self, cache_pk: List[str],
                             db_pk: List[str]) -> List[SchemaDiffItem]:
        if cache_pk == db_pk:
            return []
        return [SchemaDiffItem(
            diff_type=DiffConclusion.PK_MISMATCH,
            cache_value=cache_pk,
            db_value=db_pk,
            description=f"主键不一致: cache={cache_pk} vs db={db_pk}",
        )]

    # ---------- 主对比入口 ----------
    def compare_schemas(self, cache_schema: TableSchema,
                        db_schema: TableSchema,
                        cache_snapshot_id: str = "",
                        db_snapshot_id: str = "") -> SchemaDiffResult:
        """对比两个表结构，返回对比结果"""
        all_diffs: List[SchemaDiffItem] = []
        all_diffs.extend(self._compare_columns(cache_schema.columns, db_schema.columns))
        all_diffs.extend(self._compare_indexes(cache_schema.indexes, db_schema.indexes))
        all_diffs.extend(self._compare_primary_key(cache_schema.primary_key, db_schema.primary_key))

        if not all_diffs:
            conclusion = DiffConclusion.MATCH
        else:
            diff_types = set(d.diff_type for d in all_diffs)
            conclusion = (list(diff_types)[0] if len(diff_types) == 1
                          else DiffConclusion.MULTIPLE_DIFFS)

        return SchemaDiffResult(
            cache_snapshot_id=cache_snapshot_id,
            db_snapshot_id=db_snapshot_id,
            table_name=cache_schema.table_name or db_schema.table_name,
            conclusion=conclusion,
            diffs=all_diffs,
        )

    # ---------- 并排对比（旧结论 vs 新结论） ----------
    def side_by_side_compare(self, table_name: str,
                             old_snapshot_id: Optional[str] = None,
                             new_snapshot_id: Optional[str] = None) -> Dict[str, Any]:
        """
        表结构被改过以后，旧结论和新结论并排看
        返回并排对比的结构化数据，供报告生成使用
        """
        snaps = self.storage.get_snapshots_by_table(table_name)
        if len(snaps) < 2 and not (old_snapshot_id and new_snapshot_id):
            return {"table_name": table_name, "error": "快照数量不足，无法并排对比"}

        if old_snapshot_id:
            old_snap = self.storage.load_snapshot(old_snapshot_id)
        else:
            old_snap = snaps[0] if snaps else None

        if new_snapshot_id:
            new_snap = self.storage.load_snapshot(new_snapshot_id)
        else:
            new_snap = snaps[-1] if snaps else None

        if not old_snap or not new_snap:
            return {"table_name": table_name, "error": "找不到指定的快照"}

        diff = self.compare_schemas(
            old_snap.table_schema, new_snap.table_schema,
            cache_snapshot_id=old_snap.snapshot_id,
            db_snapshot_id=new_snap.snapshot_id,
        )

        return {
            "table_name": table_name,
            "old_snapshot": {
                "id": old_snap.snapshot_id,
                "time": old_snap.snapshot_time.isoformat(),
                "source": old_snap.source,
                "operator": old_snap.operator,
            },
            "new_snapshot": {
                "id": new_snap.snapshot_id,
                "time": new_snap.snapshot_time.isoformat(),
                "source": new_snap.source,
                "operator": new_snap.operator,
            },
            "columns_side_by_side": self._build_columns_sbs(
                old_snap.table_schema, new_snap.table_schema),
            "indexes_side_by_side": self._build_indexes_sbs(
                old_snap.table_schema, new_snap.table_schema),
            "primary_key": {
                "old": old_snap.table_schema.primary_key,
                "new": new_snap.table_schema.primary_key,
            },
            "diff_result": diff,
        }

    def _build_columns_sbs(self, old: TableSchema, new: TableSchema) -> List[Dict[str, Any]]:
        old_map = {c.name: c for c in old.columns}
        new_map = {c.name: c for c in new.columns}
        rows = []
        for name in sorted(set(old_map) | set(new_map)):
            oc = old_map.get(name)
            nc = new_map.get(name)
            rows.append({
                "column_name": name,
                "old": oc.model_dump() if oc else None,
                "new": nc.model_dump() if nc else None,
                "changed": (oc is None) != (nc is None) or (
                    oc and nc and (
                        oc.data_type != nc.data_type
                        or oc.is_nullable != nc.is_nullable
                        or oc.default != nc.default
                    )
                ),
            })
        return rows

    def _build_indexes_sbs(self, old: TableSchema, new: TableSchema) -> List[Dict[str, Any]]:
        old_map = {i.name: i for i in old.indexes}
        new_map = {i.name: i for i in new.indexes}
        rows = []
        for name in sorted(set(old_map) | set(new_map)):
            oi = old_map.get(name)
            ni = new_map.get(name)
            rows.append({
                "index_name": name,
                "old": oi.model_dump() if oi else None,
                "new": ni.model_dump() if ni else None,
                "changed": (oi is None) != (ni is None) or (
                    oi and ni and (
                        oi.columns != ni.columns
                        or oi.is_unique != ni.is_unique
                    )
                ),
            })
        return rows

    # ---------- 创建共用处理记录 ----------
    def create_schema_diff_record(self, diff: SchemaDiffResult,
                                  rollback_context: Optional[Dict[str, Any]] = None,
                                  creator: str = "system") -> ProcessingRecord:
        """
        创建 schema 对比的处理记录（与回滚记录共用同一套 ProcessingRecord 体系）
        rollback_context: 如果是回滚场景，附带回滚上下文
        """
        record_type = RecordType.ROLLBACK if rollback_context else RecordType.SCHEMA_DIFF

        existing = self.storage.find_processing_record(
            batch_id=self.storage.batch_id,
            record_type=record_type,
            table_name=diff.table_name,
        )
        if existing:
            return existing

        rec = ProcessingRecord(
            batch_id=self.storage.batch_id,
            record_type=record_type,
            status=RecordStatus.PENDING if diff.has_diff() else RecordStatus.RESOLVED,
            table_name=diff.table_name,
            schema_diff=diff,
            snapshot_refs=[s for s in [diff.cache_snapshot_id, diff.db_snapshot_id] if s],
            creator=creator,
        )
        self.storage.save_processing_record(rec)
        return rec

    # ---------- 批量处理 ----------
    def run_comparison(self, creator: str = "system") -> List[ProcessingRecord]:
        """
        执行 cache vs db 的批量对比
        从输入目录的 schemas/cache 和 schemas/db 子目录加载
        """
        cache_schemas = self.storage.load_input_table_schemas("schemas/cache")
        db_schemas = self.storage.load_input_table_schemas("schemas/db")

        cache_map = {s.table_name: s for s in cache_schemas}
        db_map = {s.table_name: s for s in db_schemas}

        records = []
        all_tables = sorted(set(cache_map) | set(db_map))

        for table in all_tables:
            cs = cache_map.get(table, TableSchema(table_name=table))
            ds = db_map.get(table, TableSchema(table_name=table))

            cache_snap = SchemaSnapshot(
                batch_id=self.storage.batch_id,
                table_schema=cs,
                source="cache_input",
                operator=creator,
            )
            db_snap = SchemaSnapshot(
                batch_id=self.storage.batch_id,
                table_schema=ds,
                source="db_input",
                operator=creator,
            )
            self.storage.save_snapshot(cache_snap)
            self.storage.save_snapshot(db_snap)

            diff = self.compare_schemas(cs, ds, cache_snap.snapshot_id, db_snap.snapshot_id)
            rec = self.create_schema_diff_record(diff, creator=creator)
            records.append(rec)

        return records

    # ---------- 处理意见 ----------
    def add_opinion(self, record_id: str, handler: str,
                    opinion: str, suggestion: str = None,
                    mark_resolved: bool = False) -> ProcessingRecord:
        rec = self.storage.find_processing_record(record_id=record_id)
        if not rec:
            raise ValueError(f"Record not found: {record_id}")
        rec.opinions.append(ProcessingOpinion(
            handler=handler, opinion=opinion, suggestion=suggestion))
        if mark_resolved:
            rec.status = RecordStatus.RESOLVED
        self.storage.save_processing_record(rec)
        return rec

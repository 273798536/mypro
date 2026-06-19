import csv
import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from difflib import SequenceMatcher

from .storage import (
    DataStore, SampleRecord, ManualJudgment, _now_ts, _sha256
)


def _read_csv(path: str) -> Tuple[List[str], List[Dict[str, str]]]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        rows = list(reader)
    return headers, rows


def _detect_id_column(headers: List[str]) -> Optional[str]:
    candidates = ["sample_id", "样本ID", "样本编号", "id", "ID", "sid", "uuid"]
    lower_map = {h.lower().strip(): h for h in headers}
    for c in candidates:
        if c.lower() in lower_map:
            return lower_map[c.lower()]
    for h in headers:
        if "id" in h.lower() or "编号" in h or "样本" in h:
            return h
    return None


def _detect_label_column(headers: List[str]) -> Optional[str]:
    candidates = ["label", "标签", "模型标签", "model_label", "prediction", "预测", "模型预测"]
    lower_map = {h.lower().strip(): h for h in headers}
    for c in candidates:
        if c.lower() in lower_map:
            return lower_map[c.lower()]
    return None


class SampleImporter:
    def __init__(self, store: DataStore):
        self.store = store

    def import_csv(self, csv_path: str,
                   id_column: Optional[str] = None,
                   label_column: Optional[str] = None,
                   batch_note: str = "") -> Dict[str, Any]:
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"样本表不存在: {csv_path}")

        headers, rows = _read_csv(csv_path)
        if not rows:
            raise ValueError("样本表为空")

        id_col = id_column or _detect_id_column(headers)
        if not id_col:
            raise ValueError(f"无法识别样本ID列，请手动指定。可用列: {headers}")
        label_col = label_column or _detect_label_column(headers)

        batch_id = _now_ts()
        archived = self.store.archive_sample_source(csv_path, batch_id)

        src_hash = _sha256(open(csv_path, "rb").read())

        records: List[SampleRecord] = []
        seen_ids = set()
        dup_ids = []
        missing_ids = []

        for i, row in enumerate(rows, start=2):
            sid = str(row.get(id_col, "")).strip()
            if not sid:
                missing_ids.append(i)
                continue
            if sid in seen_ids:
                dup_ids.append((i, sid))
                continue
            seen_ids.add(sid)
            row_snapshot = {k: (v if v is not None else "") for k, v in row.items()}
            rec = SampleRecord(
                sample_id=sid,
                content=row_snapshot,
                source_file=archived,
                source_hash=src_hash,
                source_row=i,
                imported_at=_now_ts(),
                import_batch_id=batch_id
            )
            records.append(rec)

        self.store.import_samples(records)

        old_idx = {s.sample_id: s for s in [
            self.store.get_sample_latest(s.sample_id)
            for s in records
        ] if s and len(self.store.get_sample_history(s.sample_id)) > 1}

        changed = []
        for rec in records:
            hist = self.store.get_sample_history(rec.sample_id)
            if len(hist) >= 2:
                prev = hist[-2]
                curr = hist[-1]
                diffs = _diff_sample_content(prev.content, curr.content)
                if diffs:
                    changed.append({
                        "sample_id": rec.sample_id,
                        "fields": diffs
                    })

        run_id = self.store.record_run(
            run_type="import_samples",
            params={
                "csv_path": os.path.abspath(csv_path),
                "archived_path": archived,
                "source_hash": src_hash,
                "id_column": id_col,
                "label_column": label_col,
                "batch_note": batch_note,
                "total_rows": len(rows),
                "headers": headers
            },
            success=True,
            message=f"导入成功: {len(records)}条样本",
            artifacts={
                "archived_source": archived,
                "source_hash": src_hash
            }
        )

        return {
            "batch_id": batch_id,
            "run_id": run_id,
            "imported_count": len(records),
            "total_rows": len(rows),
            "missing_id_rows": missing_ids,
            "duplicate_ids": dup_ids,
            "changed_samples": changed,
            "id_column": id_col,
            "label_column": label_col,
            "archived_source": archived,
            "source_hash": src_hash,
            "headers": headers
        }


def _diff_sample_content(a: Dict, b: Dict) -> Dict[str, Dict]:
    all_keys = set(a.keys()) | set(b.keys())
    diffs = {}
    for k in sorted(all_keys):
        va = str(a.get(k, ""))
        vb = str(b.get(k, ""))
        if va != vb:
            diffs[k] = {"before": va, "after": vb}
    return diffs


class JudgmentSubmitter:
    def __init__(self, store: DataStore):
        self.store = store

    def submit(self,
               sample_id: str,
               manual_label: str,
               operator: str,
               model_version: str = "unknown",
               original_model_label: str = "",
               note: str = "",
               override_reason: str = "",
               require_sample_exists: bool = True,
               sample_csv_path: Optional[str] = None) -> Dict[str, Any]:

        errors = []
        warnings = []
        ref_trace = []

        sample = self.store.get_sample_latest(sample_id)
        sample_hist = self.store.get_sample_history(sample_id)

        if sample is None:
            msg = f"样本ID在系统中不存在: {sample_id}"
            if require_sample_exists:
                errors.append(msg)
            else:
                warnings.append(msg + "（继续记录，但引用将标记为缺失）")
            self.store.log_missing_reference(sample_id, "pending", msg)
        else:
            ref_trace.append({
                "type": "sample_exists",
                "sample_id": sample_id,
                "import_batch": sample.import_batch_id,
                "imported_at": sample.imported_at,
                "source_file": sample.source_file,
                "source_row": sample.source_row,
                "source_hash": sample.source_hash
            })
            if not original_model_label:
                for k, v in sample.content.items():
                    kl = k.lower()
                    if "label" in kl or "标签" in k or "模型" in k or "预测" in k:
                        original_model_label = str(v)
                        ref_trace.append({
                            "type": "label_inferred_from_sample",
                            "column": k,
                            "value": original_model_label
                        })
                        break
            if len(sample_hist) >= 2:
                prev = sample_hist[-2]
                diffs = _diff_sample_content(prev.content, sample.content)
                if diffs:
                    warnings.append(f"样本 {sample_id} 自上次导入后口径有变更")
                    ref_trace.append({
                        "type": "sample_content_changed",
                        "changes": diffs,
                        "previous_batch": prev.import_batch_id,
                        "previous_imported_at": prev.imported_at
                    })

        prev_judgments = self.store.get_judgments_for_sample(sample_id)
        prev_active = [j for j in prev_judgments if not j.is_overridden]
        if prev_active:
            pj = prev_active[-1]
            ref_trace.append({
                "type": "previous_active_judgment",
                "judgment_id": pj.judgment_id,
                "manual_label": pj.manual_label,
                "operator": pj.operator,
                "created_at": pj.created_at,
                "note": pj.note,
                "model_version": pj.model_version
            })
            if pj.manual_label == manual_label and pj.model_version == model_version:
                warnings.append(f"与上次激活的人工改判标签相同（{manual_label}），模型版本一致，仍将记录为新版本")

        if errors:
            run_id = self.store.record_run(
                run_type="submit_judgment",
                params=locals(),
                success=False,
                message="; ".join(errors)
            )
            return {
                "success": False,
                "run_id": run_id,
                "errors": errors,
                "warnings": warnings,
                "ref_trace": ref_trace
            }

        judgment_id = f"J{_now_ts()}"
        batch_id = _now_ts()
        j = ManualJudgment(
            judgment_id=judgment_id,
            sample_id=sample_id,
            model_version=model_version,
            original_model_label=original_model_label,
            manual_label=manual_label,
            operator=operator,
            note=note,
            created_at=_now_ts(),
            batch_id=batch_id,
            override_reason=override_reason or None
        )
        saved = self.store.add_judgment(j)

        run_id = self.store.record_run(
            run_type="submit_judgment",
            params={
                "sample_id": sample_id,
                "manual_label": manual_label,
                "operator": operator,
                "model_version": model_version,
                "original_model_label": original_model_label,
                "note": note,
                "override_reason": override_reason,
                "sample_csv_path": sample_csv_path
            },
            success=True,
            message=f"改判提交成功: {judgment_id}",
            artifacts={
                "judgment_id": judgment_id,
                "batch_id": batch_id
            }
        )

        return {
            "success": True,
            "run_id": run_id,
            "judgment_id": saved.judgment_id,
            "batch_id": saved.batch_id,
            "errors": errors,
            "warnings": warnings,
            "ref_trace": ref_trace,
            "overrode_previous": len(prev_active) > 0
        }

    def submit_batch(self,
                     judgments_csv_path: str,
                     operator: str,
                     model_version: str = "unknown",
                     sample_id_column: Optional[str] = None,
                     manual_label_column: Optional[str] = None,
                     note_column: Optional[str] = None,
                     require_sample_exists: bool = True,
                     sample_csv_path: Optional[str] = None) -> Dict[str, Any]:
        if not os.path.exists(judgments_csv_path):
            raise FileNotFoundError(f"改判表不存在: {judgments_csv_path}")

        headers, rows = _read_csv(judgments_csv_path)
        if not rows:
            raise ValueError("改判表为空")

        sid_col = sample_id_column or _detect_id_column(headers)
        if not sid_col:
            raise ValueError(f"无法识别样本ID列。可用列: {headers}")
        label_col = manual_label_column
        if not label_col:
            for h in headers:
                hl = h.lower()
                if "manual" in hl and ("label" in hl or "改判" in h):
                    label_col = h
                    break
            if not label_col:
                for h in headers:
                    if "改判" in h or "人工标签" in h or "人工" in h:
                        label_col = h
                        break
        if not label_col:
            raise ValueError(f"无法识别人工改判标签列。可用列: {headers}")
        note_col = note_column
        if not note_col:
            for h in headers:
                if "note" in h.lower() or "备注" in h or "说明" in h or "口头说明" in h:
                    note_col = h
                    break

        results = []
        batch_run_id = None
        for i, row in enumerate(rows, start=2):
            sid = str(row.get(sid_col, "")).strip()
            ml = str(row.get(label_col, "")).strip()
            nt = str(row.get(note_col, "") if note_col else "").strip()
            if not sid:
                results.append({"row": i, "success": False,
                                "errors": [f"第{i}行缺少样本ID"]})
                continue
            if not ml:
                results.append({"row": i, "success": False,
                                "sample_id": sid,
                                "errors": [f"第{i}行缺少人工标签"]})
                continue
            r = self.submit(
                sample_id=sid,
                manual_label=ml,
                operator=operator,
                model_version=model_version,
                note=nt,
                require_sample_exists=require_sample_exists,
                sample_csv_path=sample_csv_path
            )
            r["row"] = i
            r["source_row_content"] = row
            results.append(r)

        ok_count = sum(1 for r in results if r.get("success"))
        fail_count = len(results) - ok_count

        batch_run_id = self.store.record_run(
            run_type="submit_judgment_batch",
            params={
                "judgments_csv_path": os.path.abspath(judgments_csv_path),
                "operator": operator,
                "model_version": model_version,
                "id_column": sid_col,
                "label_column": label_col,
                "note_column": note_col,
                "total": len(rows),
                "success": ok_count,
                "failed": fail_count
            },
            success=fail_count == 0,
            message=f"批量提交完成: 成功{ok_count}, 失败{fail_count}"
        )

        return {
            "run_id": batch_run_id,
            "total": len(results),
            "success": ok_count,
            "failed": fail_count,
            "results": results,
            "id_column": sid_col,
            "label_column": label_col,
            "note_column": note_col
        }


class JudgmentComparer:
    def __init__(self, store: DataStore):
        self.store = store

    def compare_batches(self, batch_a_id: str, batch_b_id: str) -> Dict[str, Any]:
        a = self.store.get_judgments_by_batch(batch_a_id)
        b = self.store.get_judgments_by_batch(batch_b_id)
        if not a:
            raise ValueError(f"批次不存在或无改判记录: {batch_a_id}")
        if not b:
            raise ValueError(f"批次不存在或无改判记录: {batch_b_id}")

        a_map = {j.sample_id: j for j in a}
        b_map = {j.sample_id: j for j in b}

        all_sids = sorted(set(a_map.keys()) | set(b_map.keys()))
        diffs = []
        only_a = []
        only_b = []
        same = []

        for sid in all_sids:
            ja = a_map.get(sid)
            jb = b_map.get(sid)
            if ja and not jb:
                only_a.append({"sample_id": sid, "judgment": ja.to_dict()})
                continue
            if jb and not ja:
                only_b.append({"sample_id": sid, "judgment": jb.to_dict()})
                continue
            fd = {}
            ad = ja.to_dict()
            bd = jb.to_dict()
            for k in set(ad.keys()) | set(bd.keys()):
                if ad.get(k) != bd.get(k):
                    fd[k] = {"batch_a": ad.get(k), "batch_b": bd.get(k)}
            if fd:
                diffs.append({"sample_id": sid, "field_diffs": fd})
            else:
                same.append(sid)

        sample_changes = []
        for sid in all_sids:
            hist = self.store.get_sample_history(sid)
            batch_ids_in_hist = [s.import_batch_id for s in hist]
            relevant = []
            times_a = None
            times_b = None
            for s in hist:
                if s.import_batch_id == batch_a_id or times_a is None:
                    if times_a is None:
                        times_a = s.imported_at
                if s.import_batch_id == batch_b_id or times_b is None:
                    if times_b is None:
                        times_b = s.imported_at
            if len(hist) >= 2:
                for i in range(1, len(hist)):
                    diff = _diff_sample_content(hist[i-1].content, hist[i].content)
                    if diff:
                        relevant.append({
                            "from_batch": hist[i-1].import_batch_id,
                            "to_batch": hist[i].import_batch_id,
                            "changes": diff
                        })
            if relevant:
                sample_changes.append({"sample_id": sid, "changes": relevant})

        run_id = self.store.record_run(
            run_type="compare_batches",
            params={"batch_a": batch_a_id, "batch_b": batch_b_id},
            success=True,
            message=f"对比完成: 差异{diffs_count(diffs)}, 仅A{len(only_a)}, 仅B{len(only_b)}, 一致{len(same)}"
        )

        return {
            "run_id": run_id,
            "batch_a": batch_a_id,
            "batch_b": batch_b_id,
            "same_count": len(same),
            "diff_count": diffs_count(diffs),
            "only_in_a_count": len(only_a),
            "only_in_b_count": len(only_b),
            "same_sample_ids": same,
            "different": diffs,
            "only_in_a": only_a,
            "only_in_b": only_b,
            "sample_content_changes_between": sample_changes
        }


def diffs_count(l): return len(l)


class CsvExporter:
    def __init__(self, store: DataStore):
        self.store = store

    def export_latest(self, output_path: str,
                      include_history: bool = False,
                      include_ref_trace: bool = True,
                      filter_model_version: Optional[str] = None,
                      filter_operator: Optional[str] = None) -> Dict[str, Any]:
        judgments: List[ManualJudgment]
        if include_history:
            judgments = self.store.list_all_judgments()
        else:
            judgments = self.store.list_active_judgments()

        if filter_model_version:
            judgments = [j for j in judgments if j.model_version == filter_model_version]
        if filter_operator:
            judgments = [j for j in judgments if j.operator == filter_operator]

        judgments.sort(key=lambda j: (j.sample_id, j.created_at))

        rows = []
        missing_refs = []

        for j in judgments:
            sample = self.store.get_sample_latest(j.sample_id)
            sample_hist = self.store.get_sample_history(j.sample_id)
            prev_js = self.store.get_judgments_for_sample(j.sample_id)

            row = {
                "样本ID": j.sample_id,
                "改判ID": j.judgment_id,
                "改判批次": j.batch_id,
                "提交时间": j.created_at,
                "操作人": j.operator,
                "模型版本": j.model_version,
                "模型原标签": j.original_model_label,
                "人工改判标签": j.manual_label,
                "备注/口头说明": j.note,
                "状态": ("已覆盖" if j.is_overridden else "当前有效"),
                "被哪次覆盖": (j.overridden_by or ""),
                "覆盖原因": (j.override_reason or ""),
                "覆盖时间": (j.overridden_at or "")
            }

            if sample is None:
                row["样本表是否存在"] = "否"
                row["样本表原始来源文件"] = "【引用缺失】"
                row["样本表原始行号"] = ""
                row["样本表原始摘要"] = "【引用缺失：请追查导入记录】"
                row["样本口径变更次数"] = ""
                row["样本口径最后变更字段"] = ""
                missing_refs.append({
                    "sample_id": j.sample_id,
                    "judgment_id": j.judgment_id
                })
            else:
                row["样本表是否存在"] = "是"
                row["样本表原始来源文件"] = sample.source_file
                row["样本表原始行号"] = sample.source_row
                row["样本表导入批次"] = sample.import_batch_id
                row["样本表导入时间"] = sample.imported_at
                row["样本表源文件哈希"] = sample.source_hash
                summary_items = []
                for k, v in sample.content.items():
                    if len(str(v)) <= 60:
                        summary_items.append(f"{k}={v}")
                    else:
                        summary_items.append(f"{k}={str(v)[:57]}...")
                row["样本表原始摘要"] = " | ".join(summary_items[:12])
                if include_ref_trace:
                    all_snapshots = []
                    for s in sample_hist:
                        snap_items = [f"{k}={v}" for k, v in list(s.content.items())[:6]]
                        all_snapshots.append(
                            f"[{s.import_batch_id[:10]}...]" + "|".join(snap_items))
                    row["样本表历史快照摘要"] = " || ".join(all_snapshots)
                    if len(sample_hist) >= 2:
                        last_change = {}
                        for i in range(1, len(sample_hist)):
                            d = _diff_sample_content(sample_hist[i-1].content,
                                                     sample_hist[i].content)
                            if d:
                                last_change = d
                        row["样本口径变更次数"] = str(sum(
                            1 for i in range(1, len(sample_hist))
                            if _diff_sample_content(sample_hist[i-1].content,
                                                    sample_hist[i].content)
                        ))
                        row["样本口径最后变更字段"] = _format_change(last_change)
                    else:
                        row["样本口径变更次数"] = "0"
                        row["样本口径最后变更字段"] = ""

            if include_history:
                jhist_strs = []
                for pj in prev_js:
                    tag = "[当前]" if not pj.is_overridden else "[已覆盖]"
                    jhist_strs.append(
                        f"{tag} {pj.created_at} {pj.operator} "
                        f"{pj.model_version}:{pj.manual_label} ({pj.judgment_id})"
                    )
                row["该样本人工改判历史链"] = " || ".join(jhist_strs)

            rows.append(row)

        if not rows:
            raise ValueError("没有符合条件的改判记录可导出")

        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

        run_id = self.store.record_run(
            run_type="export_csv",
            params={
                "output_path": os.path.abspath(output_path),
                "include_history": include_history,
                "include_ref_trace": include_ref_trace,
                "filter_model_version": filter_model_version,
                "filter_operator": filter_operator,
                "total_rows": len(rows)
            },
            success=True,
            message=f"导出CSV成功: {len(rows)}行",
            artifacts={"output_csv": os.path.abspath(output_path)}
        )

        return {
            "run_id": run_id,
            "output_path": os.path.abspath(output_path),
            "total_rows": len(rows),
            "missing_references": missing_refs,
            "columns": list(rows[0].keys())
        }

    def export_compare(self, compare_result: Dict[str, Any],
                        output_path: str) -> Dict[str, Any]:
        rows = []
        for d in compare_result.get("different", []):
            sid = d["sample_id"]
            fd = d["field_diffs"]
            sample = self.store.get_sample_latest(sid)
            row = {
                "差异类型": "字段差异",
                "样本ID": sid,
                "样本表来源": (sample.source_file if sample else "缺失"),
                "样本摘要": (
                    " | ".join([f"{k}={v}" for k, v in list(sample.content.items())[:8]])
                    if sample else "【引用缺失】"
                )
            }
            for k, vv in fd.items():
                row[f"A:{k}"] = vv.get("batch_a", "")
                row[f"B:{k}"] = vv.get("batch_b", "")
            rows.append(row)

        for o in compare_result.get("only_in_a", []):
            rows.append({
                "差异类型": f"仅批次A有 ({compare_result['batch_a']})",
                "样本ID": o["sample_id"],
                "A:manual_label": o["judgment"].get("manual_label", ""),
                "A:operator": o["judgment"].get("operator", ""),
                "A:created_at": o["judgment"].get("created_at", "")
            })
        for o in compare_result.get("only_in_b", []):
            rows.append({
                "差异类型": f"仅批次B有 ({compare_result['batch_b']})",
                "样本ID": o["sample_id"],
                "B:manual_label": o["judgment"].get("manual_label", ""),
                "B:operator": o["judgment"].get("operator", ""),
                "B:created_at": o["judgment"].get("created_at", "")
            })
        for sid in compare_result.get("same_sample_ids", []):
            sample = self.store.get_sample_latest(sid)
            rows.append({
                "差异类型": "一致",
                "样本ID": sid,
                "样本表来源": (sample.source_file if sample else "缺失")
            })
        for sc in compare_result.get("sample_content_changes_between", []):
            for ch in sc["changes"]:
                rows.append({
                    "差异类型": "[样本口径变更] "
                               f"{ch['from_batch'][:8]}..{ch['to_batch'][:8]}",
                    "样本ID": sc["sample_id"],
                    "变更字段": _format_change(ch["changes"])
                })

        if not rows:
            raise ValueError("对比结果为空")

        fieldnames = sorted(set().union(*[r.keys() for r in rows]),
                            key=lambda x: (0 if x in ("差异类型", "样本ID",
                                                       "样本表来源", "样本摘要")
                                           else 1, x))
        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        run_id = self.store.record_run(
            run_type="export_compare_csv",
            params={"output_path": os.path.abspath(output_path),
                    "batch_a": compare_result["batch_a"],
                    "batch_b": compare_result["batch_b"],
                    "rows": len(rows)},
            success=True,
            message=f"对比CSV导出: {len(rows)}行",
            artifacts={"output_csv": os.path.abspath(output_path)}
        )
        return {
            "run_id": run_id,
            "output_path": os.path.abspath(output_path),
            "rows": len(rows)
        }

    def export_sample_audit_trail(self, sample_id: str,
                                   output_path: str) -> Dict[str, Any]:
        sample_hist = self.store.get_sample_history(sample_id)
        j_hist = self.store.get_judgments_for_sample(sample_id)

        if not sample_hist and not j_hist:
            raise ValueError(f"样本无记录: {sample_id}")

        rows = []

        for s in sample_hist:
            rows.append({
                "事件类型": "样本导入",
                "时间": s.imported_at,
                "批次ID": s.import_batch_id,
                "来源文件": s.source_file,
                "源文件哈希": s.source_hash,
                "行号": s.source_row,
                "标签/核心字段": _extract_labels(s.content),
                "内容快照": " | ".join(
                    [f"{k}={v}" for k, v in list(s.content.items())[:15]]),
                "本次相对上次变更": "",
                "操作人": "",
                "人工标签": "",
                "备注": ""
            })
        for i in range(1, len(sample_hist)):
            d = _diff_sample_content(sample_hist[i-1].content,
                                     sample_hist[i].content)
            if d:
                rows.append({
                    "事件类型": "【口径变更】",
                    "时间": sample_hist[i].imported_at,
                    "批次ID": sample_hist[i].import_batch_id,
                    "来源文件": sample_hist[i].source_file,
                    "源文件哈希": sample_hist[i].source_hash,
                    "行号": "",
                    "标签/核心字段": "",
                    "内容快照": "",
                    "本次相对上次变更": _format_change(d),
                    "操作人": "",
                    "人工标签": "",
                    "备注": ""
                })

        for j in j_hist:
            rows.append({
                "事件类型": ("人工改判(当前)" if not j.is_overridden
                            else "人工改判(已覆盖)"),
                "时间": j.created_at,
                "批次ID": j.batch_id,
                "来源文件": "",
                "源文件哈希": "",
                "行号": "",
                "标签/核心字段": f"原:{j.original_model_label}→新:{j.manual_label}",
                "内容快照": f"模型版本:{j.model_version}",
                "本次相对上次变更": (j.override_reason or ""),
                "操作人": j.operator,
                "人工标签": j.manual_label,
                "备注": j.note
            })

        rows.sort(key=lambda r: r["时间"] or "0")

        fieldnames = ["事件类型", "时间", "批次ID", "来源文件", "源文件哈希",
                      "行号", "标签/核心字段", "内容快照", "本次相对上次变更",
                      "操作人", "人工标签", "备注"]
        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)

        run_id = self.store.record_run(
            run_type="export_sample_audit",
            params={"sample_id": sample_id,
                    "output_path": os.path.abspath(output_path),
                    "rows": len(rows)},
            success=True,
            message=f"样本审计链导出: {sample_id}, {len(rows)}行"
        )
        return {
            "run_id": run_id,
            "sample_id": sample_id,
            "output_path": os.path.abspath(output_path),
            "rows": len(rows)
        }


def _extract_labels(content: Dict) -> str:
    keys = ["label", "标签", "模型标签", "模型预测", "预测", "prediction",
            "score", "分数", "风险等级", "等级"]
    out = []
    for k, v in content.items():
        for pattern in keys:
            if pattern in k or pattern in k.lower():
                out.append(f"{k}={v}")
                break
    return " | ".join(out[:5])


def _format_change(d: Dict) -> str:
    if not d:
        return ""
    items = []
    for k, v in d.items():
        if isinstance(v, dict):
            b = str(v.get("before", ""))
            a = str(v.get("after", ""))
            if len(b) > 25:
                b = b[:22] + "..."
            if len(a) > 25:
                a = a[:22] + "..."
            items.append(f"{k}: '{b}'→'{a}'")
        else:
            items.append(f"{k}={v}")
    return "；".join(items[:10])

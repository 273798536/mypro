from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from .errors import InconsistentSummaryError
from .models import DataRecord, LeakDetectionResult, ReviewRecord, ShuffleResult


class Exporter:
    """导出模块 - 保证摘要与导出文件内容严格一致

    设计原则：
    - 导出前用内容指纹校验界面摘要与文件内容是否匹配
    - 同一批材料多次导出不产生冲突结论
    - 支持 csv/json/markdown 三种格式
    """

    def __init__(self, sync_summary_with_file: bool = True):
        self.sync_summary_with_file = sync_summary_with_file

    @staticmethod
    def _summary_fingerprint(data: dict[str, Any]) -> str:
        import xxhash
        payload = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
        return xxhash.xxh64(payload.encode("utf-8")).hexdigest()

    def _verify_summary_sync(self, summary_a: dict[str, Any], summary_b: dict[str, Any]) -> None:
        if not self.sync_summary_with_file:
            return
        for key in set(summary_a.keys()) & set(summary_b.keys()):
            a_val = summary_a.get(key)
            b_val = summary_b.get(key)
            if a_val != b_val:
                raise InconsistentSummaryError(
                    summary_value=a_val, file_value=b_val, field_name=key,
                )

    # ---------- records ----------
    def export_records(self, records: list[DataRecord], out_path: str | Path,
                       fmt: str = "csv") -> dict[str, Any]:
        fmt = fmt.lower().lstrip(".")
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        rows = []
        for r in records:
            row = {
                "record_id": r.record_id,
                "content_hash": r.content_hash,
                "split_type": r.split_type.value,
                "user_id": r.user_id,
                "timestamp": r.timestamp,
                "session_id": r.session_id,
                "dedup_group_id": r.dedup_group_id,
                "source_file": r.source_file,
                "line_number": r.line_number,
            }
            row.update({f"raw__{k}": v for k, v in r.raw_content.items()})
            rows.append(row)
        df = pd.DataFrame(rows)

        summary = {
            "record_count": len(rows),
            "split_train": int((df["split_type"] == "train").sum()),
            "split_val": int((df["split_type"] == "val").sum()),
            "split_test": int((df["split_type"] == "test").sum()),
            "split_unassigned": int((df["split_type"] == "unassigned").sum()),
            "unique_users": int(df["user_id"].nunique()) if "user_id" in df else 0,
            "format": fmt,
        }
        summary["fingerprint"] = self._summary_fingerprint(summary)

        # 实际写入
        if fmt == "csv":
            df.to_csv(out_path, index=False, encoding="utf-8")
        elif fmt in ("json", "jsonl"):
            orient = "records" if fmt == "json" else None
            if fmt == "jsonl":
                df.to_json(out_path, orient="records", lines=True, force_ascii=False)
            else:
                df.to_json(out_path, orient=orient, force_ascii=False, indent=2)
        elif fmt == "parquet":
            df.to_parquet(out_path, index=False)
        else:
            raise ValueError(f"不支持的导出格式: {fmt}")

        # 回读校验同步性
        re_read_summary = self._read_back_and_summarize(out_path, fmt)
        self._verify_summary_sync(
            {k: v for k, v in summary.items() if k != "fingerprint" and k != "format"},
            {k: v for k, v in re_read_summary.items() if k != "fingerprint" and k != "format"},
        )
        return summary

    @staticmethod
    def _read_back_and_summarize(path: Path, fmt: str) -> dict[str, Any]:
        if fmt == "csv":
            df = pd.read_csv(path)
        elif fmt == "json":
            df = pd.read_json(path)
        elif fmt == "jsonl":
            df = pd.read_json(path, lines=True)
        elif fmt == "parquet":
            df = pd.read_parquet(path)
        else:
            return {}
        return {
            "record_count": int(len(df)),
            "split_train": int((df.get("split_type", pd.Series(dtype=str)) == "train").sum()),
            "split_val": int((df.get("split_type", pd.Series(dtype=str)) == "val").sum()),
            "split_test": int((df.get("split_type", pd.Series(dtype=str)) == "test").sum()),
            "split_unassigned": int((df.get("split_type", pd.Series(dtype=str)) == "unassigned").sum()),
            "unique_users": int(df["user_id"].nunique()) if "user_id" in df.columns else 0,
        }

    # ---------- shuffle result ----------
    def export_shuffle(self, shuffle: ShuffleResult, out_path: str | Path,
                       fmt: str = "csv") -> dict[str, Any]:
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        summary = shuffle.to_summary_dict()
        rows = (
            [{"record_id": rid, "split_type": "train"} for rid in shuffle.record_ids_train]
            + [{"record_id": rid, "split_type": "val"} for rid in shuffle.record_ids_val]
            + [{"record_id": rid, "split_type": "test"} for rid in shuffle.record_ids_test]
        )
        df = pd.DataFrame(rows)

        if fmt == "csv":
            df.to_csv(out_path, index=False, encoding="utf-8")
        elif fmt == "json":
            df.to_json(out_path, orient="records", force_ascii=False, indent=2)
        elif fmt == "markdown":
            md = self._shuffle_to_markdown(shuffle)
            out_path.write_text(md, encoding="utf-8")
        else:
            raise ValueError(f"不支持的格式: {fmt}")

        if fmt != "markdown":
            re_read = self._read_back_and_summarize(out_path, fmt)
            self._verify_summary_sync(
                {"train_count": summary["train_count"],
                 "val_count": summary["val_count"],
                 "test_count": summary["test_count"],
                 "total_records": summary["total_records"]},
                {"train_count": re_read.get("split_train"),
                 "val_count": re_read.get("split_val"),
                 "test_count": re_read.get("split_test"),
                 "total_records": re_read.get("record_count")},
            )
        return summary

    @staticmethod
    def _shuffle_to_markdown(s: ShuffleResult) -> str:
        su = s.to_summary_dict()
        return f"""# 数据混洗结果 {su['batch_id']}

**摘要**: seed={su['seed']}, 总计={su['total_records']} 条

| 划分 | 数量 | 占比 |
|------|-----:|-----:|
| train | {su['train_count']} | {su['train_ratio']*100:.2f}% |
| val   | {su['val_count']} | {su['val_ratio']*100:.2f}% |
| test  | {su['test_count']} | {su['test_ratio']*100:.2f}% |

## 状态说明
本划分基于确定性随机种子，重复执行结果一致。
"""

    # ---------- review record ----------
    def export_review(self, review: ReviewRecord, out_path: str | Path,
                      fmt: str = "json") -> dict[str, Any]:
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # 关键：界面摘要（to_summary_dict）与导出内容必须在状态、泄漏、去重这些字段上一致
        interface_summary = review.to_summary_dict()
        full_payload = review.model_dump(mode="json")

        # 同步性内检：导出 payload 中的关键字段要匹配界面摘要
        self._verify_summary_sync(
            interface_summary,
            {
                "review_id": full_payload.get("review_id"),
                "batch_id": full_payload.get("batch_id"),
                "status": full_payload.get("status"),
                "material_fingerprint": full_payload.get("material_fingerprint"),
                "leak_result": (LeakDetectionResult.model_validate(full_payload["leak_result"]).to_summary_dict()
                                if full_payload.get("leak_result") else None),
                "dedup_summary": full_payload.get("dedup_summary"),
                "shuffle_summary": full_payload.get("shuffle_summary"),
            },
        )

        if fmt == "json":
            out_path.write_text(
                json.dumps(full_payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        elif fmt == "markdown":
            md = self._review_to_markdown(interface_summary, full_payload)
            out_path.write_text(md, encoding="utf-8")
        elif fmt == "csv":
            rows = [
                {"k": k, "v": self._flatten_csv_value(v)}
                for k, v in interface_summary.items()
            ]
            pd.DataFrame(rows).to_csv(out_path, index=False, encoding="utf-8")
        else:
            raise ValueError(f"不支持的格式: {fmt}")

        return interface_summary

    @staticmethod
    def _flatten_csv_value(v: Any) -> str:
        if isinstance(v, (dict, list)):
            return json.dumps(v, ensure_ascii=False)
        return "" if v is None else str(v)

    @staticmethod
    def _review_to_markdown(iface: dict[str, Any], full: dict[str, Any]) -> str:
        lr = iface.get("leak_result") or {}
        dedup = iface.get("dedup_summary") or {}
        lines = [f"# 复核报告 {iface['review_id']}",
                 f"",
                 f"- **批次号**: {iface['batch_id']}",
                 f"- **复核状态**: {iface['status']}",
                 f"- **复核人**: {iface['reviewer']}",
                 f"- **创建时间**: {iface['created_at']}",
                 f"- **材料指纹**: `{iface['material_fingerprint']}`",
                 f"",
                 "## 训练验证泄漏",
                 f"- 状态: {lr.get('status', 'N/A')}",
                 f"- 泄漏类型: {lr.get('leak_type', 'none')}",
                 f"- 泄漏条数: {lr.get('leak_count', 0)} / {lr.get('total_count', 0)} "
                 f"({float(lr.get('leak_ratio', 0))*100:.4f}%)",
                 f"- 说明: {lr.get('message', '')}",
                 f"",
                 "## 去重摘要",
                 f"- 输入: {dedup.get('total_input', 0)} 条",
                 f"- 去重后: {dedup.get('total_after_dedup', 0)} 条",
                 f"- 移除重复: {dedup.get('duplicates_removed', 0)} 条",
                 "",
                 "## 混洗摘要",
                 f"- 数据来源文件: {', '.join(iface.get('data_source_files') or [])}",
                 "",
                 "## 复核意见",
                 f"> {iface.get('comment') or '（无）'}",
                 ]
        return "\n".join(lines)

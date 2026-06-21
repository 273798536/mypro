# -*- coding: utf-8 -*-
"""存储层 - 永不覆盖旧记录，人工确认独立保存。

目录结构（output-dir 下）：
  data/
    records/         每次 run 的结果 JSON，命名: {record_id}.json
    approvals/       人工确认，命名: {record_id}.json（里面是数组，追加不覆盖）
    queue.json       异常/待处理队列
    materials/       打包好的材料包

关键设计：
  - records/ 按时间戳+模型版本命名，重跑只会产生新文件，绝不会覆盖旧的
  - approvals/ 按 record_id 一个文件存所有确认历史（append-only），
    模型换版跑新的 record_id，旧的人工判断完整保留
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class GatekeeperStorage:
    def __init__(self, output_dir: Path):
        self.root = Path(output_dir)
        self.records_dir = self.root / "records"
        self.approvals_dir = self.root / "approvals"
        self.materials_dir = self.root / "materials"
        self.queue_path = self.root / "queue.json"
        self._ensure_dirs()

    # ---------- 初始化 ----------
    def _ensure_dirs(self):
        for d in (self.records_dir, self.approvals_dir, self.materials_dir):
            d.mkdir(parents=True, exist_ok=True)
        if not self.queue_path.exists():
            self.queue_path.write_text("[]", encoding="utf-8")

    # ---------- 灰度配置读取 ----------
    def load_gray_config(self, path: Path) -> Dict[str, Any]:
        """读灰度配置 JSON，并给每个字段附上原始文本行，方便失败时追溯。"""
        path = Path(path)
        raw_text = path.read_text(encoding="utf-8")
        lines = raw_text.splitlines()
        data = json.loads(raw_text)

        # 简单地通过 JSON key 查找大概行号（够用，不需要完整 JSON AST）
        raw_lines: Dict[str, str] = {}
        self._collect_raw_lines(data, "", lines, raw_lines)
        data["__raw_lines__"] = raw_lines
        data["__file__"] = str(path)
        return data

    def _collect_raw_lines(
        self,
        node: Any,
        prefix: str,
        lines: List[str],
        out: Dict[str, str],
    ):
        """递归找字段在原始文本中的行。"""
        if isinstance(node, dict):
            for k, v in node.items():
                path = f"{prefix}.{k}" if prefix else k
                # 找包含 '"k":' 的行
                for i, ln in enumerate(lines, 1):
                    stripped = ln.strip()
                    if stripped.startswith(f'"{k}"') and ":" in stripped:
                        snippet = stripped[:120]
                        out[path] = f"L{i}: {snippet}"
                        break
                self._collect_raw_lines(v, path, lines, out)

    # ---------- records ----------
    def write_record(self, record_id: str, record: Dict[str, Any]):
        """写记录。文件名唯一，绝不覆盖。"""
        p = self.records_dir / f"{record_id}.json"
        if p.exists():
            # 理论上不会发生（时间戳精确到秒 + 模型版），万一发生就再缀毫秒
            ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
            record_id = f"{ts}_{record['model_version']}_dup"
            record["record_id"] = record_id
            p = self.records_dir / f"{record_id}.json"
        p.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

        # 同步到异常队列：有 fail/warn 且未确认的，就入队
        self._maybe_enqueue(record)

    def read_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        p = self.records_dir / f"{record_id}.json"
        if not p.exists():
            return None
        return json.loads(p.read_text(encoding="utf-8"))

    def list_records(self) -> List[Dict[str, Any]]:
        """按时间倒序列所有记录。"""
        files = sorted(self.records_dir.glob("*.json"), reverse=True)
        out = []
        for f in files:
            try:
                out.append(json.loads(f.read_text(encoding="utf-8")))
            except Exception:
                continue
        return out

    # ---------- approvals（人工确认） ----------
    def write_approval(self, record_id: str, approval: Dict[str, Any]):
        """追加式写入人工确认。同一个 record_id 可以有多次确认，全部保留。"""
        p = self.approvals_dir / f"{record_id}.json"
        if p.exists():
            try:
                arr = json.loads(p.read_text(encoding="utf-8"))
                assert isinstance(arr, list)
            except Exception:
                arr = []
        else:
            arr = []
        arr.append(approval)
        p.write_text(json.dumps(arr, ensure_ascii=False, indent=2), encoding="utf-8")

    def read_approvals(self, record_id: str) -> List[Dict[str, Any]]:
        p = self.approvals_dir / f"{record_id}.json"
        if not p.exists():
            return []
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return []

    # ---------- 异常队列 ----------
    def _read_queue(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.queue_path.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _write_queue(self, q: List[Dict[str, Any]]):
        self.queue_path.write_text(json.dumps(q, ensure_ascii=False, indent=2), encoding="utf-8")

    def _maybe_enqueue(self, record: Dict[str, Any]):
        """非 pass 的记录、且未确认过的，入队。"""
        if record["final_conclusion"] == "pass":
            return
        q = self._read_queue()
        # 去重
        if any(item["record_id"] == record["record_id"] for item in q):
            return
        q.append({
            "record_id": record["record_id"],
            "model_version": record["model_version"],
            "rollback_id": record.get("rollback_id"),
            "conclusion": record["final_conclusion"],
            "summary": record["final_reason"],
            "failure_count": sum(1 for c in record["checks"] if c["status"] == "fail"),
            "warn_count": sum(1 for c in record["checks"] if c["status"] == "warn"),
            "queued_at": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "approved_by": None,
            "approved_decision": None,
            "approved_comment": None,
        })
        self._write_queue(q)

    def update_queue_on_approval(
        self, record_id: str, approval: Dict[str, Any]
    ):
        """人工确认后，队列里的条目要打标（但不删除，留历史）。"""
        q = self._read_queue()
        for item in q:
            if item["record_id"] == record_id:
                item["approved_by"] = approval["approver"]
                item["approved_decision"] = approval["decision"]
                item["approved_comment"] = approval["comment"]
                item["approved_at"] = approval["timestamp"]
        self._write_queue(q)

    def get_queue(self) -> List[Dict[str, Any]]:
        """按未确认优先、时间倒序。"""
        q = self._read_queue()
        # 未处理的放前面
        pending = [x for x in q if not x.get("approved_decision")]
        done = [x for x in q if x.get("approved_decision")]
        return pending + done

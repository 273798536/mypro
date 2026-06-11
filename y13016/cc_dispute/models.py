"""核心业务模型模块"""
import json
import csv
import re
import sqlite3
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime

from .database import Database, RECORD_STATUS, DatabaseError


def _looks_like_amount_part(left: str, right: str) -> bool:
    """
    判断左右两部分合起来是否像一个被千分位逗号拆开的金额。
    左部: 可选货币符号(￥/¥/$) + 数字，末尾为数字
    右部: 正好 3 位数字，可能带 . 和小数部分
    """
    import re
    left_clean = left.strip()
    right_clean = right.strip()
    if not left_clean or not right_clean:
        return False
    left_pattern = r'^[￥¥$]?\d[\d,]*$'
    right_pattern = r'^\d{3}(?:\.\d+)?$'
    if not re.match(left_pattern, left_clean):
        return False
    if not re.match(right_pattern, right_clean):
        return False
    return True


class ImportReceiptError(Exception):
    """托管回执导入异常"""
    pass


class ApproverNameChangeError(Exception):
    """审批人改名异常 - 需要挂起待确认"""
    pass


class NoteDeleteError(Exception):
    """备注删除异常 - 系统不允许硬删除"""
    pass


class TrustReceiptImporter:
    """托管回执导入器 - 保留原始脏数据，不做清洗"""

    def __init__(self, db: Database):
        self.db = db

    def import_from_csv(self, csv_path: Path, source_file: Optional[str] = None) -> Tuple[int, int, List[str]]:
        """
        从 CSV 文件导入托管回执。
        返回: (成功数, 跳过数, 警告列表)
        - 保留原始 raw_content（修复前的原始行内容）
        - 自动识别并修复"千分位逗号未加引号导致列错位"的脏数据
        - 所有修复都标记 dirty，原始痕迹不丢
        """
        csv_path = Path(csv_path)
        if not csv_path.exists():
            raise ImportReceiptError(f"[IMPORT_FILE_NOT_FOUND] 文件不存在: {csv_path}")

        source_label = source_file or csv_path.name
        warnings: List[str] = []
        success_count = 0
        skip_count = 0

        with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f)
            try:
                header = next(reader)
            except StopIteration:
                raise ImportReceiptError("[IMPORT_EMPTY_FILE] CSV 文件为空")

            if "receipt_no" not in header:
                raise ImportReceiptError(
                    f"[IMPORT_MISSING_REQUIRED_COLUMN] CSV 缺少必填列 receipt_no，实际列: {header}"
                )

            expected_cols = len(header)

            for row_idx, raw_fields in enumerate(reader, start=2):
                try:
                    raw_line = ",".join(raw_fields)
                    actual_cols = len(raw_fields)

                    fixed_fields = raw_fields
                    fixed_note = None
                    if actual_cols > expected_cols:
                        fixed_fields, fixed_note = self._fix_misaligned_row(
                            raw_fields, header, expected_cols
                        )
                        if fixed_note:
                            warnings.append(f"第 {row_idx} 行: [IMPORT_DIRTY_FIXED] {fixed_note}")

                    if len(fixed_fields) != expected_cols:
                        raise ImportReceiptError(
                            f"[IMPORT_COLUMN_MISMATCH] 列数不符（期望{expected_cols}列，实际{len(fixed_fields)}列），"
                            f"原始列数={actual_cols}"
                        )

                    row_dict = dict(zip(header, fixed_fields))

                    extra_dirty: List[str] = []
                    if fixed_note:
                        extra_dirty.append("dispute_amount")

                    result = self._import_single_row(
                        row_dict, source_label, row_idx,
                        raw_content_override=raw_line,
                        extra_dirty=extra_dirty
                    )
                    if result == "imported":
                        success_count += 1
                    elif result == "skipped":
                        skip_count += 1
                except ImportReceiptError as e:
                    warnings.append(f"第 {row_idx} 行: {str(e)}")
                except Exception as e:
                    warnings.append(f"第 {row_idx} 行: [IMPORT_UNEXPECTED_ERROR] {str(e)}")

        return success_count, skip_count, warnings

    @staticmethod
    def _fix_misaligned_row(fields: List[str], header: List[str],
                            expected_cols: int) -> Tuple[List[str], Optional[str]]:
        """
        尝试修复因"千分位逗号未加引号"导致的列错位。
        策略：在 header 中找金额类列名（如 dispute_amount），
        如果该位置前后两列合起来像一个带千分位的金额，则合并。
        返回: (修复后的字段列表, 修复说明)
        """
        if len(fields) <= expected_cols:
            return fields, None

        amount_col_candidates = [
            "dispute_amount", "amount", "txn_amount", "trans_amount",
            "争议金额", "交易金额", "金额"
        ]
        amount_idx = None
        for cand in amount_col_candidates:
            if cand in header:
                amount_idx = header.index(cand)
                break

        if amount_idx is None:
            return fields, None

        extra = len(fields) - expected_cols
        fixed = list(fields)
        merge_count = 0

        for _ in range(extra):
            if amount_idx + 1 >= len(fixed):
                break
            left = fixed[amount_idx]
            right = fixed[amount_idx + 1]
            if _looks_like_amount_part(left, right):
                merged = left + "," + right
                fixed = fixed[:amount_idx] + [merged] + fixed[amount_idx + 2:]
                merge_count += 1
            else:
                break

        if merge_count == 0:
            return fields, None

        note = f"金额列 '{header[amount_idx]}' 检测到千分位逗号未加引号，已自动合并 {merge_count} 处"
        return fixed, note

    def _import_single_row(self, row: Dict[str, str], source_file: str, row_num: int,
                           raw_content_override: Optional[str] = None,
                           extra_dirty: Optional[List[str]] = None) -> str:
        receipt_no = (row.get("receipt_no") or "").strip()
        if not receipt_no:
            raise ImportReceiptError(f"[IMPORT_EMPTY_RECEIPT_NO] 回执编号为空")

        if raw_content_override is not None:
            raw_content = raw_content_override
        else:
            raw_content = json.dumps(row, ensure_ascii=False)

        dirty_fields: List[str] = list(extra_dirty or [])

        card_no = row.get("card_no")
        dispute_amount_raw = row.get("dispute_amount", "")
        dispute_date = row.get("dispute_date")
        approver_name = row.get("approver_name")

        dispute_amount = None
        if dispute_amount_raw:
            try:
                cleaned = str(dispute_amount_raw).replace(",", "").replace("￥", "").replace("¥", "")
                dispute_amount = float(cleaned)
            except (ValueError, TypeError):
                if "dispute_amount" not in dirty_fields:
                    dirty_fields.append("dispute_amount")
        elif "dispute_amount" in row and "dispute_amount" not in dirty_fields:
            dirty_fields.append("dispute_amount")

        if not (dispute_date and dispute_date.strip()):
            if "dispute_date" in row and "dispute_date" not in dirty_fields:
                dirty_fields.append("dispute_date")

        if approver_name:
            original_approver_name = approver_name.strip()
        else:
            original_approver_name = None
            if "approver_name" not in dirty_fields:
                dirty_fields.append("approver_name")

        is_dirty = 1 if dirty_fields else 0

        with self.db.transaction() as conn:
            cur = conn.execute(
                "SELECT id FROM trust_receipts WHERE receipt_no = ? AND source_file = ?",
                (receipt_no, source_file)
            )
            if cur.fetchone():
                return "skipped"

            now = self.db.now_str()
            conn.execute(
                """INSERT INTO trust_receipts
                   (receipt_no, source_file, raw_content, card_no, dispute_amount,
                    dispute_date, approver_name, original_approver_name,
                    imported_at, is_dirty, dirty_fields)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    receipt_no, source_file, raw_content, card_no, dispute_amount,
                    dispute_date, approver_name, original_approver_name,
                    now, is_dirty, json.dumps(dirty_fields, ensure_ascii=False)
                )
            )
        return "imported"

    def list_receipts(self, only_dirty: bool = False) -> List[sqlite3.Row]:
        with self.db.transaction() as conn:
            if only_dirty:
                cur = conn.execute("SELECT * FROM trust_receipts WHERE is_dirty = 1 ORDER BY imported_at DESC")
            else:
                cur = conn.execute("SELECT * FROM trust_receipts ORDER BY imported_at DESC")
            return cur.fetchall()


class ApproverManager:
    """审批人管理器 - 处理改名逻辑，改名时触发挂起"""

    def __init__(self, db: Database):
        self.db = db

    def add_approver(self, current_name: str, previous_names: Optional[List[str]] = None) -> int:
        if not current_name or not current_name.strip():
            raise ValueError("[APPROVER_NAME_EMPTY] 审批人姓名不能为空")

        now = self.db.now_str()
        prev_json = json.dumps(previous_names or [], ensure_ascii=False)

        with self.db.transaction() as conn:
            cur = conn.execute(
                """INSERT INTO approvers (current_name, previous_names, is_active, created_at, updated_at)
                   VALUES (?, ?, 1, ?, ?)""",
                (current_name.strip(), prev_json, now, now)
            )
            return cur.lastrowid

    def rename_approver(self, approver_id: int, new_name: str) -> None:
        """
        审批人改名。会关联所有含旧名的争议记录标记为 SUSPENDED，
        等待复核人确认。
        """
        if not new_name or not new_name.strip():
            raise ValueError("[APPROVER_NEW_NAME_EMPTY] 新姓名不能为空")

        with self.db.transaction() as conn:
            cur = conn.execute("SELECT * FROM approvers WHERE id = ?", (approver_id,))
            approver = cur.fetchone()
            if not approver:
                raise ValueError(f"[APPROVER_NOT_FOUND] 审批人 ID={approver_id} 不存在")

            old_name = approver["current_name"]
            if old_name == new_name.strip():
                return

            prev_list = json.loads(approver["previous_names"] or "[]")
            if old_name not in prev_list:
                prev_list.append(old_name)

            now = self.db.now_str()
            conn.execute(
                """UPDATE approvers
                   SET current_name = ?, previous_names = ?, updated_at = ?
                   WHERE id = ?""",
                (new_name.strip(), json.dumps(prev_list, ensure_ascii=False), now, approver_id)
            )

            cur = conn.execute(
                """SELECT id FROM dispute_records
                   WHERE approver_id = ? AND is_suspended = 0""",
                (approver_id,)
            )
            affected = cur.fetchall()
            for rec in affected:
                conn.execute(
                    """UPDATE dispute_records
                       SET is_suspended = 1, status = 'SUSPENDED',
                           suspend_reason = ?, updated_at = ?
                       WHERE id = ?""",
                    (f"审批人改名: '{old_name}' -> '{new_name.strip()}'，请复核人确认", now, rec["id"])
                )

    def list_approvers(self) -> List[sqlite3.Row]:
        with self.db.transaction() as conn:
            cur = conn.execute("SELECT * FROM approvers ORDER BY is_active DESC, current_name")
            return cur.fetchall()

    def resolve_name(self, name: str) -> Optional[sqlite3.Row]:
        """
        根据姓名查找审批人，同时匹配 current_name 和 previous_names。
        如果存在多个可能匹配（曾用名重名），返回 None 触发挂起。
        """
        if not name:
            return None
        with self.db.transaction() as conn:
            cur = conn.execute(
                "SELECT * FROM approvers WHERE current_name = ? AND is_active = 1",
                (name.strip(),)
            )
            exact = cur.fetchone()
            if exact:
                return exact

            cur = conn.execute("SELECT * FROM approvers WHERE is_active = 1")
            all_approvers = cur.fetchall()

            matches = []
            for ap in all_approvers:
                prev_list = json.loads(ap["previous_names"] or "[]")
                if name.strip() in prev_list:
                    matches.append(ap)

            if len(matches) == 1:
                return matches[0]
            return None


class DisputeReplayer:
    """争议款异常回放核心逻辑"""

    def __init__(self, db: Database):
        self.db = db
        self.approver_mgr = ApproverManager(db)

    def create_records_from_receipts(self) -> Tuple[int, int, List[str]]:
        """
        根据托管回执批量创建争议处理记录。
        返回: (已创建数, 已存在数, 警告列表)
        - 审批人无法唯一确认时 -> 挂起 SUSPENDED
        - 审批人匹配成功 -> PENDING
        """
        warnings: List[str] = []
        created = 0
        existed = 0

        with self.db.transaction() as conn:
            cur = conn.execute(
                """SELECT tr.* FROM trust_receipts tr
                   LEFT JOIN dispute_records dr ON dr.trust_receipt_id = tr.id
                   WHERE dr.id IS NULL"""
            )
            receipts = cur.fetchall()

        now = self.db.now_str()
        for rec in receipts:
            try:
                approver_info = None
                approver_name_snapshot = rec["original_approver_name"] or rec["approver_name"]
                status = "PENDING"
                is_suspended = 0
                suspend_reason = None

                if approver_name_snapshot:
                    approver_info = self.approver_mgr.resolve_name(approver_name_snapshot)
                    if approver_info is None:
                        status = "SUSPENDED"
                        is_suspended = 1
                        suspend_reason = f"审批人姓名 '{approver_name_snapshot}' 无法唯一确认，请复核人手动确认"

                approver_id = approver_info["id"] if approver_info else None

                with self.db.transaction() as conn:
                    conn.execute(
                        """INSERT INTO dispute_records
                           (trust_receipt_id, card_no, dispute_amount, dispute_date,
                            approver_id, approver_name_snapshot, conclusion,
                            status, is_suspended, suspend_reason, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            rec["id"], rec["card_no"], rec["dispute_amount"], rec["dispute_date"],
                            approver_id, approver_name_snapshot, None,
                            status, is_suspended, suspend_reason, now, now
                        )
                    )
                    created += 1
            except Exception as e:
                warnings.append(f"回执 {rec['receipt_no']}: [REPLAY_CREATE_ERROR] {str(e)}")

        return created, existed, warnings

    def confirm_record(self, record_id: int, conclusion: str, operator: str,
                       change_reason: Optional[str] = None, new_note: Optional[str] = None) -> None:
        """
        确认或更新争议记录结论。
        - 如果结论发生变化，自动记录历史变更（旧结论、新材料备注、改判原因）
        """
        if not conclusion or not conclusion.strip():
            raise ValueError("[CONCLUSION_EMPTY] 结论不能为空")
        if not operator or not operator.strip():
            raise ValueError("[OPERATOR_EMPTY] 操作人不能为空")

        with self.db.transaction() as conn:
            cur = conn.execute("SELECT * FROM dispute_records WHERE id = ?", (record_id,))
            record = cur.fetchone()
            if not record:
                raise ValueError(f"[RECORD_NOT_FOUND] 争议记录 ID={record_id} 不存在")

            now = self.db.now_str()
            old_conclusion = record["conclusion"]
            conclusion_changed = (old_conclusion != conclusion.strip())

            if conclusion_changed and old_conclusion is not None:
                if not change_reason or not change_reason.strip():
                    raise ValueError("[CHANGE_REASON_REQUIRED] 结论变更必须提供改判原因")

                old_materials = {
                    "old_conclusion": old_conclusion,
                    "approver_name_snapshot": record["approver_name_snapshot"],
                    "card_no": record["card_no"],
                    "dispute_amount": record["dispute_amount"],
                    "dispute_date": record["dispute_date"],
                }
                conn.execute(
                    """INSERT INTO history_changes
                       (dispute_record_id, old_conclusion, new_conclusion,
                        old_materials, new_note, change_reason, operator, changed_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        record_id, old_conclusion, conclusion.strip(),
                        json.dumps(old_materials, ensure_ascii=False),
                        new_note, change_reason.strip(), operator.strip(), now
                    )
                )

            conn.execute(
                """UPDATE dispute_records
                   SET conclusion = ?, status = 'CONFIRMED', is_suspended = 0,
                       suspend_reason = NULL, updated_at = ?
                   WHERE id = ?""",
                (conclusion.strip(), now, record_id)
            )

            if new_note and new_note.strip():
                conn.execute(
                    """INSERT INTO manual_notes
                       (dispute_record_id, note_content, operator, created_at)
                       VALUES (?, ?, ?, ?)""",
                    (record_id, new_note.strip(), operator.strip(), now)
                )

    def resume_suspended(self, record_id: int, operator: str,
                         approver_id: Optional[int] = None,
                         mark_need_evidence: bool = False) -> None:
        """
        恢复挂起记录。复核人确认后操作。
        - 指定 approver_id: 关联审批人并标记 PENDING
        - mark_need_evidence=True: 标记为 NEED_EVIDENCE 待补证据
        """
        if not operator or not operator.strip():
            raise ValueError("[OPERATOR_EMPTY] 操作人不能为空")

        with self.db.transaction() as conn:
            cur = conn.execute("SELECT * FROM dispute_records WHERE id = ?", (record_id,))
            record = cur.fetchone()
            if not record:
                raise ValueError(f"[RECORD_NOT_FOUND] 争议记录 ID={record_id} 不存在")

            now = self.db.now_str()
            updates = {"is_suspended": 0, "suspend_reason": None, "updated_at": now}

            if mark_need_evidence:
                updates["status"] = "NEED_EVIDENCE"
            else:
                updates["status"] = "PENDING"

            if approver_id is not None:
                cur2 = conn.execute("SELECT current_name FROM approvers WHERE id = ?", (approver_id,))
                ap = cur2.fetchone()
                if not ap:
                    raise ValueError(f"[APPROVER_NOT_FOUND] 审批人 ID={approver_id} 不存在")
                updates["approver_id"] = approver_id
                updates["approver_name_snapshot"] = ap["current_name"]

            sets = ", ".join(f"{k} = ?" for k in updates.keys())
            values = list(updates.values()) + [record_id]
            conn.execute(f"UPDATE dispute_records SET {sets} WHERE id = ?", values)

    def mark_need_evidence(self, record_id: int, operator: str, note: Optional[str] = None) -> None:
        """标记为待补证据"""
        if not operator or not operator.strip():
            raise ValueError("[OPERATOR_EMPTY] 操作人不能为空")

        with self.db.transaction() as conn:
            now = self.db.now_str()
            conn.execute(
                """UPDATE dispute_records SET status = 'NEED_EVIDENCE', updated_at = ? WHERE id = ?""",
                (now, record_id)
            )
            if note and note.strip():
                conn.execute(
                    """INSERT INTO manual_notes
                       (dispute_record_id, note_content, operator, created_at)
                       VALUES (?, ?, ?, ?)""",
                    (record_id, f"[待补证据] {note.strip()}", operator.strip(), now)
                )

    def list_records(self, status: Optional[str] = None, suspended_only: bool = False) -> List[sqlite3.Row]:
        sql = """SELECT dr.*, tr.receipt_no, tr.source_file, tr.is_dirty, tr.dirty_fields
                 FROM dispute_records dr
                 JOIN trust_receipts tr ON tr.id = dr.trust_receipt_id"""
        conditions = []
        params: List[Any] = []

        if status:
            if status not in RECORD_STATUS:
                raise ValueError(f"[INVALID_STATUS] 状态必须是: {list(RECORD_STATUS.keys())}")
            conditions.append("dr.status = ?")
            params.append(status)

        if suspended_only:
            conditions.append("dr.is_suspended = 1")

        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY dr.updated_at DESC"

        with self.db.transaction() as conn:
            cur = conn.execute(sql, params)
            return cur.fetchall()

    def get_record_detail(self, record_id: int) -> Dict[str, Any]:
        """获取记录详情，包含托管回执、备注、历史变更"""
        with self.db.transaction() as conn:
            cur = conn.execute(
                """SELECT dr.*, tr.* FROM dispute_records dr
                   JOIN trust_receipts tr ON tr.id = dr.trust_receipt_id
                   WHERE dr.id = ?""",
                (record_id,)
            )
            record = cur.fetchone()
            if not record:
                raise ValueError(f"[RECORD_NOT_FOUND] 争议记录 ID={record_id} 不存在")

            cur = conn.execute(
                """SELECT * FROM manual_notes
                   WHERE dispute_record_id = ? AND is_deleted = 0
                   ORDER BY created_at DESC""",
                (record_id,)
            )
            notes = cur.fetchall()

            cur = conn.execute(
                """SELECT * FROM history_changes
                   WHERE dispute_record_id = ?
                   ORDER BY changed_at DESC""",
                (record_id,)
            )
            history = cur.fetchall()

            return {"record": dict(record), "notes": [dict(n) for n in notes], "history": [dict(h) for h in history]}


class NoteManager:
    """手工备注管理器 - 只允许追加，不允许硬删除"""

    def __init__(self, db: Database):
        self.db = db

    def add_note(self, record_id: int, content: str, operator: str) -> int:
        if not content or not content.strip():
            raise ValueError("[NOTE_CONTENT_EMPTY] 备注内容不能为空")
        if not operator or not operator.strip():
            raise ValueError("[OPERATOR_EMPTY] 操作人不能为空")

        with self.db.transaction() as conn:
            cur = conn.execute("SELECT id FROM dispute_records WHERE id = ?", (record_id,))
            if not cur.fetchone():
                raise ValueError(f"[RECORD_NOT_FOUND] 争议记录 ID={record_id} 不存在")

            now = self.db.now_str()
            cur = conn.execute(
                """INSERT INTO manual_notes
                   (dispute_record_id, note_content, operator, created_at)
                   VALUES (?, ?, ?, ?)""",
                (record_id, content.strip(), operator.strip(), now)
            )
            return cur.lastrowid

    def soft_delete_note(self, note_id: int, operator: str) -> None:
        """软删除备注 - 保留记录，只标记 is_deleted=1"""
        if not operator or not operator.strip():
            raise ValueError("[OPERATOR_EMPTY] 操作人不能为空")

        with self.db.transaction() as conn:
            cur = conn.execute("SELECT * FROM manual_notes WHERE id = ?", (note_id,))
            note = cur.fetchone()
            if not note:
                raise ValueError(f"[NOTE_NOT_FOUND] 备注 ID={note_id} 不存在")

            now = self.db.now_str()
            conn.execute(
                """UPDATE manual_notes
                   SET is_deleted = 1, deleted_by = ?, deleted_at = ?
                   WHERE id = ?""",
                (operator.strip(), now, note_id)
            )

    def hard_delete_forbidden(self, *args, **kwargs):
        """禁止硬删除，抛出异常"""
        raise NoteDeleteError(
            "[NOTE_HARD_DELETE_FORBIDDEN] 系统禁止硬删除备注，"
            "请使用 soft_delete_note 进行软删除，保留痕迹以便追溯"
        )

    def list_notes(self, record_id: int, include_deleted: bool = False) -> List[sqlite3.Row]:
        with self.db.transaction() as conn:
            if include_deleted:
                cur = conn.execute(
                    "SELECT * FROM manual_notes WHERE dispute_record_id = ? ORDER BY created_at DESC",
                    (record_id,)
                )
            else:
                cur = conn.execute(
                    """SELECT * FROM manual_notes
                       WHERE dispute_record_id = ? AND is_deleted = 0
                       ORDER BY created_at DESC""",
                    (record_id,)
                )
            return cur.fetchall()

"""核心功能单元测试"""
import os
import json
import tempfile
import unittest
from pathlib import Path

from cc_dispute.database import Database, RECORD_STATUS
from cc_dispute.models import (
    TrustReceiptImporter, ApproverManager, DisputeReplayer,
    NoteManager, ImportReceiptError, NoteDeleteError
)


class TestTrustReceiptImporter(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db = Database(Path(self.tmp.name))
        self.db.initialize()
        self.importer = TrustReceiptImporter(self.db)
        self.csv_path = Path(__file__).parent.parent / "examples" / "sample_trust_receipts.csv"

    def tearDown(self):
        self.db.close()
        os.unlink(self.tmp.name)

    def test_import_preserves_dirty_data(self):
        success, skipped, warnings = self.importer.import_from_csv(self.csv_path)
        self.assertEqual(success, 7)
        self.assertEqual(skipped, 0)

        dirty = self.importer.list_receipts(only_dirty=True)
        dirty_nos = [r["receipt_no"] for r in dirty]

        self.assertIn("TR20260601003", dirty_nos)
        self.assertIn("TR20260601004", dirty_nos)
        self.assertIn("TR20260601005", dirty_nos)

    def test_import_raw_content_not_modified(self):
        self.importer.import_from_csv(self.csv_path)
        rows = self.importer.list_receipts()
        for r in rows:
            raw = json.loads(r["raw_content"])
            self.assertEqual(raw["receipt_no"], r["receipt_no"])
            self.assertIn("dispute_amount", raw)
            self.assertIn("approver_name", raw)

    def test_import_file_not_found(self):
        with self.assertRaises(ImportReceiptError) as ctx:
            self.importer.import_from_csv(Path("/nonexistent/file.csv"))
        self.assertIn("IMPORT_FILE_NOT_FOUND", str(ctx.exception))

    def test_import_missing_required_column(self):
        bad_csv = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8")
        bad_csv.write("card_no,amount\n123,100\n")
        bad_csv.close()
        try:
            with self.assertRaises(ImportReceiptError) as ctx:
                self.importer.import_from_csv(Path(bad_csv.name))
            self.assertIn("IMPORT_MISSING_REQUIRED_COLUMN", str(ctx.exception))
        finally:
            os.unlink(bad_csv.name)

    def test_import_duplicate_skipped(self):
        s1, _, _ = self.importer.import_from_csv(self.csv_path)
        s2, skipped, _ = self.importer.import_from_csv(self.csv_path)
        self.assertEqual(s1, 7)
        self.assertEqual(s2, 0)
        self.assertEqual(skipped, 7)


class TestApproverManager(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db = Database(Path(self.tmp.name))
        self.db.initialize()
        self.mgr = ApproverManager(self.db)

    def tearDown(self):
        self.db.close()
        os.unlink(self.tmp.name)

    def test_add_and_resolve(self):
        aid = self.mgr.add_approver("张三", ["老三"])
        ap = self.mgr.resolve_name("张三")
        self.assertIsNotNone(ap)
        self.assertEqual(ap["id"], aid)

        ap2 = self.mgr.resolve_name("老三")
        self.assertIsNotNone(ap2)
        self.assertEqual(ap2["id"], aid)

    def test_rename_suspends_related_records(self):
        self.mgr.add_approver("张伟")
        importer = TrustReceiptImporter(self.db)
        csv_path = Path(__file__).parent.parent / "examples" / "sample_trust_receipts.csv"
        importer.import_from_csv(csv_path)
        replayer = DisputeReplayer(self.db)
        replayer.create_records_from_receipts()

        rows = replayer.list_records(suspended_only=True)
        count_before = len(rows)

        self.mgr.rename_approver(1, "张伟(新)")

        rows_after = replayer.list_records(suspended_only=True)
        self.assertGreater(len(rows_after), count_before)
        for r in rows_after:
            if r["approver_name_snapshot"] == "张伟":
                self.assertEqual(r["is_suspended"], 1)
                self.assertIn("改名", r["suspend_reason"] or "")


class TestDisputeReplayer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db = Database(Path(self.tmp.name))
        self.db.initialize()
        self.approver_mgr = ApproverManager(self.db)
        self.importer = TrustReceiptImporter(self.db)
        self.replayer = DisputeReplayer(self.db)
        self.note_mgr = NoteManager(self.db)

        self.approver_mgr.add_approver("张伟")
        self.approver_mgr.add_approver("李娜")
        csv_path = Path(__file__).parent.parent / "examples" / "sample_trust_receipts.csv"
        self.importer.import_from_csv(csv_path)
        self.replayer.create_records_from_receipts()

    def tearDown(self):
        self.db.close()
        os.unlink(self.tmp.name)

    def test_create_records_from_receipts(self):
        records = self.replayer.list_records()
        self.assertEqual(len(records), 7)

    def test_suspended_on_unknown_approver(self):
        records = self.replayer.list_records()
        for r in records:
            if r["receipt_no"] == "TR20260601005":
                self.assertEqual(r["status"], "SUSPENDED")
                self.assertEqual(r["is_suspended"], 1)

    def test_confirm_record_and_history(self):
        self.replayer.confirm_record(
            record_id=1,
            conclusion="同意退款",
            operator="tester",
            new_note="初次处理备注"
        )
        detail = self.replayer.get_record_detail(1)
        self.assertEqual(detail["record"]["conclusion"], "同意退款")
        self.assertEqual(detail["record"]["status"], "CONFIRMED")
        self.assertEqual(len(detail["notes"]), 1)

        self.replayer.confirm_record(
            record_id=1,
            conclusion="驳回退款",
            operator="supervisor",
            change_reason="新证据补录，持卡人本人操作",
            new_note="监控录像佐证"
        )
        detail2 = self.replayer.get_record_detail(1)
        self.assertEqual(detail2["record"]["conclusion"], "驳回退款")
        self.assertEqual(len(detail2["history"]), 1)
        self.assertEqual(detail2["history"][0]["old_conclusion"], "同意退款")
        self.assertEqual(detail2["history"][0]["new_conclusion"], "驳回退款")
        self.assertEqual(detail2["history"][0]["change_reason"], "新证据补录，持卡人本人操作")

    def test_change_conclusion_requires_reason(self):
        self.replayer.confirm_record(record_id=1, conclusion="A", operator="t")
        with self.assertRaises(ValueError) as ctx:
            self.replayer.confirm_record(record_id=1, conclusion="B", operator="t")
        self.assertIn("CHANGE_REASON_REQUIRED", str(ctx.exception))

    def test_resume_suspended(self):
        records = self.replayer.list_records(suspended_only=True)
        self.assertGreater(len(records), 0)
        rid = records[0]["id"]
        self.replayer.resume_suspended(rid, operator="tester", mark_need_evidence=True)
        detail = self.replayer.get_record_detail(rid)
        self.assertEqual(detail["record"]["status"], "NEED_EVIDENCE")
        self.assertEqual(detail["record"]["is_suspended"], 0)


class TestNoteManager(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db = Database(Path(self.tmp.name))
        self.db.initialize()
        self.approver_mgr = ApproverManager(self.db)
        self.importer = TrustReceiptImporter(self.db)
        self.replayer = DisputeReplayer(self.db)
        self.note_mgr = NoteManager(self.db)

        self.approver_mgr.add_approver("张伟")
        csv_path = Path(__file__).parent.parent / "examples" / "sample_trust_receipts.csv"
        self.importer.import_from_csv(csv_path)
        self.replayer.create_records_from_receipts()

    def tearDown(self):
        self.db.close()
        os.unlink(self.tmp.name)

    def test_add_note(self):
        nid = self.note_mgr.add_note(1, "测试备注", "tester")
        self.assertIsInstance(nid, int)
        notes = self.note_mgr.list_notes(1)
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["note_content"], "测试备注")

    def test_soft_delete_preserves_trace(self):
        nid = self.note_mgr.add_note(1, "will delete", "tester")
        self.note_mgr.soft_delete_note(nid, "admin")

        notes_visible = self.note_mgr.list_notes(1, include_deleted=False)
        self.assertEqual(len(notes_visible), 0)

        notes_all = self.note_mgr.list_notes(1, include_deleted=True)
        self.assertEqual(len(notes_all), 1)
        self.assertEqual(notes_all[0]["is_deleted"], 1)
        self.assertEqual(notes_all[0]["deleted_by"], "admin")
        self.assertIsNotNone(notes_all[0]["deleted_at"])

    def test_hard_delete_forbidden(self):
        with self.assertRaises(NoteDeleteError):
            self.note_mgr.hard_delete_forbidden()


if __name__ == "__main__":
    unittest.main()

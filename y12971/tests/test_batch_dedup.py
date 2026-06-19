from __future__ import annotations

import os
import shutil
import tempfile
import unittest

from batch_dedup.importer import (
    confirm_work_order,
    load_sessions,
    load_work_orders,
    run_import,
)
from batch_dedup.models import (
    ConfirmationAction,
    DedupVerdict,
    WorkOrderStatus,
)
from batch_dedup.report import generate_report
from batch_dedup.audit import load_audit_log


def _write_csv(path: str, rows: list[dict[str, str]]) -> None:
    import csv

    if not rows:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _write_data_dict(path: str, fields: list[dict[str, str]]) -> None:
    import csv

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["field_name", "field_type", "is_unique_key", "description"])
        writer.writeheader()
        for fld in fields:
            writer.writerow(fld)


class TestIdempotentRepeatedRuns(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.input_dir = os.path.join(self.tmpdir, "input")
        self.output_dir = os.path.join(self.tmpdir, "output")
        os.makedirs(self.input_dir)

        self.rows = [
            {"order_no": "WO-001", "supplier": "Alpha Co", "amount": "1000"},
            {"order_no": "WO-002", "supplier": "Beta Inc", "amount": "2000"},
            {"order_no": "WO-003", "supplier": "Gamma Ltd", "amount": "3000"},
        ]
        _write_csv(os.path.join(self.input_dir, "orders.csv"), self.rows)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_first_run_creates_orders(self):
        session = run_import(self.input_dir, self.output_dir, operator="tester")
        self.assertEqual(session.total_rows, 3)
        self.assertEqual(session.new_count, 3)
        self.assertEqual(session.duplicate_count, 0)

        orders = load_work_orders(self.output_dir)
        self.assertEqual(len(orders), 3)

    def test_second_run_is_idempotent(self):
        s1 = run_import(self.input_dir, self.output_dir, operator="tester")
        s2 = run_import(self.input_dir, self.output_dir, operator="tester")

        self.assertEqual(s1.batch_id, s2.batch_id)
        self.assertEqual(s1.new_count, s2.new_count)
        self.assertEqual(s1.duplicate_count, s2.duplicate_count)

        orders = load_work_orders(self.output_dir)
        for wo in orders.values():
            self.assertEqual(wo.seen_count, 1)

        sessions = load_sessions(self.output_dir)
        self.assertEqual(len(sessions), 1)

    def test_third_run_still_idempotent(self):
        for _ in range(3):
            run_import(self.input_dir, self.output_dir, operator="tester")

        orders = load_work_orders(self.output_dir)
        for wo in orders.values():
            self.assertEqual(wo.seen_count, 1)

        sessions = load_sessions(self.output_dir)
        self.assertEqual(len(sessions), 1)

    def test_force_run_re_processes(self):
        s1 = run_import(self.input_dir, self.output_dir, operator="tester")
        s2 = run_import(self.input_dir, self.output_dir, operator="tester", force=True)

        sessions = load_sessions(self.output_dir)
        self.assertEqual(len(sessions), 2)

        orders = load_work_orders(self.output_dir)
        for wo in orders.values():
            self.assertEqual(wo.seen_count, 2)

    def test_pagination_order_instability_same_result(self):
        rows_ordered = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1000"},
            {"order_no": "WO-002", "supplier": "Beta", "amount": "2000"},
        ]
        rows_reversed = list(reversed(rows_ordered))

        input_a = os.path.join(self.tmpdir, "input_a")
        input_b = os.path.join(self.tmpdir, "input_b")
        os.makedirs(input_a)
        os.makedirs(input_b)
        _write_csv(os.path.join(input_a, "orders.csv"), rows_ordered)
        _write_csv(os.path.join(input_b, "orders.csv"), rows_reversed)

        s1 = run_import(input_a, self.output_dir, operator="tester")
        orders1 = load_work_orders(self.output_dir)

        output_b = os.path.join(self.tmpdir, "output_b")
        s2 = run_import(input_b, output_b, operator="tester")
        orders2 = load_work_orders(output_b)

        self.assertEqual(s1.total_rows, s2.total_rows)
        self.assertEqual(len(orders1), len(orders2))

        fp1 = sorted(orders1.keys())
        fp2 = sorted(orders2.keys())
        self.assertEqual(fp1, fp2)

    def test_duplicate_detection_formatting_variations(self):
        rows = [
            {"order_no": "WO-001", "supplier": "Alpha Co", "amount": "1000"},
            {"order_no": " wo-001 ", "supplier": "  alpha co  ", "amount": " 1000 "},
        ]
        input_dir = os.path.join(self.tmpdir, "input_fmt")
        os.makedirs(input_dir)
        _write_csv(os.path.join(input_dir, "orders.csv"), rows)

        session = run_import(input_dir, self.output_dir, operator="tester")
        self.assertEqual(session.total_rows, 2)

        orders = load_work_orders(self.output_dir)
        self.assertEqual(len(orders), 1)
        wo = list(orders.values())[0]
        self.assertEqual(wo.seen_count, 2)
        self.assertEqual(wo.status, WorkOrderStatus.DUPLICATE)


class TestSupplementMode(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.input_dir = os.path.join(self.tmpdir, "input")
        self.supplement_dir = os.path.join(self.tmpdir, "supplement")
        self.output_dir = os.path.join(self.tmpdir, "output")
        os.makedirs(self.input_dir)
        os.makedirs(self.supplement_dir)

        self.initial_rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1000"},
            {"order_no": "WO-002", "supplier": "Beta", "amount": "2000"},
        ]
        _write_csv(os.path.join(self.input_dir, "orders.csv"), self.initial_rows)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_supplement_adds_new_orders(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        supplement_rows = [
            {"order_no": "WO-003", "supplier": "Gamma", "amount": "3000"},
        ]
        _write_csv(os.path.join(self.supplement_dir, "supp.csv"), supplement_rows)

        session = run_import(
            self.supplement_dir, self.output_dir, operator="tester", supplement=True
        )

        self.assertTrue(session.is_supplement)
        self.assertEqual(session.new_count, 1)
        self.assertEqual(session.total_rows, 1)

        orders = load_work_orders(self.output_dir)
        self.assertEqual(len(orders), 3)

    def test_supplement_with_duplicate_increments_seen_count(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        supplement_rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1000"},
            {"order_no": "WO-003", "supplier": "Gamma", "amount": "3000"},
        ]
        _write_csv(os.path.join(self.supplement_dir, "supp.csv"), supplement_rows)

        session = run_import(
            self.supplement_dir, self.output_dir, operator="tester", supplement=True
        )

        self.assertEqual(session.new_count, 1)
        self.assertEqual(session.duplicate_count, 1)

        orders = load_work_orders(self.output_dir)
        wo001 = next(wo for wo in orders.values() if wo.raw_data["order_no"] == "WO-001")
        self.assertEqual(wo001.seen_count, 2)

    def test_supplement_with_changed_values(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        supplement_rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1500"},
        ]
        _write_csv(os.path.join(self.supplement_dir, "supp.csv"), supplement_rows)

        session = run_import(
            self.supplement_dir, self.output_dir, operator="tester", supplement=True
        )

        self.assertEqual(session.changed_count, 1)
        self.assertEqual(session.uncertain_count, 1)

        orders = load_work_orders(self.output_dir)
        changed = [wo for wo in orders.values() if wo.status == WorkOrderStatus.CHANGED]
        self.assertEqual(len(changed), 1)

        wo = changed[0]
        self.assertEqual(wo.verdict, DedupVerdict.UNCERTAIN)
        self.assertIn("amount", wo.new_values)
        self.assertEqual(wo.new_values["amount"], "1500")
        self.assertEqual(wo.raw_data["amount"], "1000")
        self.assertEqual(wo.previous_verdict, DedupVerdict.UNIQUE.value)

    def test_same_supplement_run_twice_is_idempotent(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        supplement_rows = [
            {"order_no": "WO-003", "supplier": "Gamma", "amount": "3000"},
        ]
        _write_csv(os.path.join(self.supplement_dir, "supp.csv"), supplement_rows)

        s1 = run_import(
            self.supplement_dir, self.output_dir, operator="tester", supplement=True
        )
        s2 = run_import(
            self.supplement_dir, self.output_dir, operator="tester", supplement=True
        )

        self.assertEqual(s1.batch_id, s2.batch_id)

        orders = load_work_orders(self.output_dir)
        wo003 = next(wo for wo in orders.values() if wo.raw_data["order_no"] == "WO-003")
        self.assertEqual(wo003.seen_count, 1)

        sessions = load_sessions(self.output_dir)
        self.assertEqual(len(sessions), 2)

    def test_supplement_audit_log_records_changes(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        supplement_rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "9999"},
        ]
        _write_csv(os.path.join(self.supplement_dir, "supp.csv"), supplement_rows)

        run_import(
            self.supplement_dir, self.output_dir, operator="supplement_user", supplement=True
        )

        from batch_dedup.audit import load_audit_log

        state_dir = os.path.join(self.output_dir, "state")
        audits = load_audit_log(state_dir)

        value_changes = [a for a in audits if a.action == "value_changed"]
        self.assertTrue(len(value_changes) >= 1)
        change = value_changes[-1]
        self.assertEqual(change.operator, "supplement_user")
        self.assertEqual(change.reason, "字段值变更,需人工复核")
        self.assertIn("amount", change.new_values)


class TestManualConfirmation(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.input_dir = os.path.join(self.tmpdir, "input")
        self.output_dir = os.path.join(self.tmpdir, "output")
        os.makedirs(self.input_dir)

        self.rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1000"},
            {"order_no": "WO-002", "supplier": "Beta", "amount": "2000"},
        ]
        _write_csv(os.path.join(self.input_dir, "orders.csv"), self.rows)

        run_import(self.input_dir, self.output_dir, operator="importer")

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _get_fp_by_order_no(self, order_no: str) -> str:
        orders = load_work_orders(self.output_dir)
        for fp, wo in orders.items():
            if wo.raw_data["order_no"] == order_no:
                return fp
        raise ValueError(f"Order {order_no} not found")

    def test_approve_confirmation(self):
        fp = self._get_fp_by_order_no("WO-001")

        record = confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.APPROVE,
            operator="reviewer_zhang",
            reason="核对无误，确认为唯一工单",
        )

        self.assertIsNotNone(record)
        self.assertEqual(record.operator, "reviewer_zhang")
        self.assertEqual(record.reason, "核对无误，确认为唯一工单")
        self.assertEqual(record.old_verdict, DedupVerdict.UNIQUE.value)
        self.assertEqual(record.new_verdict, DedupVerdict.UNIQUE.value)

        orders = load_work_orders(self.output_dir)
        wo = orders[fp]
        self.assertEqual(wo.status, WorkOrderStatus.CONFIRMED)
        self.assertEqual(wo.verdict, DedupVerdict.UNIQUE)

    def test_reject_confirmation(self):
        fp = self._get_fp_by_order_no("WO-001")

        record = confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.REJECT,
            operator="reviewer_li",
            reason="确认为重复工单，予以驳回",
        )

        self.assertIsNotNone(record)
        self.assertEqual(record.action, ConfirmationAction.REJECT)

        orders = load_work_orders(self.output_dir)
        wo = orders[fp]
        self.assertEqual(wo.status, WorkOrderStatus.REJECTED)
        self.assertEqual(wo.verdict, DedupVerdict.DUPLICATE)

    def test_defer_confirmation(self):
        fp = self._get_fp_by_order_no("WO-001")

        record = confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.DEFER,
            operator="reviewer_wang",
            reason="待进一步核实，暂缓处理",
        )

        self.assertIsNotNone(record)
        self.assertEqual(record.new_verdict, DedupVerdict.UNCERTAIN.value)

        orders = load_work_orders(self.output_dir)
        wo = orders[fp]
        self.assertEqual(wo.verdict, DedupVerdict.UNCERTAIN)

    def test_confirm_nonexistent_returns_none(self):
        record = confirm_work_order(
            self.output_dir,
            fingerprint="nonexistent_fp",
            action=ConfirmationAction.APPROVE,
            operator="tester",
            reason="test",
        )
        self.assertIsNone(record)

    def test_confirmation_creates_audit_entry(self):
        fp = self._get_fp_by_order_no("WO-001")

        confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.APPROVE,
            operator="audit_tester",
            reason="审计测试：人工复核通过",
        )

        from batch_dedup.audit import get_audit_for_fingerprint

        state_dir = os.path.join(self.output_dir, "state")
        audits = get_audit_for_fingerprint(state_dir, fp)

        manual_audits = [a for a in audits if a.action.startswith("manual_")]
        self.assertTrue(len(manual_audits) >= 1)

        audit = manual_audits[-1]
        self.assertEqual(audit.operator, "audit_tester")
        self.assertEqual(audit.action, "manual_approve")
        self.assertEqual(audit.reason, "审计测试：人工复核通过")
        self.assertIn(audit.old_verdict, [DedupVerdict.UNIQUE.value, DedupVerdict.DUPLICATE.value])
        self.assertEqual(audit.new_verdict, DedupVerdict.UNIQUE.value)

    def test_changed_order_confirm_approve(self):
        rows_changed = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "9999"},
        ]
        supp_dir = os.path.join(self.tmpdir, "supp")
        os.makedirs(supp_dir)
        _write_csv(os.path.join(supp_dir, "supp.csv"), rows_changed)

        run_import(supp_dir, self.output_dir, operator="changer", supplement=True)

        orders = load_work_orders(self.output_dir)
        changed_wo = next(wo for wo in orders.values() if wo.status == WorkOrderStatus.CHANGED)
        fp = changed_wo.fingerprint

        confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.APPROVE,
            operator="final_reviewer",
            reason="分页顺序不稳定，复核通过，以新值为准",
        )

        orders = load_work_orders(self.output_dir)
        wo = orders[fp]
        self.assertEqual(wo.status, WorkOrderStatus.CONFIRMED)
        self.assertEqual(wo.verdict, DedupVerdict.UNIQUE)
        self.assertEqual(wo.raw_data["amount"], "9999")

    def test_confirmation_record_saved(self):
        from batch_dedup.importer import load_confirmations

        fp = self._get_fp_by_order_no("WO-001")
        confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.REJECT,
            operator="record_tester",
            reason="测试确认记录保存",
        )

        records = load_confirmations(self.output_dir)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].operator, "record_tester")
        self.assertEqual(records[0].action, ConfirmationAction.REJECT)


class TestIndexSuggestionChanges(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.input_dir = os.path.join(self.tmpdir, "input")
        self.output_dir = os.path.join(self.tmpdir, "output")
        os.makedirs(self.input_dir)

        self.rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1000", "id_ext": "EXT-001"},
            {"order_no": "WO-002", "supplier": "Beta", "amount": "2000", "id_ext": "EXT-002"},
        ]
        _write_csv(os.path.join(self.input_dir, "orders.csv"), self.rows)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_data_dict_arrives_later_changes_index(self):
        s1 = run_import(self.input_dir, self.output_dir, operator="first_run")
        orders_before = load_work_orders(self.output_dir)
        fps_before = set(orders_before.keys())

        data_dict_path = os.path.join(self.tmpdir, "dict.csv")
        _write_data_dict(data_dict_path, [
            {"field_name": "id_ext", "field_type": "string", "is_unique_key": "true", "description": "外部编号"},
            {"field_name": "order_no", "field_type": "string", "is_unique_key": "false", "description": "内部单号"},
        ])

        s2 = run_import(
            self.input_dir, self.output_dir,
            data_dict_path=data_dict_path,
            operator="with_dict",
            force=True,
        )

        self.assertIsNotNone(s2.previous_index_suggestion)
        self.assertIsNotNone(s2.index_suggestion)

        orders_after = load_work_orders(self.output_dir)
        fps_after = set(orders_after.keys())

        self.assertNotEqual(fps_before, fps_after)
        self.assertEqual(len(orders_after), 2)

        for wo in orders_after.values():
            self.assertEqual(wo.index_key_used, "id_ext")

    def test_report_shows_index_diff(self):
        run_import(self.input_dir, self.output_dir, operator="first")

        data_dict_path = os.path.join(self.tmpdir, "dict.csv")
        _write_data_dict(data_dict_path, [
            {"field_name": "id_ext", "field_type": "string", "is_unique_key": "true", "description": "外部编号"},
            {"field_name": "order_no", "field_type": "string", "is_unique_key": "false", "description": "内部单号"},
        ])

        session = run_import(
            self.input_dir, self.output_dir,
            data_dict_path=data_dict_path,
            operator="second",
            force=True,
        )

        report = generate_report(self.output_dir, session)

        self.assertIn("索引建议", report)
        self.assertIn("变更前", report)
        self.assertIn("变更后", report)
        self.assertIn("order_no", report)
        self.assertIn("id_ext", report)

    def test_index_change_creates_audit_entries(self):
        run_import(self.input_dir, self.output_dir, operator="first")

        data_dict_path = os.path.join(self.tmpdir, "dict.csv")
        _write_data_dict(data_dict_path, [
            {"field_name": "id_ext", "field_type": "string", "is_unique_key": "true", "description": "外部编号"},
            {"field_name": "order_no", "field_type": "string", "is_unique_key": "false", "description": "内部单号"},
        ])

        run_import(
            self.input_dir, self.output_dir,
            data_dict_path=data_dict_path,
            operator="dict_operator",
            force=True,
        )

        from batch_dedup.audit import load_audit_log

        state_dir = os.path.join(self.output_dir, "state")
        audits = load_audit_log(state_dir)

        reindex_audits = [a for a in audits if "reindex" in a.action]
        self.assertTrue(len(reindex_audits) > 0)
        for a in reindex_audits:
            self.assertEqual(a.operator, "dict_operator")
            self.assertIn("索引键变更", a.reason)


class TestReportGeneration(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.input_dir = os.path.join(self.tmpdir, "input")
        self.output_dir = os.path.join(self.tmpdir, "output")
        os.makedirs(self.input_dir)

        self.rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "1000"},
            {"order_no": "WO-002", "supplier": "Beta", "amount": "2000"},
        ]
        _write_csv(os.path.join(self.input_dir, "orders.csv"), self.rows)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_report_contains_key_sections(self):
        session = run_import(self.input_dir, self.output_dir, operator="tester")
        report = generate_report(self.output_dir, session)

        self.assertIn("批量导入重复拦截报告", report)
        self.assertIn("导入概要", report)
        self.assertIn("工单明细", report)
        self.assertIn("新增工单", report)

    def test_report_changed_orders_side_by_side(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        supp_rows = [
            {"order_no": "WO-001", "supplier": "Alpha", "amount": "9999"},
        ]
        supp_dir = os.path.join(self.tmpdir, "supp")
        os.makedirs(supp_dir)
        _write_csv(os.path.join(supp_dir, "supp.csv"), supp_rows)

        session = run_import(supp_dir, self.output_dir, operator="changer", supplement=True)
        report = generate_report(self.output_dir, session)

        self.assertIn("变更工单", report)
        self.assertIn("旧值 / 旧结论", report)
        self.assertIn("新值 / 新结论", report)
        self.assertIn("变更历史", report)
        self.assertIn("9999", report)
        self.assertIn("1000", report)

    def test_report_contains_audit_info(self):
        run_import(self.input_dir, self.output_dir, operator="tester")

        orders = load_work_orders(self.output_dir)
        fp = list(orders.keys())[0]

        confirm_work_order(
            self.output_dir,
            fingerprint=fp,
            action=ConfirmationAction.APPROVE,
            operator="report_reviewer",
            reason="报告测试：确认通过",
        )

        sessions = load_sessions(self.output_dir)
        report = generate_report(self.output_dir, sessions[-1])

        self.assertIn("审计日志", report)
        self.assertIn("人工确认记录", report)
        self.assertIn("report_reviewer", report)
        self.assertIn("报告测试：确认通过", report)


class TestRealisticBadData(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.input_dir = os.path.join(self.tmpdir, "input")
        self.output_dir = os.path.join(self.tmpdir, "output")
        os.makedirs(self.input_dir)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_mixed_formatting_duplicates_detected(self):
        rows = [
            {"order_no": "WO-2024-001", "supplier": "北京华信科技有限公司", "amount": "125000.00"},
            {"order_no": " wo-2024-001 ", "supplier": " 北京华信科技有限公司 ", "amount": " 125000.00 "},
            {"order_no": "WO-2024-001", "supplier": "北京华信科技有限公司", "amount": "125000"},
        ]
        _write_csv(os.path.join(self.input_dir, "bad_data.csv"), rows)

        session = run_import(self.input_dir, self.output_dir, operator="tester")

        orders = load_work_orders(self.output_dir)
        self.assertEqual(len(orders), 1)
        wo = list(orders.values())[0]
        self.assertEqual(wo.seen_count, 3)
        self.assertEqual(wo.status, WorkOrderStatus.DUPLICATE)

    def test_case_insensitive_comparison(self):
        rows = [
            {"order_no": "WO-AAA", "supplier": "ALPHA CO", "amount": "100"},
            {"order_no": "wo-aaa", "supplier": "alpha co", "amount": "100"},
        ]
        _write_csv(os.path.join(self.input_dir, "case_test.csv"), rows)

        session = run_import(self.input_dir, self.output_dir, operator="tester")

        orders = load_work_orders(self.output_dir)
        self.assertEqual(len(orders), 1)

    def test_full_width_spaces_handled(self):
        rows = [
            {"order_no": "WO-001", "supplier": "Alpha\u3000Co", "amount": "100"},
            {"order_no": "WO-001", "supplier": "Alpha Co", "amount": "100"},
        ]
        _write_csv(os.path.join(self.input_dir, "fw_test.csv"), rows)

        session = run_import(self.input_dir, self.output_dir, operator="tester")

        orders = load_work_orders(self.output_dir)
        self.assertEqual(len(orders), 1)


if __name__ == "__main__":
    unittest.main()

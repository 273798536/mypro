"""审计日志脱敏核验测试。

重点覆盖：
 1. 重复导入场景（幂等，skipped_idempotent > 0）
 2. 补录/重复执行后同工单同字段只保留一个 ACTIVE 结论
 3. 迁移重复执行记录倒查：从结论一路回到来源/工单/慢查询
 4. 慢查询 ID → 反查结论
 5. 回滚批次 + 恢复旧结论
 6. 报告导出

运行：python -m unittest tests.test_mask_verify -v
"""

from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from audit_mask_verify.cli import main as cli_main
from audit_mask_verify.models import (
    ConclusionStatus,
    MaskLevel,
    make_conclusion_key,
)
from audit_mask_verify.storage import Store

FIXTURES = Path(__file__).parent / "fixtures"


class MaskVerifyTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="maskv_"))
        self.input_dir = self.tmp / "input"
        self.output_dir = self.tmp / "output"
        self.input_dir.mkdir()
        self.addCleanup(lambda: shutil.rmtree(self.tmp, ignore_errors=True))

    def _cp(self, *names: str):
        for n in names:
            shutil.copy(FIXTURES / n, self.input_dir / n)

    def _cli(self, *argv: str) -> int:
        try:
            return cli_main(list(argv))
        except SystemExit as e:
            return int(e.code) if e.code is not None else 0

    def _store(self) -> Store:
        return Store(self.output_dir / ".mask_verify_state.db")


class RepeatImportTests(MaskVerifyTestBase):
    """重复导入场景：同一批材料重复跑不能越跑越乱。"""

    def test_identical_file_skipped_by_idempotency(self):
        self._cp("wo1_v1.json", "wo1_v1_dup.json")
        rc = self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        self.assertEqual(rc, 0)
        summary = json.loads((self.output_dir / "verify_summary.json").read_text())
        self.assertEqual(summary["processed_files"], 2)
        self.assertEqual(summary["skipped_idempotent"], 1, "wo1_v1_dup 内容和 wo1_v1 一致应该跳过")
        self.assertEqual(summary["conclusions_added"], 3)
        store = self._store()
        active = store.list_active_conclusions()
        self.assertEqual(len(active), 3, "两份同内容文件后结论数仍应为 3")
        # 再跑一遍：全部幂等跳过
        rc = self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        self.assertEqual(rc, 0)
        summary2 = json.loads((self.output_dir / "verify_summary.json").read_text())
        self.assertEqual(summary2["skipped_idempotent"], 2)
        self.assertEqual(summary2["conclusions_added"], 0)
        self.assertEqual(len(store.list_active_conclusions()), 3)

    def test_rerun_against_existing_output_dir_is_safe(self):
        self._cp("wo1_v1.json")
        for _ in range(3):
            rc = self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
            self.assertEqual(rc, 0)
        active = self._store().list_active_conclusions()
        self.assertEqual(len(active), 3, "同一输入重复跑 3 次，结论数还是 3，不越跑越乱")


class DedupAndConclusionTests(MaskVerifyTestBase):
    """补录/重复执行后，同工单同字段只能有一个 ACTIVE 结论。"""

    def test_same_field_superseded_after_correction(self):
        self._cp("wo1_v1.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        self._cp("wo1_v2.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))

        store = self._store()
        wo1_active = store.list_active_conclusions(work_order_id="WO-2026-0618-001")
        # phone / id_card (从 v1) + email (v2 覆盖) + real_name (v2 新增) = 4
        field_paths = sorted(c.field_path for c in wo1_active)
        self.assertEqual(field_paths, [
            "user.email",
            "user.profile.id_card",
            "user.profile.phone",
            "user.real_name",
        ])
        for c in wo1_active:
            self.assertEqual(c.status, ConclusionStatus.ACTIVE)
            key_count = len([
                x for x in wo1_active
                if make_conclusion_key(x.work_order_id, x.field_path) == c.conclusion_key
            ])
            self.assertEqual(key_count, 1, f"结论键 {c.conclusion_key} 只应有 1 条 ACTIVE")

        # email 的 ACTIVE 结论必须是 v2 补录的那版
        email_conc = next(c for c in wo1_active if c.field_path == "user.email")
        self.assertIn("zhang***@example.com", email_conc.remark)
        self.assertEqual(email_conc.actual_mask_level, MaskLevel.PARTIAL)


class TraceabilityTests(MaskVerifyTestBase):
    """追溯链：验收会拿迁移重复执行记录倒查。"""

    def test_conclusion_trace_back_to_sources_work_order_slow_query(self):
        self._cp("wo2_run1.json", "wo2_run2.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        store = self._store()
        phone = next(
            c for c in store.list_active_conclusions(work_order_id="WO-2026-0618-002")
            if c.field_path == "order.ship_addr.receiver_phone"
        )
        chain = store.trace_from_conclusion(phone.conclusion_id)
        self.assertIsNotNone(chain)
        self.assertEqual(chain.conclusion.field_path, "order.ship_addr.receiver_phone")
        self.assertEqual(chain.processing_record.batch_id, "MIGR-ORDER-RETRY")
        self.assertEqual(chain.work_order.work_order_id, "WO-2026-0618-002")
        self.assertTrue(chain.sources, "应该能回到来源日志")
        self.assertIn("order_migrate_run2.log", chain.sources[0].source_file,
                      "应为 run2 覆盖后的来源")
        self.assertTrue(chain.slow_queries, "应该关联慢查询")
        self.assertEqual(chain.slow_queries[0].slow_log_id, "SQ-MIGR-002")

    def test_slow_query_lookup_to_conclusion(self):
        self._cp("wo1_v1.json", "wo1_v2.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        store = self._store()
        # SQ-9F3A21 只在 v1 两个字段里
        chains = store.trace_from_slow_query("SQ-9F3A21")
        self.assertEqual(len(chains), 2)
        # SQ-BB0012 在 v2 的 email 里
        chains2 = store.trace_from_slow_query("SQ-BB0012")
        self.assertEqual(len(chains2), 1)
        self.assertEqual(chains2[0].conclusion.field_path, "user.email")

    def test_cli_trace_command(self):
        self._cp("wo2_run1.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        store = self._store()
        concl = store.list_active_conclusions(work_order_id="WO-2026-0618-002")[0]
        rc = self._cli("trace", "-o", str(self.output_dir),
                       "conclusion", concl.conclusion_id, "--export-md")
        self.assertEqual(rc, 0)
        self.assertTrue((self.output_dir / "traces" / f"trace_{concl.conclusion_id}.md").exists())


class RollbackTests(MaskVerifyTestBase):
    """日常入口放在回滚记录。"""

    def test_rollback_restores_previous_active_conclusion(self):
        self._cp("wo1_v1.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        v1_email = next(
            c for c in self._store().list_active_conclusions(work_order_id="WO-2026-0618-001")
            if c.field_path == "user.email"
        )
        self._cp("wo1_v2.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        v2_email = next(
            c for c in self._store().list_active_conclusions(work_order_id="WO-2026-0618-001")
            if c.field_path == "user.email"
        )
        self.assertNotEqual(v1_email.conclusion_id, v2_email.conclusion_id)

        rc = self._cli("rollback", "-o", str(self.output_dir),
                       "-b", "MIGR-PRE-001", "-r", "误补录，回滚")
        self.assertEqual(rc, 0)

        email_rolled = next(
            c for c in self._store().list_active_conclusions(work_order_id="WO-2026-0618-001")
            if c.field_path == "user.email"
        )
        self.assertEqual(email_rolled.conclusion_id, v1_email.conclusion_id,
                         "回滚后应恢复 v1 的 email 结论")

        points = self._store().list_rollback_points()
        self.assertEqual(len(points), 1)
        self.assertIn("MIGR-PRE-001", points[0].batch_id)


class ReportTests(MaskVerifyTestBase):
    """月底/课前报告导出。"""

    def test_report_export_json_and_md(self):
        self._cp("wo1_v1.json", "wo2_run1.json")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        rc = self._cli("report", "-o", str(self.output_dir), "-f", "all")
        self.assertEqual(rc, 0)
        json_files = sorted(self.output_dir.glob("mask_verify_report_*.json"))
        md_files = sorted(self.output_dir.glob("mask_verify_report_*.md"))
        self.assertTrue(json_files, "应导出 JSON 报告")
        self.assertTrue(md_files, "应导出 Markdown 报告")
        data = json.loads(json_files[0].read_text())
        self.assertIn("total", data)
        self.assertGreaterEqual(data["total"], 5)
        md = md_files[0].read_text()
        self.assertIn("# 审计日志脱敏核验报告", md)
        self.assertIn("追溯锚点", md)


class FailureAndEdgeTests(MaskVerifyTestBase):
    def test_cli_missing_input_dir(self):
        rc = self._cli("verify", "-i", str(self.input_dir / "nope"),
                       "-o", str(self.output_dir))
        self.assertEqual(rc, 2)

    def test_pass_fail_metric(self):
        # 造一个 fail：预期 FULL 但样本是明文
        bad = {
            "work_order": {"work_order_id": "WO-BAD"},
            "batch_id": "B-BAD",
            "field_checks": [{
                "field_path": "secret.key",
                "expected_mask_level": "FULL",
                "actual_sample": "real-plain-value-123",
                "source_file": "x.log",
                "raw_excerpt": "key=real-plain-value-123",
            }],
        }
        (self.input_dir / "bad.json").write_text(json.dumps(bad), encoding="utf-8")
        self._cli("verify", "-i", str(self.input_dir), "-o", str(self.output_dir))
        summary = json.loads((self.output_dir / "verify_summary.json").read_text())
        self.assertEqual(summary["pass"], 0)
        self.assertEqual(summary["fail"], 1)
        c = self._store().list_active_conclusions(work_order_id="WO-BAD")[0]
        self.assertFalse(c.is_pass)
        self.assertEqual(c.actual_mask_level, MaskLevel.NONE)


if __name__ == "__main__":
    unittest.main()

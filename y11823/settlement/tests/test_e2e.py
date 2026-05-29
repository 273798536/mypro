import os
import sys
import unittest

sys.path.insert(
    0,
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ),
)

from settlement.importer import DataImporter
from settlement.parser import ContractParser
from settlement.engine import SettlementEngine
from settlement.amendment import AmendmentTracker
from settlement.exporter import SettlementExporter


SAMPLE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples"
)


class TestEndToEnd(unittest.TestCase):
    def setUp(self):
        self.importer = DataImporter()
        self.data = self.importer.load_samples(SAMPLE_DIR)

    def test_import_with_dirty_data(self):
        self.assertGreater(len(self.data["contracts"]), 0)
        self.assertGreater(len(self.data["shows"]), 0)
        self.assertGreater(len(self.data["sponsorships"]), 0)
        self.assertGreater(len(self.data["warnings"]), 0)
        self.assertGreater(len(self.data["skipped_rows"]), 0)
        self.assertEqual(len(self.data["contracts"]), 3)

    def test_contract_parsing(self):
        parser = ContractParser(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        for c in self.data["contracts"]:
            summary = parser.summary(c.contract_id)
            self.assertIn("guarantee", summary)
            self.assertIn("split_terms", summary)
            self.assertIn("sponsor_rules", summary)
            self.assertIn("shows", summary)

    def test_settlement_engine_guarantee_trigger(self):
        engine = SettlementEngine(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        settlements = engine.settle_contract("CTR001")
        guarantee_shows = [s for s in settlements if s.is_guarantee_triggered]
        self.assertGreater(len(guarantee_shows), 0)
        for s in guarantee_shows:
            self.assertGreater(s.final_artist_payment, s.artist_raw_share)
            self.assertEqual(s.final_artist_payment, s.guarantee_amount)

    def test_settlement_engine_sponsor_before_split(self):
        engine = SettlementEngine(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        settlements = engine.settle_contract("CTR001")
        for s in settlements:
            if s.sponsor_deduction > 0:
                self.assertAlmostEqual(
                    s.base_for_split + s.sponsor_deduction,
                    s.net_box_office,
                    delta=0.02,
                )

    def test_settlement_engine_sponsor_after_split(self):
        engine = SettlementEngine(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        settlements = engine.settle_contract("CTR002")
        for s in settlements:
            if s.sponsor_deduction > 0:
                self.assertEqual(s.base_for_split, s.net_box_office)

    def test_refund_cross_show(self):
        engine = SettlementEngine(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        transfers = engine.get_refund_transfers("CTR003")
        self.assertGreater(len(transfers), 0)
        for t in transfers:
            self.assertGreater(t.amount, 0)
            self.assertNotEqual(t.from_show_id, t.to_show_id)

    def test_amendment_tracking(self):
        engine = SettlementEngine(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        settlements = engine.settle_contract("CTR001")
        tracker = AmendmentTracker()
        s = settlements[0]
        old_val = s.final_artist_payment
        new_val = old_val + 1000
        log = tracker.amend(
            s,
            "final_artist_payment",
            new_val,
            "测试修正",
            "财务",
        )
        self.assertEqual(log.old_value, str(old_val))
        self.assertEqual(log.new_value, str(new_val))
        self.assertEqual(s.final_artist_payment, new_val)
        logs = tracker.get_logs(s.settlement_id)
        self.assertEqual(len(logs), 1)

    def test_exporter_consistency(self):
        engine = SettlementEngine(
            self.data["contracts"], self.data["shows"], self.data["sponsorships"]
        )
        settlements = engine.settle_all()
        tracker = AmendmentTracker()
        exporter = SettlementExporter(settlements, tracker.get_logs())
        dicts = exporter.to_dicts()
        self.assertEqual(len(dicts), len(settlements))
        summary = exporter.summary()
        self.assertEqual(summary["total_shows"], len(settlements))

    def test_idempotent_runs(self):
        results = []
        for _ in range(5):
            importer = DataImporter()
            data = importer.load_samples(SAMPLE_DIR)
            engine = SettlementEngine(
                data["contracts"], data["shows"], data["sponsorships"]
            )
            settlements = engine.settle_all()
            exporter = SettlementExporter(settlements)
            summary = exporter.summary()
            results.append(summary)
        for i in range(1, len(results)):
            self.assertEqual(results[0]["total_shows"], results[i]["total_shows"])
            self.assertEqual(
                results[0]["guarantee_triggered"], results[i]["guarantee_triggered"]
            )
            self.assertAlmostEqual(
                results[0]["total_artist_payment"],
                results[i]["total_artist_payment"],
                delta=0.01,
            )

    def test_daily_and_review_same_calculation(self):
        importer1 = DataImporter()
        data1 = importer1.load_samples(SAMPLE_DIR)
        engine1 = SettlementEngine(
            data1["contracts"], data1["shows"], data1["sponsorships"]
        )
        daily_settlements = engine1.settle_all()
        importer2 = DataImporter()
        data2 = importer2.load_samples(SAMPLE_DIR)
        engine2 = SettlementEngine(
            data2["contracts"], data2["shows"], data2["sponsorships"]
        )
        review_settlements = engine2.settle_all()
        self.assertEqual(len(daily_settlements), len(review_settlements))
        daily_by_show = {s.show_id: s for s in daily_settlements}
        review_by_show = {s.show_id: s for s in review_settlements}
        for show_id in daily_by_show:
            d = daily_by_show[show_id]
            r = review_by_show[show_id]
            self.assertEqual(d.is_guarantee_triggered, r.is_guarantee_triggered)
            self.assertAlmostEqual(
                d.final_artist_payment, r.final_artist_payment, delta=0.01
            )
            self.assertAlmostEqual(d.promoter_share, r.promoter_share, delta=0.01)


if __name__ == "__main__":
    unittest.main()

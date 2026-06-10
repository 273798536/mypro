import unittest
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.pop("FLASK_APP", None)
os.environ.pop("FLASK_ENV", None)

from server import app, init_db, DB_PATH

TEST_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_pcr_inspection.db")


class PCRInspectionTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def setUp(self):
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
        init_db()

    def _import_samples(self, samples):
        return self.client.post(
            "/api/samples/import",
            data=json.dumps({"samples": samples}),
            content_type="application/json",
        )

    def test_import_basic(self):
        res = self._import_samples([
            {"sample_code": "NC-001", "species": "C57BL/6小鼠", "sampling_location": "A栋3层", "collection_date": "2026-06-01", "pathology_notes": "正常"},
        ])
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(len(data["data"]["imported"]), 1)
        self.assertEqual(data["data"]["imported"][0]["sample_code"], "NC-001")

    def test_duplicate_import_skipped(self):
        self._import_samples([
            {"sample_code": "NC-001", "species": "C57BL/6小鼠", "sampling_location": "A栋3层", "collection_date": "2026-06-01"},
        ])
        res = self._import_samples([
            {"sample_code": "NC-001", "species": "C57BL/6小鼠", "sampling_location": "A栋3层", "collection_date": "2026-06-01"},
        ])
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(len(data["data"]["duplicates"]), 1)
        self.assertEqual(len(data["data"]["imported"]), 0)

        all_samples = self.client.get("/api/samples").get_json()["data"]
        self.assertEqual(len(all_samples), 1)

    def test_duplicate_import_in_same_batch(self):
        res = self._import_samples([
            {"sample_code": "NC-002", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01"},
            {"sample_code": "NC-002", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01"},
        ])
        data = res.get_json()
        self.assertEqual(len(data["data"]["imported"]), 1)
        self.assertEqual(len(data["data"]["duplicates"]), 1)

    def test_import_missing_fields(self):
        res = self._import_samples([
            {"sample_code": "NC-BAD", "species": "小鼠"},
        ])
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(len(data["data"]["errors"]), 1)
        self.assertIn("sampling_location", data["data"]["errors"][0]["message"])
        self.assertIsNotNone(data["data"]["errors"][0]["suggestion"])

    def test_location_change_triggers_flag(self):
        self._import_samples([
            {"sample_code": "NC-010", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01"},
        ])
        c_res = self.client.get("/api/conclusions").get_json()["data"]
        cid = c_res[0]["id"]
        sid = c_res[0]["sample_id"]

        self.client.put(
            f"/api/conclusions/{cid}",
            data=json.dumps({"status": "confirmed", "review_opinion": "OK", "reviewer": "张老师"}),
            content_type="application/json",
        )

        res = self.client.put(
            f"/api/samples/{sid}",
            data=json.dumps({"sampling_location": "B栋"}),
            content_type="application/json",
        )
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertTrue(data["data"]["location_changed"])

        flags = self.client.get("/api/review-flags?resolved=0").get_json()["data"]
        self.assertEqual(len(flags), 1)
        self.assertIn("B栋", flags[0]["message"])

        conclusion = self.client.get(f"/api/conclusions/{cid}").get_json()["data"]
        self.assertEqual(conclusion["status"], "needs_review")

    def test_confirm_without_pathology_notes(self):
        self._import_samples([
            {"sample_code": "NC-020", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01", "pathology_notes": ""},
        ])
        c_res = self.client.get("/api/conclusions").get_json()["data"]
        cid = [c for c in c_res if c["sample_code"] == "NC-020"][0]["id"]

        res = self.client.put(
            f"/api/conclusions/{cid}",
            data=json.dumps({"status": "confirmed", "review_opinion": "OK", "reviewer": "张老师"}),
            content_type="application/json",
        )
        data = res.get_json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error"]["type"], "missing_pathology_notes")
        self.assertIsNotNone(data["error"]["suggestion"])

    def test_confirm_without_review_opinion(self):
        self._import_samples([
            {"sample_code": "NC-021", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01", "pathology_notes": "正常"},
        ])
        c_res = self.client.get("/api/conclusions").get_json()["data"]
        cid = [c for c in c_res if c["sample_code"] == "NC-021"][0]["id"]

        res = self.client.put(
            f"/api/conclusions/{cid}",
            data=json.dumps({"status": "confirmed", "reviewer": "张老师"}),
            content_type="application/json",
        )
        data = res.get_json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error"]["type"], "missing_review_opinion")

    def test_manual_correction(self):
        self._import_samples([
            {"sample_code": "NC-030", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01"},
        ])
        sid = self.client.get("/api/samples").get_json()["data"][0]["id"]

        res = self.client.post(
            f"/api/samples/{sid}/correct",
            data=json.dumps({"field_name": "pathology_notes", "new_value": "正常", "reason": "补录"}),
            content_type="application/json",
        )
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["data"]["old"], "")
        self.assertEqual(data["data"]["new"], "正常")

        sample = self.client.get(f"/api/samples/{sid}").get_json()["data"]
        self.assertEqual(len(sample["corrections"]), 1)
        self.assertEqual(sample["corrections"][0]["field_name"], "pathology_notes")

    def test_correction_location_change_flag(self):
        self._import_samples([
            {"sample_code": "NC-031", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01", "pathology_notes": "正常"},
        ])
        sid = self.client.get("/api/samples").get_json()["data"][0]["id"]
        c_res = self.client.get("/api/conclusions").get_json()["data"]
        cid = c_res[0]["id"]
        self.client.put(
            f"/api/conclusions/{cid}",
            data=json.dumps({"status": "confirmed", "review_opinion": "OK", "reviewer": "张老师"}),
            content_type="application/json",
        )

        res = self.client.post(
            f"/api/samples/{sid}/correct",
            data=json.dumps({"field_name": "sampling_location", "new_value": "B栋", "reason": "搬迁"}),
            content_type="application/json",
        )
        self.assertTrue(res.get_json()["ok"])

        flags = self.client.get("/api/review-flags?resolved=0").get_json()["data"]
        self.assertTrue(any("修正" in f["message"] for f in flags))

    def test_group_statistics(self):
        self._import_samples([
            {"sample_code": "NC-040", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01"},
            {"sample_code": "NC-041", "species": "大鼠", "sampling_location": "B栋", "collection_date": "2026-06-01"},
            {"sample_code": "NC-042", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-02"},
        ])
        res = self.client.get("/api/statistics/groups?group_by=sampling_location").get_json()
        self.assertTrue(res["ok"])
        groups = res["data"]["groups"]
        a_group = [g for g in groups if g["group_key"] == "A栋"][0]
        self.assertEqual(a_group["total"], 2)

    def test_lineage_tracking(self):
        self._import_samples([
            {"sample_code": "NC-050", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01"},
        ])
        c_res = self.client.get("/api/conclusions").get_json()["data"]
        cid = c_res[0]["id"]

        res = self.client.post(
            "/api/lineage",
            data=json.dumps({"conclusion_id": cid, "source_sample_code": "NC-001", "source_material": "同批对照", "description": "交叉验证"}),
            content_type="application/json",
        )
        self.assertTrue(res.get_json()["ok"])

        lineage_data = self.client.get(f"/api/lineage/{cid}").get_json()["data"]
        self.assertEqual(len(lineage_data["lineage"]), 2)
        self.assertEqual(lineage_data["lineage"][-1]["source_sample_code"], "NC-001")

    def test_sample_conclusion_bidirectional(self):
        self._import_samples([
            {"sample_code": "NC-060", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01", "pathology_notes": "正常"},
        ])
        sample = self.client.get("/api/samples").get_json()["data"][0]
        sid = sample["id"]
        conclusion_id = sample["conclusion_id"]

        sample_detail = self.client.get(f"/api/samples/{sid}").get_json()["data"]
        self.assertIsNotNone(sample_detail["conclusion"])
        self.assertEqual(sample_detail["conclusion"]["id"], conclusion_id)

        conclusion_detail = self.client.get(f"/api/conclusions/{conclusion_id}").get_json()["data"]
        self.assertEqual(conclusion_detail["sample_id"], sid)
        self.assertEqual(conclusion_detail["sample_code"], "NC-060")

    def test_usability_status(self):
        self._import_samples([
            {"sample_code": "NC-070", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01", "pathology_notes": "正常"},
            {"sample_code": "NC-071", "species": "小鼠", "sampling_location": "B栋", "collection_date": "2026-06-01"},
        ])
        samples = self.client.get("/api/samples").get_json()["data"]
        for s in samples:
            if s["sample_code"] == "NC-070":
                cid = s["conclusion_id"]
                self.client.put(
                    f"/api/conclusions/{cid}",
                    data=json.dumps({"status": "confirmed", "review_opinion": "OK", "reviewer": "张老师", "result": "阴性"}),
                    content_type="application/json",
                )

        conclusions = self.client.get("/api/conclusions").get_json()["data"]
        confirmed = [c for c in conclusions if c["sample_code"] == "NC-070"][0]
        self.assertEqual(confirmed["status"], "confirmed")

        needs_review = [c for c in conclusions if c["sample_code"] == "NC-071"][0]
        self.assertEqual(needs_review["status"], "needs_review")

    def test_actionable_error_format(self):
        res = self.client.get("/api/samples/99999")
        data = res.get_json()
        self.assertFalse(data["ok"])
        self.assertIn("error", data)
        self.assertIn("type", data["error"])
        self.assertIn("detail", data["error"])
        self.assertIn("suggestion", data["error"])

    def test_resolve_flag(self):
        self._import_samples([
            {"sample_code": "NC-080", "species": "小鼠", "sampling_location": "A栋", "collection_date": "2026-06-01", "pathology_notes": "正常"},
        ])
        sid = self.client.get("/api/samples").get_json()["data"][0]["id"]
        c_res = self.client.get("/api/conclusions").get_json()["data"]
        cid = c_res[0]["id"]
        self.client.put(
            f"/api/conclusions/{cid}",
            data=json.dumps({"status": "confirmed", "review_opinion": "OK", "reviewer": "张老师"}),
            content_type="application/json",
        )
        self.client.put(
            f"/api/samples/{sid}",
            data=json.dumps({"sampling_location": "B栋"}),
            content_type="application/json",
        )

        flags = self.client.get("/api/review-flags?resolved=0").get_json()["data"]
        flag_id = flags[0]["id"]

        res = self.client.post(f"/api/review-flags/{flag_id}/resolve")
        self.assertTrue(res.get_json()["ok"])

        remaining = self.client.get("/api/review-flags?resolved=0").get_json()["data"]
        self.assertEqual(len(remaining), 0)


if __name__ == "__main__":
    unittest.main()

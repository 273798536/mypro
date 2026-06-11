#!/usr/bin/env python3
import unittest
import os
import sys
import subprocess
import time
import requests
import threading

BASE_URL = "http://localhost:5001/api"


class TestSeaweedPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db_file = 'seaweed.db'
        if os.path.exists(db_file):
            os.remove(db_file)

        env = os.environ.copy()
        env['PORT'] = '5001'
        cls.server = subprocess.Popen(
            [sys.executable, "app.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )

        for i in range(15):
            try:
                r = requests.get(f"{BASE_URL}/samples", timeout=2)
                if r.status_code == 200:
                    return
            except requests.exceptions.ConnectionError:
                time.sleep(1)

        cls.tearDownClass()
        raise RuntimeError("服务器启动超时")

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'server'):
            cls.server.terminate()
            cls.server.wait(timeout=5)

    def test_01_create_batch(self):
        data = {
            "batch_id": "TEST-BATCH-001",
            "reagent_lot": "TEST-REAGENT-001",
            "microscope_batch": "TEST-MICRO-001",
            "created_by": "测试员",
            "description": "测试批次"
        }
        r = requests.post(f"{BASE_URL}/batches", json=data)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['batch_id'], "TEST-BATCH-001")

    def test_02_import_reviews(self):
        data = {
            "batch_id": "TEST-BATCH-001",
            "created_by": "测试员",
            "reviews": [
                {
                    "sample_id": "TEST-SW-001",
                    "species": "海带",
                    "initial_growth_stage": "5",
                    "reviewer": "测试复核员",
                    "opinion": "生长正常",
                    "conclusion": "正常"
                },
                {
                    "sample_id": "TEST-SW-002",
                    "species": "海带",
                    "initial_growth_stage": "15",
                    "reviewer": "测试复核员",
                    "opinion": "生长异常",
                    "conclusion": "异常",
                    "low_quality_reads_passed": True,
                    "low_quality_reads": [
                        {"read_id": "TEST-LQ-001", "quality_score": 12.5, "reason": "测试低质量"}
                    ]
                },
                {
                    "sample_id": "TEST-NC-001",
                    "species": "对照",
                    "initial_growth_stage": "12",
                    "reviewer": "测试复核员",
                    "opinion": "阴性对照",
                    "conclusion": "正常",
                    "is_negative_control": True
                }
            ]
        }
        r = requests.post(f"{BASE_URL}/reviews/import", json=data)
        self.assertEqual(r.status_code, 201)
        result = r.json()
        self.assertEqual(result['imported_count'], 3)
        self.assertEqual(result['batch_id'], "TEST-BATCH-001")

    def test_03_create_annotation_same_batch(self):
        data = {
            "sample_id": "TEST-SW-001",
            "batch_id": "TEST-BATCH-001",
            "image_path": "/test/image.tif",
            "annotation_data": {"test": "data"},
            "annotated_by": "测试标注员",
            "boundary_confidence": 0.85
        }
        r = requests.post(f"{BASE_URL}/annotations", json=data)
        self.assertEqual(r.status_code, 201)

        r = requests.get(f"{BASE_URL}/annotations/batch/TEST-BATCH-001")
        self.assertEqual(r.status_code, 200)
        annotations = r.json()
        self.assertEqual(len(annotations), 1)
        self.assertEqual(annotations[0]['batch_id'], "TEST-BATCH-001")

    def test_04_negative_control_review(self):
        data = {
            "batch_id": "TEST-BATCH-001",
            "growth_threshold": 10,
            "reviewer": "测试员"
        }
        r = requests.post(f"{BASE_URL}/negative-control/review", json=data)
        self.assertEqual(r.status_code, 200)
        result = r.json()
        self.assertEqual(result['abnormal_count'], 1)

    def test_05_update_review_creates_history(self):
        update_data = {
            "reviewer": "测试主管",
            "opinion": "二次复核确认异常",
            "conclusion": "异常",
            "low_quality_reads_passed": False,
            "change_reason": "测试修改：低质量读段不予通过"
        }
        r = requests.put(f"{BASE_URL}/reviews/2", json=update_data)
        self.assertEqual(r.status_code, 200)
        result = r.json()
        self.assertEqual(result['version'], 2)
        self.assertIn('previous_version', result)
        self.assertEqual(result['previous_version']['conclusion'], '异常')
        self.assertEqual(result['previous_version']['low_quality_reads_passed'], True)

    def test_06_compare_versions(self):
        r = requests.get(f"{BASE_URL}/reviews/compare/4")
        self.assertEqual(r.status_code, 200)
        result = r.json()
        self.assertIn('side_by_side', result)
        self.assertIn('old', result['side_by_side'])
        self.assertIn('new', result['side_by_side'])
        self.assertIn('changed_fields', result)
        self.assertGreater(len(result['changed_fields']), 0)

    def test_07_anomaly_trace(self):
        r = requests.get(f"{BASE_URL}/anomaly/trace/TEST-SW-002")
        self.assertEqual(r.status_code, 200)
        result = r.json()
        self.assertIn('sample', result)
        self.assertIn('latest_review', result)
        self.assertIn('review_history', result)
        self.assertIn('low_quality_reads', result)
        self.assertIn('audit_trail', result)
        self.assertGreater(len(result['audit_trail']), 0)

        audit = result['audit_trail'][0]
        self.assertIn('changed_by', audit)
        self.assertIn('change_reason', audit)
        self.assertIn('timestamp', audit)

    def test_08_batch_statistics_consistent(self):
        r = requests.get(f"{BASE_URL}/batches/TEST-BATCH-001")
        self.assertEqual(r.status_code, 200)
        result = r.json()
        self.assertEqual(result['statistics']['total_samples'], 3)
        self.assertEqual(result['statistics']['abnormal_count'], 2)
        self.assertEqual(result['statistics']['negative_control_count'], 1)
        self.assertEqual(result['statistics']['negative_control_abnormal_count'], 1)
        self.assertEqual(result['statistics']['low_quality_count'], 1)
        self.assertEqual(result['annotations_count'], 1)

    def test_09_export_report(self):
        for fmt in ['json', 'txt', 'excel']:
            r = requests.get(f"{BASE_URL}/export/report/TEST-BATCH-001?format={fmt}")
            self.assertEqual(r.status_code, 200, f"导出 {fmt} 失败")
            if fmt == 'json':
                data = r.json()
                self.assertIn('plain_text_summary', data)
                self.assertIn('复核意见说明', data['plain_text_summary'])

    def test_10_low_quality_read_audit(self):
        r = requests.get(f"{BASE_URL}/reviews/history/TEST-SW-002")
        self.assertEqual(r.status_code, 200)
        history = r.json()
        self.assertEqual(len(history), 2)

        v1 = history[0]
        v2 = history[1]
        self.assertEqual(v1['version'], 1)
        self.assertEqual(v2['version'], 2)
        self.assertEqual(v1['low_quality_reads_passed'], True)
        self.assertEqual(v2['low_quality_reads_passed'], False)
        self.assertEqual(v2['change_reason'], '测试修改：低质量读段不予通过')
        self.assertEqual(v2['reviewer'], '测试主管')


if __name__ == '__main__':
    unittest.main(verbosity=2)

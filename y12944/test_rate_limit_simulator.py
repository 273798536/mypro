#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import unittest
from rate_limit_simulator import (
    DataSource,
    InterceptReason,
    RateLimitSimulator,
    Sample,
    SafetyRule,
    SimulatorConfig,
)


class TestRateLimitSimulator(unittest.TestCase):
    def setUp(self):
        self.config = SimulatorConfig(
            safety_rules=[
                SafetyRule(
                    rule_id="R001",
                    rule_name="敏感词检测",
                    rule_description="测试规则",
                    rule_pattern=r"(敏感词|违规)",
                    severity=3,
                    is_enabled=True,
                    created_by="test",
                )
            ],
            boundary_values={
                "confidence_score": {"min": 0.0, "max": 1.0},
            },
        )
        self.config.add_split_entry("训练集样本1")
        self.config.add_split_entry("训练集样本2")
        self.simulator = RateLimitSimulator(self.config)

    def test_create_sample(self):
        sample = Sample(
            sample_id="T001",
            prompt="这是一个测试提示词",
            response="这是一个测试响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
            features={"confidence_score": 0.85},
        )
        self.assertEqual(sample.sample_id, "T001")
        self.assertEqual(sample.data_source, DataSource.TRAIN)
        self.assertIsNotNone(sample.content_hash())

    def test_add_and_run_simulation(self):
        sample1 = Sample(
            sample_id="T001",
            prompt="正常的测试提示词",
            response="正常的响应",
            data_source=DataSource.TEST,
            group_id="G01",
            prompt_version="v1.0",
            features={"confidence_score": 0.85},
        )
        sample2 = Sample(
            sample_id="T002",
            prompt="训练集样本1",
            response="这个样本在训练集中",
            data_source=DataSource.VALIDATION,
            group_id="G01",
            prompt_version="v1.0",
            features={"confidence_score": 0.9},
        )
        self.simulator.add_samples([sample1, sample2])
        results = self.simulator.run_simulation()

        self.assertIn("T001", results)
        self.assertIn("T002", results)
        self.assertFalse(results["T001"].is_blocked)
        self.assertTrue(results["T002"].is_blocked)
        self.assertIn(InterceptReason.TRAIN_TEST_LEAKAGE, results["T002"].intercept_reasons)

    def test_duplicate_detection(self):
        sample1 = Sample(
            sample_id="D001",
            prompt="重复的提示词",
            response="重复的响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
        )
        sample2 = Sample(
            sample_id="D002",
            prompt="重复的提示词",
            response="重复的响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
        )
        self.simulator.add_samples([sample1, sample2])
        results = self.simulator.run_simulation()

        self.assertFalse(results["D001"].is_blocked)
        self.assertTrue(results["D002"].is_blocked)
        self.assertIn(InterceptReason.DUPLICATE_SAMPLE, results["D002"].intercept_reasons)

    def test_safety_rule_violation(self):
        sample = Sample(
            sample_id="S001",
            prompt="这个提示词包含敏感词",
            response="正常响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
            features={"confidence_score": 0.8},
        )
        self.simulator.add_sample(sample)
        results = self.simulator.run_simulation()

        self.assertTrue(results["S001"].is_blocked)
        self.assertIn(InterceptReason.SAFETY_RULE_VIOLATION, results["S001"].intercept_reasons)
        self.assertIn("R001", results["S001"].matched_rules)

    def test_boundary_value_check(self):
        sample = Sample(
            sample_id="B001",
            prompt="边界测试",
            response="边界测试响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
            features={"confidence_score": 1.5},
        )
        self.simulator.add_sample(sample)
        results = self.simulator.run_simulation()

        self.assertTrue(results["B001"].is_blocked)
        self.assertIn(InterceptReason.BOUNDARY_VALUE, results["B001"].intercept_reasons)

    def test_split_list_update_and_recheck(self):
        sample = Sample(
            sample_id="U001",
            prompt="新的训练样本",
            response="测试响应",
            data_source=DataSource.TEST,
            group_id="G01",
            prompt_version="v1.0",
        )
        self.simulator.add_sample(sample)
        results1 = self.simulator.run_simulation()
        self.assertFalse(results1["U001"].is_blocked)

        new_results = self.simulator.update_split_list_and_recheck(["新的训练样本"])
        self.assertTrue(new_results["U001"].is_blocked)
        self.assertIn(InterceptReason.TRAIN_TEST_LEAKAGE, new_results["U001"].intercept_reasons)
        self.assertEqual(new_results["U001"].check_round, 2)

    def test_group_metrics_calculation(self):
        samples = [
            Sample(
                sample_id=f"M{i:03d}",
                prompt=f"样本{i}",
                response=f"响应{i}",
                data_source=DataSource.TEST,
                group_id="G01",
                prompt_version="v1.0",
            )
            for i in range(5)
        ]
        samples[0].prompt = "训练集样本1"
        self.simulator.add_samples(samples)
        self.simulator.run_simulation()

        metrics = self.simulator.get_group_metrics("G01")[0]
        self.assertEqual(metrics.total_samples, 5)
        self.assertEqual(metrics.passed_samples, 4)
        self.assertEqual(metrics.blocked_samples, 1)
        self.assertEqual(metrics.leakage_count, 1)
        self.assertAlmostEqual(metrics.pass_rate, 0.8)
        self.assertAlmostEqual(metrics.block_rate, 0.2)

    def test_manual_correction_and_review(self):
        sample = Sample(
            sample_id="C001",
            prompt="包含敏感词的提示词",
            response="正常响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
        )
        self.simulator.add_sample(sample)
        self.simulator.run_simulation()

        correction = self.simulator.review_workflow.add_manual_correction(
            sample=sample,
            version=None,
            original_prompt=sample.prompt,
            corrected_prompt="修正后的提示词",
            original_response=sample.response,
            corrected_response=sample.response,
            correction_note="这个需要修正一下敏感词，其他没问题。",
            corrected_by="测试工程师",
        )

        self.assertEqual(correction.correction_note, "这个需要修正一下敏感词，其他没问题。")
        self.assertFalse(correction.is_approved)

        review = self.simulator.review_workflow.create_comprehensive_review(
            sample=sample,
            version=None,
            reviewer="审核人员",
            model_logs={"test": "log"},
            safety_rules_checked=["R001"],
            tool_call_params={"param": "value"},
            review_notes="修正后可以通过",
            is_approved=True,
        )

        self.assertTrue(review.is_approved)
        self.assertEqual(review.review_notes, "修正后可以通过")
        self.assertEqual(review.model_logs, {"test": "log"})

    def test_report_generation(self):
        sample1 = Sample(
            sample_id="R001",
            prompt="正常样本",
            response="正常响应",
            data_source=DataSource.TEST,
            group_id="G01",
            prompt_version="v1.0",
        )
        sample2 = Sample(
            sample_id="R002",
            prompt="训练集样本1",
            response="泄漏样本",
            data_source=DataSource.VALIDATION,
            group_id="G01",
            prompt_version="v1.0",
        )
        self.simulator.add_samples([sample1, sample2])
        self.simulator.run_simulation()

        report = self.simulator.generate_report()
        self.assertIn("模型服务限流模拟检查报告", report)
        self.assertIn("训练验证泄漏", report)
        self.assertIn("考试题提前漏给学生", report)
        self.assertIn("R001", report)
        self.assertIn("R002", report)

    def test_sample_status_management(self):
        sample = Sample(
            sample_id="ST001",
            prompt="测试状态管理",
            response="测试响应",
            data_source=DataSource.TRAIN,
            group_id="G01",
            prompt_version="v1.0",
        )
        self.simulator.add_sample(sample)
        self.assertEqual(self.simulator.get_sample_status("ST001"), "pending")

        self.simulator.run_simulation()
        self.assertEqual(self.simulator.get_sample_status("ST001"), "passed")

        self.simulator.mark_for_review("ST001")
        self.assertEqual(self.simulator.get_sample_status("ST001"), "needs_review")

    def test_get_summary(self):
        samples = [
            Sample(
                sample_id=f"SUM{i:03d}",
                prompt=f"样本{i}",
                response=f"响应{i}",
                data_source=DataSource.TEST,
                group_id="G01",
                prompt_version="v1.0",
            )
            for i in range(3)
        ]
        samples[0].prompt = "训练集样本1"
        samples[1].prompt = "包含敏感词的内容"
        self.simulator.add_samples(samples)
        self.simulator.run_simulation()

        summary = self.simulator.get_summary()
        self.assertEqual(summary["total_samples"], 3)
        self.assertEqual(summary["passed"], 1)
        self.assertEqual(summary["blocked"], 2)
        self.assertIn("train_test_leakage", summary["top_blocked_reasons"])
        self.assertIn("safety_rule_violation", summary["top_blocked_reasons"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

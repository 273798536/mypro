import json
import os
import tempfile
import unittest

from mc_review import (
    MonteCarloReview,
    TimelineStatus,
    WeightChangeReason,
    WrongAnswer,
    RawSource,
    WeightChange,
    ExtrapolationBreach,
    CalculationStep,
    TimelineEntry,
)


class TestWrongAnswerCreation(unittest.TestCase):
    def test_basic_creation(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q001",
            student_answer=3.5,
            correct_answer=3.0,
            error_type="计算误差",
            unit="m/s",
            student_id="S2023001",
            original_statement="我算出来是3.5m/s，可能是小数点进位问题",
        )
        self.assertIsInstance(wa, WrongAnswer)
        self.assertEqual(wa.question_id, "Q001")
        self.assertEqual(wa.student_answer, 3.5)
        self.assertEqual(wa.unit, "m/s")
        self.assertIsNotNone(wa.raw_source)
        self.assertEqual(wa.raw_source.student_id, "S2023001")
        self.assertIn(wa.id, review.wrong_answers)

    def test_dirty_data_preserved(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q002",
            student_answer="大约5",
            correct_answer=5.0,
            error_type="精度不足",
            unit="kg",
            student_id="S2023002",
            original_statement="答案大约5吧",
            is_dirty=True,
            dirt_description="学生答案非数值，含模糊词'大约'",
            raw_data={"raw_text": "答案大约5吧", "parsed_value": None},
        )
        self.assertTrue(wa.raw_source.is_dirty)
        self.assertEqual(wa.raw_source.dirt_description, "学生答案非数值，含模糊词'大约'")
        self.assertIn("raw_text", wa.raw_source.raw_data)

    def test_timeline_entry_on_add(self):
        review = MonteCarloReview()
        review.add_wrong_answer(
            question_id="Q003",
            student_answer=10,
            correct_answer=8,
            error_type="概念错误",
        )
        self.assertEqual(len(review.timeline), 1)
        self.assertEqual(review.timeline[0].event_type, "录入错题")
        self.assertEqual(review.timeline[0].status, TimelineStatus.PROCESSED.value)


class TestWeightChange(unittest.TestCase):
    def test_weight_change_recorded(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q010",
            student_answer=2.0,
            correct_answer=1.5,
            error_type="系统误差",
            unit="mm",
        )
        wc = review.change_weight(
            wrong_answer_id=wa.id,
            param_name="采样频率权重",
            old_value=0.3,
            new_value=0.5,
            unit="无量纲",
            reason=WeightChangeReason.CALIBRATION.value,
            reason_detail="根据三次标定实验结果调整",
            changed_by="小岑",
        )
        self.assertEqual(wc.old_value, 0.3)
        self.assertEqual(wc.new_value, 0.5)
        self.assertEqual(wc.changed_by, "小岑")
        self.assertIn(wc.id, review.weight_changes)

    def test_weight_change_links_to_wrong_answer(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q011",
            student_answer=100,
            correct_answer=95,
            error_type="舍入误差",
        )
        wc = review.change_weight(
            wrong_answer_id=wa.id,
            param_name="误差容限",
            old_value=0.05,
            new_value=0.08,
            unit="无量纲",
            reason=WeightChangeReason.MANUAL_JUDGMENT.value,
            changed_by="小岑",
        )
        trace = review.trace_wrong_answer(wa.id)
        self.assertEqual(len(trace["weight_changes"]), 1)
        self.assertEqual(trace["weight_changes"][0]["param_name"], "误差容限")

    def test_weight_change_nonexistent_wrong_answer(self):
        review = MonteCarloReview()
        with self.assertRaises(ValueError):
            review.change_weight(
                wrong_answer_id="nonexistent",
                param_name="x",
                old_value=1,
                new_value=2,
            )

    def test_manual_override_timeline_status(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q012",
            student_answer=7,
            correct_answer=6,
            error_type="读数误差",
        )
        review.change_weight(
            wrong_answer_id=wa.id,
            param_name="权重A",
            old_value=0.1,
            new_value=0.2,
            reason=WeightChangeReason.MANUAL_JUDGMENT.value,
            changed_by="小岑",
        )
        override_entries = review.get_timeline_by_status(TimelineStatus.MANUAL_OVERRIDE.value)
        self.assertTrue(any("权重修改" in t.event_type for t in override_entries))


class TestExtrapolationBreach(unittest.TestCase):
    def test_breach_detected(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q020",
            student_answer=150,
            correct_answer=100,
            error_type="外推越界",
            unit="°C",
            student_id="S2023003",
            original_statement="温度估计150°C",
        )
        breach = review.check_extrapolation(
            wrong_answer_id=wa.id,
            param_name="温度",
            extrapolated_value=150,
            boundary_low=0,
            boundary_high=120,
            unit="°C",
        )
        self.assertIsNotNone(breach)
        self.assertEqual(breach.original_statement, "温度估计150°C")
        self.assertEqual(breach.boundary_high, 120)

    def test_no_breach_within_range(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q021",
            student_answer=80,
            correct_answer=75,
            error_type="计算误差",
        )
        breach = review.check_extrapolation(
            wrong_answer_id=wa.id,
            param_name="温度",
            extrapolated_value=80,
            boundary_low=0,
            boundary_high=120,
        )
        self.assertIsNone(breach)

    def test_breach_creates_pending_timeline(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q022",
            student_answer=200,
            correct_answer=100,
            error_type="外推越界",
            student_id="S2023004",
            original_statement="我觉得应该是200",
        )
        review.check_extrapolation(
            wrong_answer_id=wa.id,
            param_name="压力",
            extrapolated_value=200,
            boundary_low=0,
            boundary_high=150,
            unit="kPa",
        )
        pending = review.get_timeline_by_status(TimelineStatus.PENDING.value)
        self.assertTrue(any("外推越界" in t.event_type for t in pending))

    def test_breach_resolved(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q023",
            student_answer=300,
            correct_answer=100,
            error_type="外推越界",
            student_id="S2023005",
            original_statement="粗估300左右",
        )
        breach = review.check_extrapolation(
            wrong_answer_id=wa.id,
            param_name="频率",
            extrapolated_value=300,
            boundary_low=50,
            boundary_high=200,
            unit="Hz",
        )
        review.resolve_breach(breach.id, "确认学生误读，已修正为100Hz", "小岑")
        self.assertEqual(breach.resolution, "确认学生误读，已修正为100Hz")
        resolved_timeline = [
            t for t in review.timeline
            if t.related_breach_id == breach.id and t.event_type == "越界处理"
        ]
        self.assertEqual(len(resolved_timeline), 1)
        self.assertEqual(resolved_timeline[0].status, TimelineStatus.PROCESSED.value)


class TestCalculationSteps(unittest.TestCase):
    def test_add_calculation_step(self):
        review = MonteCarloReview()
        step = review.add_calculation_step(
            description="蒙特卡洛均值计算",
            formula="μ = Σx_i / N",
            input_values={"N": 10000, "sum": 52340.0},
            output_value=5.234,
            unit_before="无量纲",
            unit_after="无量纲",
            boundary_low=0,
            boundary_high=10,
            note="10万次采样取均值",
        )
        self.assertEqual(step.formula, "μ = Σx_i / N")
        self.assertEqual(step.output_value, 5.234)

    def test_unit_conversion_visible(self):
        review = MonteCarloReview()
        step = review.add_calculation_step(
            description="单位换算：mm → m",
            formula="x_m = x_mm / 1000",
            input_values={"x_mm": 1500},
            output_value=1.5,
            unit_before="mm",
            unit_after="m",
            conversion_factor=0.001,
        )
        self.assertEqual(step.unit_before, "mm")
        self.assertEqual(step.unit_after, "m")
        self.assertEqual(step.conversion_factor, 0.001)

    def test_comparison_view(self):
        review = MonteCarloReview()
        wa1 = review.add_wrong_answer(
            question_id="Q030",
            student_answer=3.5,
            correct_answer=3.0,
            error_type="计算误差",
        )
        review.change_weight(
            wrong_answer_id=wa1.id,
            param_name="alpha",
            old_value=0.1,
            new_value=0.2,
            unit="无量纲",
            reason="标定调整",
            changed_by="小岑",
        )
        review.add_calculation_step(
            description="参数对照计算",
            formula="delta = alpha_new - alpha_old",
            input_values={"alpha_old": 0.1, "alpha_new": 0.2},
            output_value=0.1,
            unit_before="无量纲",
            unit_after="无量纲",
        )
        view = review.get_comparison_view()
        self.assertIn("alpha", view["weight_changes_by_param"])
        self.assertEqual(len(view["calculation_steps"]), 1)


class TestTimelineGrouping(unittest.TestCase):
    def test_grouped_timeline(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q040",
            student_answer=999,
            correct_answer=100,
            error_type="外推越界",
            student_id="S2023006",
            original_statement="随便估了一个值",
        )
        review.check_extrapolation(
            wrong_answer_id=wa.id,
            param_name="距离",
            extrapolated_value=999,
            boundary_low=0,
            boundary_high=500,
            unit="km",
        )
        grouped = review.get_timeline_grouped()
        self.assertIn(TimelineStatus.PROCESSED.value, grouped)
        self.assertIn(TimelineStatus.PENDING.value, grouped)
        self.assertTrue(len(grouped[TimelineStatus.PROCESSED.value]) >= 1)
        self.assertTrue(len(grouped[TimelineStatus.PENDING.value]) >= 1)


class TestTraceOriginalStatement(unittest.TestCase):
    def test_trace_from_original(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q050",
            student_answer=50,
            correct_answer=40,
            error_type="计算误差",
            unit="m",
            student_id="S2023007",
            original_statement="根据公式F=ma算出50米",
        )
        review.change_weight(
            wrong_answer_id=wa.id,
            param_name="力权重",
            old_value=0.4,
            new_value=0.6,
            unit="无量纲",
            reason="标定调整",
            changed_by="小岑",
        )
        results = review.trace_from_original_statement("F=ma")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["wrong_answer"]["question_id"], "Q050")
        self.assertEqual(len(results[0]["weight_changes"]), 1)

    def test_trace_nonexistent_original(self):
        review = MonteCarloReview()
        results = review.trace_from_original_statement("不存在的说法")
        self.assertEqual(len(results), 0)


class TestPersistence(unittest.TestCase):
    def test_save_and_load(self):
        review = MonteCarloReview()
        wa = review.add_wrong_answer(
            question_id="Q060",
            student_answer=3.5,
            correct_answer=3.0,
            error_type="计算误差",
            unit="m/s",
            student_id="S2023008",
            original_statement="我用3.5作为速度",
            is_dirty=True,
            dirt_description="学生未标注单位",
        )
        review.change_weight(
            wrong_answer_id=wa.id,
            param_name="速度权重",
            old_value=0.5,
            new_value=0.7,
            unit="无量纲",
            reason=WeightChangeReason.CALIBRATION.value,
            changed_by="小岑",
        )
        breach = review.check_extrapolation(
            wrong_answer_id=wa.id,
            param_name="速度",
            extrapolated_value=3.5,
            boundary_low=0,
            boundary_high=3.0,
            unit="m/s",
        )
        review.add_calculation_step(
            description="误差传播计算",
            formula="σ_total = √(σ_a² + σ_b²)",
            input_values={"sigma_a": 0.1, "sigma_b": 0.2},
            output_value=0.2236,
            unit_before="m/s",
            unit_after="m/s",
        )

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            filepath = f.name

        try:
            review.save(filepath)
            loaded = MonteCarloReview.load(filepath)
            self.assertEqual(len(loaded.wrong_answers), 1)
            self.assertEqual(len(loaded.weight_changes), 1)
            self.assertEqual(len(loaded.breaches), 1)
            self.assertEqual(len(loaded.calculation_steps), 1)
            self.assertEqual(len(loaded.timeline), 4)
            loaded_wa = list(loaded.wrong_answers.values())[0]
            self.assertTrue(loaded_wa.raw_source.is_dirty)
            self.assertEqual(loaded_wa.raw_source.original_statement, "我用3.5作为速度")
        finally:
            os.unlink(filepath)


class TestXiaocenHandoffFlow(unittest.TestCase):
    def test_full_handoff_flow(self):
        review = MonteCarloReview()

        wa1 = review.add_wrong_answer(
            question_id="MC-001",
            student_answer=120.5,
            correct_answer=100.0,
            error_type="蒙特卡洛采样不足",
            unit="kPa",
            student_id="S2023101",
            original_statement="跑了一万次采样，均值120.5kPa",
            is_dirty=True,
            dirt_description="学生只写了一万次，未说明是否含burn-in",
            raw_data={"iterations": 10000, "burn_in": None},
        )

        wa2 = review.add_wrong_answer(
            question_id="MC-002",
            student_answer=0.95,
            correct_answer=0.90,
            error_type="置信区间误解",
            unit="无量纲",
            student_id="S2023102",
            original_statement="95%置信区间就是0.95",
        )

        review.change_weight(
            wrong_answer_id=wa1.id,
            param_name="采样次数权重",
            old_value=0.3,
            new_value=0.5,
            unit="无量纲",
            reason=WeightChangeReason.CALIBRATION.value,
            reason_detail="经三组对照实验确认采样不足时权重应提高",
            changed_by="小岑",
        )

        breach = review.check_extrapolation(
            wrong_answer_id=wa2.id,
            param_name="置信水平",
            extrapolated_value=0.95,
            boundary_low=0.80,
            boundary_high=0.90,
            unit="无量纲",
        )
        self.assertIsNotNone(breach)
        self.assertEqual(breach.original_statement, "95%置信区间就是0.95")

        review.add_calculation_step(
            description="蒙特卡洛误差估计",
            formula="σ_MC = s / √N",
            input_values={"s": 15.2, "N": 10000},
            output_value=0.152,
            unit_before="kPa",
            unit_after="kPa",
            boundary_low=0,
            boundary_high=1.0,
        )

        review.add_calculation_step(
            description="单位换算 kPa → Pa",
            formula="x_Pa = x_kPa × 1000",
            input_values={"x_kPa": 0.152},
            output_value=152.0,
            unit_before="kPa",
            unit_after="Pa",
            conversion_factor=1000,
        )

        review.resolve_breach(
            breach.id,
            "学生混淆了置信水平与置信区间宽度，已纠正",
            "小岑",
        )

        trace1 = review.trace_wrong_answer(wa1.id)
        self.assertEqual(trace1["wrong_answer"]["question_id"], "MC-001")
        self.assertTrue(trace1["wrong_answer"]["raw_source"]["is_dirty"])
        self.assertEqual(len(trace1["weight_changes"]), 1)
        self.assertEqual(trace1["weight_changes"][0]["changed_by"], "小岑")

        trace_by_statement = review.trace_from_original_statement("一万次采样")
        self.assertEqual(len(trace_by_statement), 1)
        self.assertEqual(trace_by_statement[0]["wrong_answer"]["question_id"], "MC-001")

        grouped = review.get_timeline_grouped()
        self.assertTrue(len(grouped[TimelineStatus.PROCESSED.value]) >= 3)
        self.assertTrue(len(grouped[TimelineStatus.PENDING.value]) == 0)

        comparison = review.get_comparison_view()
        self.assertIn("采样次数权重", comparison["weight_changes_by_param"])
        self.assertEqual(len(comparison["calculation_steps"]), 2)

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            filepath = f.name

        try:
            review.save(filepath)
            loaded = MonteCarloReview.load(filepath)
            trace_loaded = loaded.trace_wrong_answer(wa1.id)
            self.assertEqual(
                trace_loaded["wrong_answer"]["raw_source"]["original_statement"],
                "跑了一万次采样，均值120.5kPa",
            )
            loaded_grouped = loaded.get_timeline_grouped()
            self.assertTrue(len(loaded_grouped[TimelineStatus.MANUAL_OVERRIDE.value]) >= 0)
        finally:
            os.unlink(filepath)


if __name__ == "__main__":
    unittest.main()

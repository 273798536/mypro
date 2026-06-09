from typing import List
from datetime import datetime, timedelta

from .models import BoundarySample, StudentAnswer, StabilityVerdict


def build_boundary_samples() -> List[BoundarySample]:
    samples: List[BoundarySample] = []

    samples.append(BoundarySample(
        sample_id="good_stable_01",
        coefficients={"a0": 6.0, "a1": 5.0, "a2": 1.0},
        expected_verdict=StabilityVerdict.STABLE,
        is_bad_data=False,
        description="标准二阶稳定系统: s² + 5s + 6 = 0, 根 -2, -3",
    ))

    samples.append(BoundarySample(
        sample_id="good_unstable_01",
        coefficients={"a0": -6.0, "a1": 5.0, "a2": 1.0},
        expected_verdict=StabilityVerdict.UNSTABLE,
        is_bad_data=False,
        description="二阶不稳定系统: s² + 5s - 6 = 0, 根 -6, +1",
    ))

    samples.append(BoundarySample(
        sample_id="good_margin_01",
        coefficients={"a0": 6.0, "a1": 0.0, "a2": 1.0},
        expected_verdict=StabilityVerdict.UNKNOWN,
        is_bad_data=False,
        description="临界稳定（无阻尼振荡）: s² + 6 = 0, 虚根 ±j√6",
    ))

    samples.append(BoundarySample(
        sample_id="bad_zero_leading",
        coefficients={"a0": 6.0, "a1": 5.0, "a2": 0.0},
        expected_verdict=StabilityVerdict.INSUFFICIENT_DATA,
        is_bad_data=True,
        bad_data_type="zero_leading_coefficient",
        description="真实坏数据：学生抄错最高阶系数为零，实际是一阶系统",
    ))

    samples.append(BoundarySample(
        sample_id="bad_negative_damping",
        coefficients={"a0": 6.0, "a1": -5.0, "a2": 1.0},
        expected_verdict=StabilityVerdict.UNSTABLE,
        is_bad_data=True,
        bad_data_type="negative_damping",
        description="真实坏数据：学生把阻尼项符号写反了，常见抄写错误",
    ))

    samples.append(BoundarySample(
        sample_id="bad_missing_coeff",
        coefficients={"a1": 5.0, "a2": 1.0},
        expected_verdict=StabilityVerdict.STABLE,
        is_bad_data=True,
        bad_data_type="missing_parameter",
        description="真实坏数据：学生漏填 a0，需补录",
    ))

    samples.append(BoundarySample(
        sample_id="bad_almost_zero",
        coefficients={"a0": 6.0, "a1": 0.0001, "a2": 1.0},
        expected_verdict=StabilityVerdict.STABLE,
        is_bad_data=True,
        bad_data_type="near_margin_rounding",
        description="真实坏数据：学生四舍五入导致阻尼极接近零，接近稳定边界",
    ))

    samples.append(BoundarySample(
        sample_id="bad_mixed_signs",
        coefficients={"a0": 6.0, "a1": -3.0, "a2": 2.0, "a3": 1.0},
        expected_verdict=StabilityVerdict.UNSTABLE,
        is_bad_data=True,
        bad_data_type="mixed_signs_routh",
        description="真实坏数据：学生符号混乱，劳斯判据必要条件直接不满足",
    ))

    samples.append(BoundarySample(
        sample_id="bad_whitespace_value",
        coefficients={"a0": 6.0, "a1": 5.0, "a2": 1.0, "a3 ": 0.0},
        expected_verdict=StabilityVerdict.STABLE,
        is_bad_data=True,
        bad_data_type="whitespace_in_key",
        description="真实坏数据：参数名带空格（'a3 '），解析时容易被忽略",
    ))

    return samples


def build_late_student_answers() -> List[StudentAnswer]:
    base = datetime.now() - timedelta(hours=3)
    deadline = base + timedelta(hours=2)
    return [
        StudentAnswer(
            student_id="S001",
            problem_id="P_bad_missing_coeff",
            coefficients={"a1": 5.0, "a2": 1.0},
            answer_text="我认为特征方程是 s^2 + 5s = 0",
            is_wrong=True,
            submitted_at=deadline - timedelta(minutes=10),
            arrived_at=deadline - timedelta(minutes=9),
        ),
        StudentAnswer(
            student_id="S002",
            problem_id="P_bad_missing_coeff",
            coefficients={"a0": 6.0, "a1": 5.0, "a2": 1.0},
            answer_text="s^2 + 5s + 6",
            is_wrong=False,
            submitted_at=deadline + timedelta(minutes=30),
            arrived_at=deadline + timedelta(minutes=31),
            is_late=True,
        ),
        StudentAnswer(
            student_id="S003",
            problem_id="P_bad_negative_damping",
            coefficients={"a0": 6.0, "a1": -5.0, "a2": 1.0},
            answer_text="抄写时符号错了",
            is_wrong=True,
            submitted_at=deadline + timedelta(minutes=65),
            arrived_at=deadline + timedelta(minutes=66),
            is_late=True,
        ),
    ]

from __future__ import annotations

from .models import HistoricalAnswer, Material, Unit


def build_historical_answers() -> dict[str, HistoricalAnswer]:
    answers: dict[str, HistoricalAnswer] = {}

    raw_rows_a = [
        {"id": "M001", "name": "小学数学练习册", "expected": "小学数学练习册", "qty": 120, "unit": "本"},
        {"id": "M002", "name": "初中语文作业本", "expected": "初中语文作业本", "qty": 80, "unit": "本"},
        {"id": "M003", "name": "高中英语字帖", "expected": "高中英语同步字帖", "qty": 45, "unit": "本"},
        {"id": "M004", "name": "科学实验材料包", "expected": "科学实验材料包", "qty": 60, "unit": "套"},
        {"id": "M005", "name": "美术绘画工具", "expected": "美术绘画工具", "qty": 95, "unit": "套"},
    ]
    answers["现场案例A"] = HistoricalAnswer(
        answer_id="现场案例A",
        source_file="samples/现场案例A.csv",
        materials=[
            Material("M001", "小学数学练习册", "小学数学练习册", 120.0, Unit.COUNT, 2, raw_rows_a[0]),
            Material("M002", "初中语文作业本", "初中语文作业本", 80.0, Unit.COUNT, 3, raw_rows_a[1]),
            Material("M003", "高中英语字帖", "高中英语同步字帖", 45.0, Unit.COUNT, 4, raw_rows_a[2]),
            Material("M004", "科学实验材料包", "科学实验材料包", 60.0, Unit.COUNT, 5, raw_rows_a[3]),
            Material("M005", "美术绘画工具", "美术绘画工具", 95.0, Unit.COUNT, 6, raw_rows_a[4]),
        ],
        expected_window_count=3,
        raw_rows=raw_rows_a,
    )

    raw_rows_b = [
        {"id": "M101", "name": "语文答题卡", "expected": "语文答题卡", "qty": 300, "unit": "张"},
        {"id": "M102", "name": "数学答题卡", "expected": "数学答题卡", "qty": 300, "unit": "张"},
        {"id": "M103", "name": "英语答题卡", "expected": "英语答题卡", "qty": 280, "unit": "张"},
        {"id": "M104", "name": "草稿纸", "expected": "草稿纸", "qty": 500, "unit": "张"},
    ]
    answers["现场案例B（并列数量）"] = HistoricalAnswer(
        answer_id="现场案例B（并列数量）",
        source_file="samples/现场案例B.csv",
        materials=[
            Material("M101", "语文答题卡", "语文答题卡", 300.0, Unit.COUNT, 2, raw_rows_b[0]),
            Material("M102", "数学答题卡", "数学答题卡", 300.0, Unit.COUNT, 3, raw_rows_b[1]),
            Material("M103", "英语答题卡", "英语答题卡", 280.0, Unit.COUNT, 4, raw_rows_b[2]),
            Material("M104", "草稿纸", "草稿纸", 500.0, Unit.COUNT, 5, raw_rows_b[3]),
        ],
        expected_window_count=2,
        raw_rows=raw_rows_b,
    )

    answers["现场案例C（空集合）"] = HistoricalAnswer(
        answer_id="现场案例C（空集合）",
        source_file="samples/现场案例C.csv",
        materials=[],
        expected_window_count=1,
        raw_rows=[{"id": "", "name": "", "expected": "", "qty": "", "unit": ""}],
    )

    raw_rows_d = [
        {"id": "M201", "name": "小学口算题卡", "expected": "小学口算题卡", "qty": 55, "unit": "本"},
        {"id": "M202", "name": "初中奥数教程", "expected": "初中奥数教程", "qty": 40, "unit": "本"},
        {"id": "M203", "name": "高中复习指南", "expected": "高中复习指南", "qty": 25, "unit": "本"},
    ]
    answers["现场案例D（边界样本）"] = HistoricalAnswer(
        answer_id="现场案例D（边界样本）",
        source_file="samples/现场案例D.csv",
        materials=[
            Material("M201", "小学口算题卡", "小学口算题卡", 55.0, Unit.COUNT, 2, raw_rows_d[0]),
            Material("M202", "初中奥数教程", "初中奥数教程", 40.0, Unit.COUNT, 3, raw_rows_d[1]),
            Material("M203", "高中复习指南", "高中复习指南", 25.0, Unit.COUNT, 4, raw_rows_d[2]),
        ],
        expected_window_count=2,
        raw_rows=raw_rows_d,
    )

    return answers

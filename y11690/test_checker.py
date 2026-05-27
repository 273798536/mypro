"""测试脚本 - 验证矩阵分块乘法校验工具功能"""

import sys
import traceback
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from matrix_checker.parser import MatrixParser, MatrixParseError
from matrix_checker.block_tracker import BlockTracker
from matrix_checker.error_analyzer import ErrorAnalyzer
from matrix_checker.reporter import ReportGenerator


def test_matrix_parser():
    """测试矩阵解析器"""
    print("=" * 60)
    print("测试1: 矩阵解析器")
    print("=" * 60)

    A = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]], dtype=float)
    B = np.array([[9, 8, 7], [6, 5, 4], [3, 2, 1]], dtype=float)

    test_dir = Path("./test_data")
    test_dir.mkdir(exist_ok=True)

    np.savetxt(str(test_dir / "A.txt"), A, fmt="%.1f")
    np.savetxt(str(test_dir / "B.txt"), B, fmt="%.1f")

    matrix_a, meta_a = MatrixParser.parse_file(str(test_dir / "A.txt"))
    print(f"  ✓ 矩阵A加载: {matrix_a.shape}")
    assert matrix_a.shape == (3, 3), f"Expected (3,3), got {matrix_a.shape}"

    matrix_b, meta_b = MatrixParser.parse_file(str(test_dir / "B.txt"))
    print(f"  ✓ 矩阵B加载: {matrix_b.shape}")
    assert matrix_b.shape == (3, 3), f"Expected (3,3), got {matrix_b.shape}"

    csv_content = "1,2,3\n4,5,6\n7,8,9"
    matrix_c, _ = MatrixParser.parse_string(csv_content, fmt='csv')
    print(f"  ✓ CSV解析: {matrix_c.shape}")
    assert matrix_c.shape == (3, 3)

    print("  ✓ 矩阵解析测试通过!\n")


def test_dimension_validation():
    """测试维度验证"""
    print("=" * 60)
    print("测试2: 维度验证")
    print("=" * 60)

    issues = MatrixParser.validate_dimensions((6, 4), (4, 6), 2)
    assert len(issues['errors']) == 0, "应无错误"
    print("  ✓ 6x4 @ 4x6, block=2: 无错误")

    issues = MatrixParser.validate_dimensions((6, 5), (4, 6), 2)
    assert len(issues['errors']) > 0, "应有维度不匹配错误"
    print(f"  ✓ 6x5 @ 4x6, block=2: {issues['errors'][0]}")

    issues = MatrixParser.validate_dimensions((6, 5), (5, 6), 2)
    assert len(issues['warnings']) > 0, "应有不整除警告"
    print(f"  ✓ 6x5 @ 5x6, block=2: {issues['warnings'][0]}")

    print("  ✓ 维度验证测试通过!\n")


def test_block_tracker():
    """测试分块追踪器"""
    print("=" * 60)
    print("测试3: 分块追踪器")
    print("=" * 60)

    np.random.seed(42)
    A = np.random.rand(6, 6)
    B = np.random.rand(6, 6)

    tracker = BlockTracker(A, B, 2)
    print(f"  ✓ 追踪器初始化: A({tracker.a_rows}x{tracker.a_cols}), "
          f"B({tracker.b_rows}x{tracker.b_cols})")
    print(f"    分块网格: {tracker.a_blocks_row}x{tracker.b_blocks_col}")

    assert tracker.a_blocks_row == 3
    assert tracker.b_blocks_col == 3
    assert len(tracker.block_results) == 9

    C_standard = A @ B

    max_error = 0
    for (i, j), block_result in tracker.block_results.items():
        expected = block_result.expected
        row_start = i * 2
        row_end = min(row_start + 2, 6)
        col_start = j * 2
        col_end = min(col_start + 2, 6)
        actual = C_standard[row_start:row_end, col_start:col_end]
        error = np.max(np.abs(expected - actual))
        max_error = max(max_error, error)

    print(f"  ✓ 标准分块计算正确,最大误差: {max_error:.2e}")
    assert max_error < 1e-14

    steps = [
        {'a_block_row': 0, 'a_block_col': 0, 'b_block_row': 0, 'b_block_col': 0,
         'a_rows': 2, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2, 'line_number': 1},
        {'a_block_row': 0, 'a_block_col': 1, 'b_block_row': 1, 'b_block_col': 0,
         'a_rows': 2, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2, 'line_number': 2},
        {'a_block_row': 0, 'a_block_col': 2, 'b_block_row': 2, 'b_block_col': 0,
         'a_rows': 2, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2, 'line_number': 3},
    ]

    for step in steps:
        record = tracker.validate_step(step)
        tracker.steps.append(record)
        if record.is_valid:
            tracker.apply_step(record)

    tracker.compute_final_status()

    block_00 = tracker.block_results[(0, 0)]
    print(f"  ✓ C(0,0)状态: {block_00.status}, 误差: {block_00.error:.2e}")
    assert block_00.status == 'correct'

    block_01 = tracker.block_results[(0, 1)]
    print(f"  ✓ C(0,1)状态: {block_01.status} (应为skipped)")
    assert block_01.status == 'skipped'

    all_skips = tracker.get_all_skips()
    print(f"  ✓ 跳过检查: {len(all_skips)}个分块有步骤遗漏")
    assert (0, 1) in all_skips

    print("  ✓ 分块追踪器测试通过!\n")


def test_error_analyzer():
    """测试误差分析器"""
    print("=" * 60)
    print("测试4: 误差分析器")
    print("=" * 60)

    np.random.seed(42)
    A = np.random.rand(6, 6)
    B = np.random.rand(6, 6)

    tracker = BlockTracker(A, B, 2)

    partial_steps = [
        {'a_block_row': 0, 'a_block_col': 0, 'b_block_row': 0, 'b_block_col': 0,
         'a_rows': 2, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2, 'line_number': 1},
    ]

    for step in partial_steps:
        record = tracker.validate_step(step)
        tracker.steps.append(record)
        if record.is_valid:
            tracker.apply_step(record)

    tracker.compute_final_status()

    analyzer = ErrorAnalyzer(tracker, 1e-6)
    categories = analyzer.analyze()
    suggestions = analyzer.generate_suggestions()

    print(f"  ✓ 错误分类数: {len(categories)}")
    for cat in categories:
        print(f"    [{cat.severity}] {cat.message}")

    print(f"  ✓ 修正建议数: {len(suggestions)}")
    for sug in suggestions:
        print(f"    C{sug.block_idx}: {sug.suggested_fix}")

    assert len(categories) > 0, "应有错误分类"
    assert len(suggestions) > 0, "应有修正建议"

    print("  ✓ 误差分析器测试通过!\n")


def test_report_generator():
    """测试报告生成器"""
    print("=" * 60)
    print("测试5: 报告生成器")
    print("=" * 60)

    np.random.seed(42)
    A = np.random.rand(6, 6)
    B = np.random.rand(6, 6)

    tracker = BlockTracker(A, B, 2)
    analyzer = ErrorAnalyzer(tracker, 1e-6)

    metadata = {
        'source_file': 'test_steps.txt',
        'student_name': '测试学生',
        'assignment': '作业1'
    }

    reporter = ReportGenerator(tracker, analyzer, metadata)
    report = reporter.generate()

    assert 'unprocessed' in report
    assert 'corrected' in report
    assert 'needs_review' in report

    print(f"  ✓ 报告结构完整")
    print(f"    - 未处理: {len(report['unprocessed'])}个分块")
    print(f"    - 已修正: {len(report['corrected'])}个分块")
    print(f"    - 需人工确认: {len(report['needs_review'])}个分块")

    summary = report['summary']
    print(f"    - 完成率: {summary['completion_rate']['percentage']}%")
    print(f"    - 分块状态: {summary['status_counts']}")

    assert report['metadata']['student_name'] == '测试学生'
    print(f"  ✓ 元数据正确")

    report_dir = Path("./test_report")
    report_dir.mkdir(exist_ok=True)

    reporter.export_json(str(report_dir / "test_report.json"))
    print(f"  ✓ JSON报告已导出")

    reporter.export_text(str(report_dir / "test_report.txt"))
    print(f"  ✓ 文本报告已导出")

    reporter.export_html(str(report_dir / "test_report.html"))
    print(f"  ✓ HTML报告已导出")

    print("  ✓ 报告生成器测试通过!\n")


def test_step_validation():
    """测试步骤验证"""
    print("=" * 60)
    print("测试6: 步骤验证(边界情况)")
    print("=" * 60)

    A = np.ones((6, 6))
    B = np.ones((6, 6))
    tracker = BlockTracker(A, B, 2)

    invalid_step = {
        'a_block_row': 5, 'a_block_col': 0,
        'b_block_row': 0, 'b_block_col': 0,
        'a_rows': 2, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2,
        'line_number': 1
    }
    record = tracker.validate_step(invalid_step)
    print(f"  ✓ 索引越界检测: {record.issues[0]}")
    assert not record.is_valid

    dim_mismatch_step = {
        'a_block_row': 0, 'a_block_col': 0,
        'b_block_row': 1, 'b_block_col': 0,
        'a_rows': 2, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2,
        'line_number': 2
    }
    record = tracker.validate_step(dim_mismatch_step)
    print(f"  ✓ 维度不匹配检测: {record.issues[0]}")
    assert not record.is_valid

    shape_mismatch_step = {
        'a_block_row': 0, 'a_block_col': 0,
        'b_block_row': 0, 'b_block_col': 0,
        'a_rows': 3, 'a_cols': 2, 'b_rows': 2, 'b_cols': 2,
        'line_number': 3
    }
    record = tracker.validate_step(shape_mismatch_step)
    print(f"  ✓ 形状不匹配检测: {record.issues[0]}")
    assert not record.is_valid

    print("  ✓ 步骤验证测试通过!\n")


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("  矩阵分块乘法校验工具 - 完整测试")
    print("=" * 60 + "\n")

    tests = [
        ("矩阵解析器", test_matrix_parser),
        ("维度验证", test_dimension_validation),
        ("分块追踪器", test_block_tracker),
        ("误差分析器", test_error_analyzer),
        ("报告生成器", test_report_generator),
        ("步骤验证(边界)", test_step_validation),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"\n  ✗ 测试失败: {name}")
            print(f"    错误: {e}")
            traceback.print_exc()
            print()

    print("=" * 60)
    print(f"  测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)

    return failed == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

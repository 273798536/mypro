"""集成测试 - 测试完整处理流程"""

import os
import json
import tempfile
import pytest
from geometry_optics.io.parser import InputParser
from geometry_optics.analysis.engine import OpticsProcessor
from geometry_optics.io.exporter import ResultExporter
from geometry_optics.core.models import ResultStatus, IntersectionType


EXAMPLES_DIR = os.path.join(os.path.dirname(__file__), '..', 'examples')


class TestEndToEndProcessing:
    def test_normal_case(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_normal.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.problem_id == "MIRROR-001"
        assert result.status == ResultStatus.SUCCESS
        assert len(result.ray_results) == 1
        assert result.ray_results[0].status == ResultStatus.SUCCESS
        assert result.ray_results[0].intersection is not None
        assert result.ray_results[0].intersection.intersection_type == IntersectionType.VALID
        assert result.ray_results[0].reflection is not None
        assert result.total_score == result.max_score

    def test_parallel_case(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_parallel.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.status == ResultStatus.ERROR
        assert len(result.ray_results) == 1
        assert result.ray_results[0].intersection.intersection_type == IntersectionType.PARALLEL
        assert any("平行" in w for w in result.ray_results[0].warnings)
        assert result.total_score < result.max_score

    def test_extension_case(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_extension.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.status == ResultStatus.WARNING
        assert len(result.ray_results) == 2
        for rr in result.ray_results:
            assert rr.intersection.intersection_type == IntersectionType.ON_EXTENSION
            assert rr.reflection is None
            assert any("延长线" in e for e in rr.explanations)

    def test_angle_unit_detection(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_angle_unit.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        assert len(parser.warnings) > 0
        angle_warnings = [w for w in parser.warnings if "角度" in w or "弧度" in w]
        assert len(angle_warnings) > 0

    def test_out_of_bounds_case(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_out_of_bounds.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.status in [ResultStatus.WARNING, ResultStatus.SUCCESS]
        assert len(result.ray_results) == 2

    def test_behind_ray_case(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_behind_ray.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.status == ResultStatus.ERROR
        assert len(result.ray_results) == 2

        r1 = result.ray_results[0]
        assert r1.intersection.intersection_type == IntersectionType.BEHIND_RAY
        assert any("后方" in w for w in r1.warnings)

        r2 = result.ray_results[1]
        assert r2.intersection.intersection_type == IntersectionType.VALID

    def test_multiple_mirrors(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_multiple_mirrors.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert len(result.ray_results) == 4
        assert result.problem_id == "MIRROR-007-MULTI"

    def test_coincident_case(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_coincident.json')
        parser = InputParser(auto_correct=True)
        problem = parser.parse_file(filepath)

        processor = OpticsProcessor()
        result = processor.process(problem)

        assert len(result.ray_results) == 1
        assert result.ray_results[0].intersection.intersection_type == IntersectionType.COINCIDENT
        assert any("共线" in w for w in result.ray_results[0].warnings)
        assert result.ray_results[0].reflection is None


class TestExport:
    def test_text_export(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_normal.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        text = ResultExporter.to_text_string(result)
        assert "几何光路求交计算报告" in text
        assert "MIRROR-001" in text
        assert "入射角" in text
        assert "反射角" in text

    def test_json_export(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_normal.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        json_str = ResultExporter.to_json_string(result)
        data = json.loads(json_str)

        assert data["problem_id"] == "MIRROR-001"
        assert "ray_results" in data
        assert len(data["ray_results"]) == 1

    def test_json_file_export(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_normal.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name

        try:
            ResultExporter.to_json(result, temp_path)
            assert os.path.exists(temp_path)
            with open(temp_path, 'r') as f:
                data = json.load(f)
            assert data["problem_id"] == "MIRROR-001"
        finally:
            os.unlink(temp_path)

    def test_csv_export(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_normal.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            temp_path = f.name

        try:
            ResultExporter.to_csv(result, temp_path)
            assert os.path.exists(temp_path)
            with open(temp_path, 'r', encoding='utf-8-sig') as f:
                content = f.read()
            assert "题目编号" in content
            assert "入射角" in content
        finally:
            os.unlink(temp_path)


class TestScoreCalculation:
    def test_perfect_score(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_normal.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.total_score == result.max_score
        assert result.max_score == 1.0

    def test_deductions(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_parallel.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        assert result.total_score < result.max_score
        assert result.total_score == 0.0

        deductions = result.ray_results[0].score_deductions
        assert len(deductions) > 0
        assert any(d[0] == "parallel" for d in deductions)

    def test_extension_deductions(self):
        filepath = os.path.join(EXAMPLES_DIR, 'problem_extension.json')
        parser = InputParser()
        problem = parser.parse_file(filepath)
        processor = OpticsProcessor()
        result = processor.process(problem)

        for rr in result.ray_results:
            deductions = rr.score_deductions
            assert any(d[0] == "extension_intersection" for d in deductions)
            total_deduct = sum(d[1] for d in deductions)
            assert abs(total_deduct - 0.5) < 1e-9

import unittest

from motor_torque_report.models import (
    BASE_UNIT,
    AnomalyType,
    Direction,
    ExperimentalRecord,
    FilterCriteria,
    JudgmentAction,
)
from motor_torque_report.parser import (
    convert_torque,
    detect_unit_magnitude_shift,
    normalize_unit,
    parse_record,
)
from motor_torque_report.anomaly import (
    detect_direction_reversed,
    detect_late_attachment_anomalies,
    run_all_anomaly_checks,
)
from motor_torque_report.engine import (
    apply_filter,
    build_detail_table,
    compute_statistics,
)
from motor_torque_report.audit import AuditTrail
from motor_torque_report.recalc import recalc_with_parameter_change
from motor_torque_report.exporter import MotorTorqueReportExporter
from motor_torque_report.report import classify_actionable_items, generate_report


SAMPLE_RECORDS = [
    {
        "record_id": "REC-001",
        "motor_id": "M-100",
        "test_date": "2025-06-01",
        "direction": "CW",
        "torque_raw": 2.5,
        "torque_unit": "N·m",
        "rpm": 3000,
        "temperature": 25.0,
        "attachment_file": "rec001.csv",
        "is_late_attachment": False,
        "operator": "小宋",
    },
    {
        "record_id": "REC-002",
        "motor_id": "M-100",
        "test_date": "2025-06-01",
        "direction": "CCW",
        "torque_raw": -2.3,
        "torque_unit": "N·m",
        "rpm": 3000,
        "temperature": 25.0,
        "attachment_file": "rec002.csv",
        "is_late_attachment": False,
        "operator": "小宋",
    },
    {
        "record_id": "REC-003",
        "motor_id": "M-100",
        "test_date": "2025-06-02",
        "direction": "CCW",
        "torque_raw": 2.1,
        "torque_unit": "N·m",
        "rpm": 3000,
        "temperature": 26.0,
        "attachment_file": None,
        "is_late_attachment": False,
        "operator": "小宋",
    },
    {
        "record_id": "REC-004",
        "motor_id": "M-101",
        "test_date": "2025-06-02",
        "direction": "CW",
        "torque_raw": 1.8,
        "torque_unit": "mN·m",
        "rpm": 5000,
        "temperature": 24.0,
        "attachment_file": "rec004_late.csv",
        "is_late_attachment": True,
        "operator": "小李",
    },
    {
        "record_id": "REC-005",
        "motor_id": "M-101",
        "test_date": "2025-06-03",
        "direction": "CW",
        "torque_raw": 2.6,
        "torque_unit": "N·m",
        "rpm": 5000,
        "temperature": 24.0,
        "attachment_file": "rec005.csv",
        "is_late_attachment": False,
        "operator": "小李",
    },
    {
        "record_id": "REC-006",
        "motor_id": "M-102",
        "test_date": "2025-06-03",
        "direction": "CW",
        "torque_raw": 3.0,
        "torque_unit": "N·m",
        "rpm": 4000,
        "temperature": 23.0,
        "attachment_file": "rec006.csv",
        "is_late_attachment": False,
        "operator": "小宋",
    },
    {
        "record_id": "REC-007",
        "motor_id": "M-102",
        "test_date": "2025-06-04",
        "direction": "CCW",
        "torque_raw": -2.8,
        "torque_unit": "N·m",
        "rpm": 4000,
        "temperature": 23.0,
        "attachment_file": "rec007.csv",
        "is_late_attachment": False,
        "operator": "小宋",
    },
]


class TestUnitConversion(unittest.TestCase):
    def test_normalize_standard_units(self):
        self.assertEqual(normalize_unit("N·m"), "N·m")
        self.assertEqual(normalize_unit("Nm"), "N·m")
        self.assertEqual(normalize_unit("mN·m"), "mN·m")
        self.assertEqual(normalize_unit("mNm"), "mN·m")
        self.assertEqual(normalize_unit("kN·m"), "kN·m")
        self.assertEqual(normalize_unit("kgf·cm"), "kgf·cm")

    def test_normalize_case_insensitive(self):
        self.assertEqual(normalize_unit("nm"), "N·m")
        self.assertEqual(normalize_unit("mnm"), "mN·m")

    def test_normalize_unknown_unit_raises(self):
        with self.assertRaises(ValueError):
            normalize_unit("ft·lb")

    def test_convert_same_unit(self):
        self.assertAlmostEqual(convert_torque(1.0, "N·m", "N·m"), 1.0)

    def test_convert_mNm_to_Nm(self):
        self.assertAlmostEqual(convert_torque(1000.0, "mN·m", "N·m"), 1.0, places=5)

    def test_convert_kNm_to_Nm(self):
        self.assertAlmostEqual(convert_torque(1.0, "kN·m", "N·m"), 1000.0)

    def test_convert_kgfcm_to_Nm(self):
        self.assertAlmostEqual(convert_torque(1.0, "kgf·cm", "N·m"), 0.0980665, places=6)

    def test_convert_cross_units(self):
        val = convert_torque(1.0, "kN·m", "mN·m")
        self.assertAlmostEqual(val, 1_000_000.0, places=0)


class TestDirectionParsing(unittest.TestCase):
    def test_cw_variants(self):
        self.assertEqual(Direction.from_str("CW"), Direction.CW)
        self.assertEqual(Direction.from_str("cw"), Direction.CW)
        self.assertEqual(Direction.from_str("顺时针"), Direction.CW)
        self.assertEqual(Direction.from_str("正转"), Direction.CW)

    def test_ccw_variants(self):
        self.assertEqual(Direction.from_str("CCW"), Direction.CCW)
        self.assertEqual(Direction.from_str("逆时针"), Direction.CCW)

    def test_unknown_direction_raises(self):
        with self.assertRaises(ValueError):
            Direction.from_str("左右")

    def test_opposite(self):
        self.assertEqual(Direction.CW.opposite(), Direction.CCW)
        self.assertEqual(Direction.CCW.opposite(), Direction.CW)


class TestRecordParsing(unittest.TestCase):
    def test_parse_basic_record(self):
        raw = SAMPLE_RECORDS[0]
        rec = parse_record(raw)
        self.assertEqual(rec.record_id, "REC-001")
        self.assertEqual(rec.motor_id, "M-100")
        self.assertEqual(rec.direction, Direction.CW)
        self.assertAlmostEqual(rec.torque_raw, 2.5)
        self.assertEqual(rec.torque_unit, "N·m")
        self.assertFalse(rec.is_late_attachment)

    def test_parse_late_attachment(self):
        raw = SAMPLE_RECORDS[3]
        rec = parse_record(raw)
        self.assertTrue(rec.is_late_attachment)
        self.assertEqual(rec.attachment_file, "rec004_late.csv")

    def test_parse_mixed_unit(self):
        raw = SAMPLE_RECORDS[3]
        rec = parse_record(raw)
        self.assertEqual(rec.torque_unit, "mN·m")
        self.assertAlmostEqual(rec.torque_in_base_unit(), 0.001 * 1.8, places=8)

    def test_torque_base_unit_conversion(self):
        raw = dict(SAMPLE_RECORDS[0], torque_raw=1.0, torque_unit="kN·m")
        rec = parse_record(raw)
        self.assertAlmostEqual(rec.torque_in_base_unit(), 1000.0)


class TestUnitMagnitudeShift(unittest.TestCase):
    def test_detect_magnitude_shift(self):
        records = [
            parse_record(SAMPLE_RECORDS[4]),
            parse_record(SAMPLE_RECORDS[3]),
        ]
        shifts = detect_unit_magnitude_shift(records)
        self.assertTrue(len(shifts) > 0)
        self.assertIn("数量级", shifts[0]["description"])


class TestAnomalyDetection(unittest.TestCase):
    def test_direction_reversed_detection(self):
        rec = parse_record({
            "record_id": "REC-DR",
            "motor_id": "M-100",
            "test_date": "2025-06-01",
            "direction": "CCW",
            "torque_raw": 2.5,
            "torque_unit": "N·m",
        })
        anomalies = detect_direction_reversed([rec], torque_positive_means_cw=True)
        self.assertEqual(len(anomalies), 1)
        self.assertEqual(anomalies[0].anomaly_type, AnomalyType.DIRECTION_REVERSED)
        self.assertIn("REC-DR", anomalies[0].description)

    def test_direction_correct_no_anomaly(self):
        rec = parse_record({
            "record_id": "REC-OK",
            "motor_id": "M-100",
            "test_date": "2025-06-01",
            "direction": "CW",
            "torque_raw": 2.5,
            "torque_unit": "N·m",
        })
        anomalies = detect_direction_reversed([rec], torque_positive_means_cw=True)
        self.assertEqual(len(anomalies), 0)

    def test_late_attachment_anomaly(self):
        rec = parse_record(SAMPLE_RECORDS[3])
        anomalies = detect_late_attachment_anomalies([rec])
        late = [a for a in anomalies if a.anomaly_type == AnomalyType.LATE_ATTACHMENT]
        self.assertEqual(len(late), 1)

    def test_run_all_checks(self):
        records = [parse_record(r) for r in SAMPLE_RECORDS]
        anomalies = run_all_anomaly_checks(records)
        types = {a.anomaly_type for a in anomalies}
        self.assertIn(AnomalyType.DIRECTION_REVERSED, types)
        self.assertIn(AnomalyType.LATE_ATTACHMENT, types)
        self.assertIn(AnomalyType.UNIT_MAGNITUDE_SHIFT, types)


class TestFilterAndStatistics(unittest.TestCase):
    def setUp(self):
        self.records = [parse_record(r) for r in SAMPLE_RECORDS]

    def test_filter_by_motor_id(self):
        criteria = FilterCriteria(motor_ids=["M-100"])
        result = apply_filter(self.records, criteria)
        self.assertTrue(all(r.motor_id == "M-100" for r in result))

    def test_filter_exclude_late(self):
        criteria = FilterCriteria(include_late_attachments=False)
        result = apply_filter(self.records, criteria)
        self.assertFalse(any(r.is_late_attachment for r in result))

    def test_filter_by_direction(self):
        criteria = FilterCriteria(directions=[Direction.CW])
        result = apply_filter(self.records, criteria)
        self.assertTrue(all(r.direction == Direction.CW for r in result))

    def test_compute_statistics(self):
        stats = compute_statistics(self.records, output_unit=BASE_UNIT)
        self.assertTrue(len(stats) > 0)
        for s in stats:
            self.assertGreater(s.count, 0)
            self.assertIsNotNone(s.mean)

    def test_detail_table(self):
        table = build_detail_table(self.records, output_unit=BASE_UNIT)
        self.assertEqual(len(table), len(self.records))
        for row in table:
            self.assertIn(f"torque_{BASE_UNIT}", row)


class TestAuditTrail(unittest.TestCase):
    def test_record_direction_fix(self):
        audit = AuditTrail()
        audit.record_direction_fix(
            operator="小宋",
            record_id="REC-003",
            old_direction="CCW",
            new_direction="CW",
            reason="确认方向写反",
        )
        entries = audit.entries
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].action, JudgmentAction.CORRECT_DIRECTION)
        self.assertEqual(entries[0].operator, "小宋")

    def test_record_release(self):
        audit = AuditTrail()
        audit.record_release("小宋", "REC-004", "晚到数据经确认可放行")
        entries = audit.entries
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].action, JudgmentAction.OVERRIDE_RELEASE)

    def test_entries_for_record(self):
        audit = AuditTrail()
        audit.record_release("小宋", "REC-001", "放行")
        audit.record_release("小宋", "REC-002", "放行")
        audit.record_supplement_request("小宋", "REC-001", "需补附件")
        result = audit.entries_for_record("REC-001")
        self.assertEqual(len(result), 2)

    def test_to_dict_list(self):
        audit = AuditTrail()
        audit.record_direction_fix("小宋", "REC-003", "CCW", "CW", "修正")
        dicts = audit.to_dict_list()
        self.assertEqual(len(dicts), 1)
        self.assertIn("timestamp", dicts[0])
        self.assertEqual(dicts[0]["action"], "修正方向")


class TestRecalculation(unittest.TestCase):
    def test_recalc_boundary_sigma(self):
        records = [parse_record(r) for r in SAMPLE_RECORDS]
        _, impacts, _, stats_after, judgment = recalc_with_parameter_change(
            records=records,
            parameter_name="boundary_sigma",
            old_value=1.5,
            new_value=2.0,
            operator="小宋",
            output_unit=BASE_UNIT,
        )
        self.assertTrue(len(impacts) > 0)
        self.assertIn("boundary_sigma", impacts[0].formula)

    def test_recalc_direction_correction(self):
        records = [parse_record(r) for r in SAMPLE_RECORDS]
        _, impacts, _, _, judgment = recalc_with_parameter_change(
            records=records,
            parameter_name="direction_correction",
            old_value="CCW",
            new_value=["REC-003"],
            operator="小宋",
            output_unit=BASE_UNIT,
        )
        self.assertIsNotNone(judgment)
        self.assertEqual(judgment.operator, "小宋")

    def test_recalc_torque_override(self):
        records = [parse_record(r) for r in SAMPLE_RECORDS]
        _, impacts, _, _, _ = recalc_with_parameter_change(
            records=records,
            parameter_name="torque_override",
            old_value=None,
            new_value={"REC-001": 3.0},
            operator="小宋",
        )
        self.assertTrue(len(impacts) > 0)


class TestExporterEndToEnd(unittest.TestCase):
    def test_full_workflow(self):
        exporter = MotorTorqueReportExporter(operator="小宋", output_unit=BASE_UNIT)
        exporter.load_records(SAMPLE_RECORDS)

        anomalies = exporter.check_anomalies()
        direction_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.DIRECTION_REVERSED]
        self.assertTrue(len(direction_anomalies) > 0)

        exporter.fix_direction("REC-003", reason="经复核确认方向写反")

        exporter.release_record("REC-004", reason="晚到附件数据经确认与实验一致，可放行")

        exporter.request_supplement("REC-003", reason="缺少附件，需补充原始数据文件")

        md = exporter.export_markdown()
        self.assertIn("电机扭矩报告", md)
        self.assertIn("REC-003", md)
        self.assertIn("方向符号写反", md)
        self.assertIn("判断历史记录", md)
        self.assertIn("小宋", md)
        self.assertIn("可操作清单", md)
        self.assertIn("需要补料", md)

    def test_recalc_and_impact_report(self):
        exporter = MotorTorqueReportExporter(operator="小宋")
        exporter.load_records(SAMPLE_RECORDS)
        exporter.check_anomalies()

        exporter.recalculate(
            parameter_name="boundary_sigma",
            old_value=1.5,
            new_value=2.0,
        )

        md = exporter.export_markdown()
        self.assertIn("参数调档影响分析", md)
        self.assertIn("boundary_sigma", md)
        self.assertIn("公式/换算", md)

    def test_filter_criteria_in_report(self):
        exporter = MotorTorqueReportExporter(operator="小宋")
        exporter.load_records(SAMPLE_RECORDS)
        exporter.check_anomalies()

        criteria = FilterCriteria(motor_ids=["M-100"])
        md = exporter.export_markdown(filter_criteria=criteria)
        self.assertIn("M-100", md)
        self.assertIn("筛选条件", md)

    def test_classify_actionable_items(self):
        from motor_torque_report.models import Anomaly
        anomalies = [
            Anomaly(
                anomaly_type=AnomalyType.DIRECTION_REVERSED,
                record_id="REC-003",
                description="方向写反",
                suggested_action="修正方向",
            ),
            Anomaly(
                anomaly_type=AnomalyType.LATE_ATTACHMENT,
                record_id="REC-004",
                description="晚到附件",
                suggested_action="确认后放行",
            ),
        ]
        supplement, release = classify_actionable_items(anomalies, 7)
        self.assertTrue(len(supplement) > 0)
        self.assertTrue(any("REC-003" in s for s in supplement))

    def test_empty_records(self):
        exporter = MotorTorqueReportExporter(operator="小宋")
        exporter.load_records([])
        md = exporter.export_markdown()
        self.assertIn("电机扭矩报告", md)
        self.assertIn("无统计", md)


if __name__ == "__main__":
    unittest.main()

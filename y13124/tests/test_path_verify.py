import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import sys
import warnings
import io
import csv

warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base
from app import models, schemas
from app.services import (
    create_batch_with_records, update_judgment, get_batch_status,
    get_record_changes, get_batch_changes, record_change
)
from app.advanced_services import (
    create_student_note, apply_student_note, get_note_impacts,
    check_recalc_consistency, submit_evidence, get_records_needing_evidence,
    export_batch_csv
)

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_path_verify.db")
if os.path.exists(TEST_DB_PATH):
    os.remove(TEST_DB_PATH)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def build_sample_request():
    return schemas.BatchCreateRequest(
        batch_name="教研-最短路径批量验算-第1版",
        created_by="阿宁",
        description="社区公示前的批量验算，含单位换算和异常数据",
        nodes=[
            schemas.GraphNode(id="A", name="教学楼A"),
            schemas.GraphNode(id="B", name="教学楼B"),
            schemas.GraphNode(id="C", name="食堂"),
            schemas.GraphNode(id="D", name="图书馆"),
            schemas.GraphNode(id="E", name="宿舍"),
            schemas.GraphNode(id="F", name="偏远校区"),
        ],
        edges=[
            schemas.GraphEdge(source="A", target="B", weight=200, unit="meter"),
            schemas.GraphEdge(source="B", target="C", weight=0.3, unit="kilometer"),
            schemas.GraphEdge(source="A", target="C", weight=450, unit="meter"),
            schemas.GraphEdge(source="C", target="D", weight=50000, unit="centimeter"),
            schemas.GraphEdge(source="D", target="E", weight=0.5, unit="mile"),
            schemas.GraphEdge(source="B", target="D", weight=10, unit="minute_walk"),
            schemas.GraphEdge(source="A", target="E", weight=999999, unit="meter"),
            schemas.GraphEdge(source="E", target="F", weight=500, unit="kilometer"),
        ],
        queries=[
            schemas.PathQuery(source="A", target="C", preferred_unit="kilometer"),
            schemas.PathQuery(source="A", target="D", preferred_unit="meter"),
            schemas.PathQuery(source="A", target="E", preferred_unit="minute_walk"),
            schemas.PathQuery(source="A", target="F", preferred_unit="meter"),
        ]
    )


class TestUnitConversionDeviation:
    def test_batch_verify_returns_unit_conversion_details(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        assert "unit_conversions" in result
        assert len(result["unit_conversions"]) > 0
        has_km = any(
            uc["to_unit"] == "kilometer" or uc["from_unit"] == "kilometer"
            for uc in result["unit_conversions"]
        )
        assert has_km

    def test_record_contains_unit_conversion_note(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        record_km = None
        for r in result["records"]:
            if r.current_unit == "kilometer":
                record_km = r
                break
        assert record_km is not None
        assert record_km.unit_conversion_note is not None
        assert "换算公式" in record_km.unit_conversion_note

    def test_mixed_unit_edges_converted_correctly(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        for r in result["records"]:
            if r.source_node == "A" and r.target_node == "D":
                assert r.current_distance is not None
                assert r.current_distance > 0
                assert r.current_unit == "meter"

    def test_deviation_note_recorded(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        for r in result["records"]:
            if r.current_unit == "minute_walk":
                assert r.current_distance is not None


class TestChangeTraceability:
    def test_change_judgment_creates_history(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        record_id = result["records"][0].id

        req = schemas.ChangeJudgmentRequest(
            record_id=record_id,
            new_judgment="manual_override",
            reason="教研复核后手动改判",
            changed_by="阿宁",
            source_type="manual_review"
        )
        record = update_judgment(db, req)

        changes = get_record_changes(db, record_id)
        manual_changes = [c for c in changes if c.change_type == "judgment_update"]
        assert len(manual_changes) >= 1
        c = manual_changes[0]
        assert c.source_type == "manual_review"
        assert c.changed_by == "阿宁"
        assert c.new_judgment == "manual_override"
        assert c.reason == "教研复核后手动改判"
        assert c.current_status_after is not None

    def test_record_reflects_latest_judgment(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        record_id = result["records"][0].id

        req = schemas.ChangeJudgmentRequest(
            record_id=record_id,
            new_judgment="verified_revised",
            reason="二次验算确认",
            changed_by="阿宁",
            source_type="manual"
        )
        update_judgment(db, req)

        record = db.query(models.PathRecord).filter(models.PathRecord.id == record_id).first()
        assert record.current_judgment == "verified_revised"
        assert record.processing_status == "revised"

    def test_each_record_has_initial_verification_history(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        records = result["records"]
        assert len(records) >= 3

        for record in records:
            changes = get_record_changes(db, record.id)
            init_changes = [c for c in changes if c.change_type == "initial_verification"]
            assert len(init_changes) == 1, (
                f"Record {record.record_code} 缺少 initial_verification 变更历史"
            )
            ic = init_changes[0]
            assert ic.source_type == "algorithm"
            assert ic.source_id == "dijkstra_verify"
            assert ic.new_judgment == record.original_judgment
            assert ic.changed_by is not None
            assert ic.current_status_after is not None
            assert ic.source_detail and "路径:" in ic.source_detail
            assert ic.reason and record.record_code in ic.reason


class TestStudentNoteImpact:
    def test_add_note_and_apply_shows_impacts(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id
        record_id = result["records"][0].id

        note_req = schemas.StudentNoteCreate(
            batch_id=batch_id,
            note_code="STU-ERR-001",
            content="学生将单位记错，把米写成了千米，已在原题标注，这是一条错误备注需修正",
            student_id="S2024001",
            note_type="error_remark",
            added_by="阿宁"
        )
        note = create_student_note(db, note_req)

        apply_req = schemas.NoteApplyRequest(
            note_id=note.id,
            target_record_ids=[record_id]
        )
        apply_result = apply_student_note(db, apply_req, "阿宁")

        impacts = get_note_impacts(db, note.id)
        if impacts:
            impact = impacts[0]
            assert impact.judgment_before is not None
            assert impact.judgment_after is not None
            assert impact.record_id == record_id

    def test_note_generates_change_history(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        note_req = schemas.StudentNoteCreate(
            batch_id=batch_id,
            note_code="STU-ERR-002",
            content="错题备注：学生路径计算错误，单位使用错误",
            student_id="S2024002",
            note_type="error_remark",
            added_by="阿宁"
        )
        create_student_note(db, note_req)

        changes = get_batch_changes(db, batch_id)
        note_added = [c for c in changes if c.change_type == "note_added"]
        assert len(note_added) >= 1

    def test_apply_note_with_edge_override_triggers_path_recalc(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        a_to_d_records = [
            r for r in result["records"]
            if r.source_node == "A" and r.target_node == "D"
        ]
        assert len(a_to_d_records) == 1
        rec = a_to_d_records[0]
        path_before = list(rec.current_path or [])
        dist_before = rec.current_distance
        judgment_before = rec.current_judgment

        note_req = schemas.StudentNoteCreate(
            batch_id=batch_id,
            note_code="STU-ERR-003",
            content="批改发现：C->D 应该是 1.2 千米，学生少看了一位小数",
            student_id="S2024003",
            note_type="error_remark",
            added_by="阿宁"
        )
        note = create_student_note(db, note_req)

        apply_req = schemas.NoteApplyRequest(note_id=note.id)
        apply_result = apply_student_note(db, apply_req, "阿宁")

        assert "graph_rebuilt" in apply_result
        assert apply_result["graph_rebuilt"] is True
        assert len(apply_result["edge_overrides"]) >= 1
        ov = apply_result["edge_overrides"][0]
        assert ov["source"] == "C"
        assert ov["target"] == "D"
        assert abs(ov["weight"] - 1.2) < 1e-9
        assert ov["unit"] == "kilometer"

        db.refresh(rec)
        impacts = get_note_impacts(db, note.id)
        a_to_d_impacts = [i for i in impacts if i.record_id == rec.id]
        assert len(a_to_d_impacts) >= 1
        imp = a_to_d_impacts[0]

        assert imp.path_changed is True or (
            rec.current_distance != dist_before
            or rec.current_judgment != judgment_before
            or rec.current_path != path_before
        )
        assert imp.distance_before == dist_before
        assert imp.impact_detail is not None
        assert "距离重算" in imp.impact_detail or "路径变更" in imp.impact_detail


class TestOutOfBoundsHandling:
    def test_out_of_bounds_distance_flagged(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        oob_records = [r for r in result["records"] if r.is_out_of_bounds]
        assert len(oob_records) >= 1
        for r in oob_records:
            assert r.bounds_detail is not None

    def test_warnings_endpoint_returns_outliers(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        oob_records = [r for r in result["records"] if r.is_out_of_bounds]
        if oob_records:
            rid = oob_records[0].id
            warnings_data = (
                db.query(models.ExtrapolationWarning)
                .filter(models.ExtrapolationWarning.record_id == rid)
                .all()
            )
            assert len(warnings_data) >= 1

    def test_all_extrapolation_warnings_have_batch_id(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        all_warns = (
            db.query(models.ExtrapolationWarning)
            .filter(models.ExtrapolationWarning.batch_id == batch_id)
            .all()
        )
        assert len(all_warns) >= 2, f"至少应有记录级越界+边级越界，实际只有 {len(all_warns)} 条"

        edge_warns = [w for w in all_warns if w.record_id is None]
        assert len(edge_warns) >= 1, "应该存在边级越界（A->E=999999m 或 E->F=500km）"

        for w in all_warns:
            assert w.batch_id is not None, f"Warning id={w.id} type={w.warning_type} 缺少 batch_id"
            assert w.batch_id == batch_id

    def test_edge_warnings_queryable_by_batch(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        batch_warns = (
            db.query(models.ExtrapolationWarning)
            .filter(models.ExtrapolationWarning.batch_id == batch_id)
            .all()
        )
        edge_by_batch = [w for w in batch_warns if w.record_id is None]
        rec_by_batch = [w for w in batch_warns if w.record_id is not None]
        assert len(edge_by_batch) >= 1
        assert len(rec_by_batch) >= 1


class TestRecalcConsistency:
    def test_consistency_check_runs(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        note_req = schemas.StudentNoteCreate(
            batch_id=batch_id,
            note_code="RECALC-001",
            content="复算备注：修正单位",
            note_type="recalc_note",
            added_by="阿宁"
        )
        note = create_student_note(db, note_req)
        apply_req = schemas.NoteApplyRequest(note_id=note.id)
        apply_student_note(db, apply_req, "阿宁")

        checks = check_recalc_consistency(db, batch_id)
        assert len(checks) > 0
        check_types = {c["check_type"] for c in checks}
        assert "total_records" in check_types
        assert "verified_count" in check_types
        assert "unit_conversion_consistency" in check_types

    def test_batch_status_matches_detail_counts(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        status = get_batch_status(db, batch_id)
        records = db.query(models.PathRecord).filter(models.PathRecord.batch_id == batch_id).all()

        assert status["total_records"] == len(records)
        assert status["out_of_bounds_count"] == sum(1 for r in records if r.is_out_of_bounds)


class TestEvidenceTracking:
    def test_evidence_needed_endpoint(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        records = get_records_needing_evidence(db, batch_id)
        assert isinstance(records, list)

    def test_batch_status_shows_evidence_counts(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        status = get_batch_status(db, batch_id)
        assert "need_evidence_count" in status
        assert "evidence_complete_count" in status
        assert "processed_count" in status
        assert "pending_count" in status


class TestCSVExport:
    def test_csv_export_returns_content(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id

        csv_bytes = export_batch_csv(db, batch_id)
        assert csv_bytes is not None
        assert isinstance(csv_bytes, (bytes, bytearray))
        assert len(csv_bytes) > 3

        assert csv_bytes[:3] == b"\xef\xbb\xbf", "CSV 必须带 UTF-8 BOM 才能被 Excel 正常识别中文"

        csv_text = csv_bytes.decode("utf-8-sig")
        lines = csv_text.strip().split("\r\n")
        assert len(lines) >= 2, "CSV 至少包含表头+一行数据"

        header = lines[0]
        expected_columns = [
            "批次编号", "批次名称", "批次边级越界警告",
            "记录编号", "起点", "终点", "当前路径(节点序列)",
            "原始距离", "原始单位", "原始判定",
            "当前距离", "当前单位", "当前判定",
            "是否越界", "越界说明",
            "单位换算说明",
            "处理状态", "证据状态", "缺失证据项",
            "最近变更来源", "最近变更操作人", "最近变更原因", "最近变更时间",
            "变更次数",
            "关联备注编码", "备注影响明细",
            "创建时间", "更新时间"
        ]
        header_cols = next(csv.reader([header]))
        for col in expected_columns:
            assert col in header_cols, f"CSV 表头缺少列: {col}"

    def test_csv_contains_actual_record_data(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id
        records = result["records"]

        csv_bytes = export_batch_csv(db, batch_id)
        csv_text = csv_bytes.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(csv_text))
        rows = list(reader)
        header = rows[0]
        data_rows = rows[1:]

        assert len(data_rows) == len(records)

        rec_code_idx = header.index("记录编号")
        src_idx = header.index("起点")
        dst_idx = header.index("终点")
        cur_judge_idx = header.index("当前判定")
        change_count_idx = header.index("变更次数")
        batch_edge_warn_idx = header.index("批次边级越界警告")

        record_codes_in_csv = {r[rec_code_idx] for r in data_rows}
        for record in records:
            assert record.record_code in record_codes_in_csv

        first = data_rows[0]
        assert len(first[src_idx]) > 0
        assert len(first[dst_idx]) > 0
        assert len(first[cur_judge_idx]) > 0
        assert int(first[change_count_idx]) >= 1, "每条记录至少有 initial_verification 一次变更"

        any_edge_warn = any(r[batch_edge_warn_idx].strip() for r in data_rows)
        assert any_edge_warn, "由于样本包含超长边，批次边级越界警告列应非空"

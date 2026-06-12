import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import sys
import warnings

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

        csv_content = export_batch_csv(db, batch_id)
        assert csv_content is not None
        assert len(csv_content) > 0

        lines = csv_content.strip().split("\n")
        assert len(lines) >= 2

        header = lines[0]
        expected_columns = [
            "记录编号", "起点", "终点",
            "原始距离", "原始单位", "原始判定",
            "当前距离", "当前单位", "当前判定",
            "是否越界", "单位换算说明",
            "处理状态", "证据状态", "变更来源"
        ]
        for col in expected_columns:
            assert col in header

    def test_csv_contains_actual_record_data(self, db):
        request = build_sample_request()
        result = create_batch_with_records(db, request)
        batch_id = result["batch"].id
        records = result["records"]

        csv_content = export_batch_csv(db, batch_id)
        lines = csv_content.strip().split("\n")

        assert len(lines) == len(records) + 1

        for record in records:
            found = any(record.record_code in line for line in lines)
            assert found

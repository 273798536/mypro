import pytest
from drum_beat_align.models import init_db, clear_all_data, query_exceptions, query_exception_details, query_confirmation_history, confirm_exception
from drum_beat_align.engine import run_alignment
from tests.seed_data import REHEARSAL_SCREENSHOTS


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    clear_all_data()
    yield
    clear_all_data()


def test_run_alignment_creates_batch():
    batch_id = run_alignment(REHEARSAL_SCREENSHOTS)
    assert batch_id is not None
    assert batch_id.startswith("batch_")


def test_exceptions_count():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    assert len(exceptions) >= 4


def test_count_mismatch_detected():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    mismatch = [e for e in exceptions if e["exception_type"] == "count_mismatch"]
    assert len(mismatch) >= 1
    reason = mismatch[0]["reason"]
    assert "节拍预期" in reason
    assert "拍" in reason


def test_late_attachment_exception():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    late = [e for e in exceptions if e["exception_type"] == "late_attachment"]
    assert len(late) >= 1
    reason = late[0]["reason"]
    assert "晚到" in reason or "晚" in reason


def test_legacy_master_conflict_traceable():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    legacy = [e for e in exceptions if e["exception_type"] == "legacy_master_conflict"]
    assert len(legacy) >= 1
    reason = legacy[0]["reason"]
    assert "旧版母带" in reason
    assert "排练群原始说法" in reason


def test_exception_detail_contains_screenshot_info():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    detail = query_exception_details(exceptions[0]["id"])
    assert detail is not None
    assert "screenshot_file" in detail
    assert "reason" in detail


def test_confirm_creates_history():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    exc_id = exceptions[0]["id"]
    result = confirm_exception(exc_id, operator="林姐", new_status="confirmed", note="学生已补练")
    assert result is not None
    assert result["old_status"] == "open"
    assert result["new_status"] == "confirmed"
    history = query_confirmation_history(exc_id)
    assert len(history) >= 1
    assert history[0]["old_value"] == "open"
    assert history[0]["new_value"] == "confirmed"
    assert history[0]["operator"] == "林姐"


def test_api_export_matches_query():
    run_alignment(REHEARSAL_SCREENSHOTS)
    from drum_beat_align.api import app
    with app.test_client() as client:
        resp_query = client.get("/api/align/exceptions")
        query_data = resp_query.get_json()
        resp_export = client.get("/api/align/export")
        export_data = resp_export.get_json()
        assert query_data["count"] == export_data["count"]
        query_ids = {e["id"] for e in query_data["exceptions"]}
        export_ids = {e["id"] for e in export_data["exceptions"]}
        assert query_ids == export_ids


def test_exception_reason_is_human_readable():
    run_alignment(REHEARSAL_SCREENSHOTS)
    exceptions = query_exceptions()
    for exc in exceptions:
        assert len(exc["reason"]) >= 5
        has_chinese = any('\u4e00' <= c <= '\u9fff' for c in exc["reason"])
        assert has_chinese, f"异常原因应包含中文：{exc['reason']}"

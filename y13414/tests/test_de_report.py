import pytest
from src.de_report.models import (
    Record, RecordStatus, RecordSource, ExtrapolationAlert,
    BoundaryCondition, StatusTransitionError,
)
from src.de_report.state_machine import StateMachine
from src.de_report.sample_data import SITE_RECORDS


class TestStateMachineTransitions:
    def setup_method(self):
        self.sm = StateMachine()
        self.sm.load_records(SITE_RECORDS)

    def test_normal_flow_created_to_confirmed(self):
        log = self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        assert log.to_status == RecordStatus.PENDING_CONFIRM

        log2 = self.sm.transition("DE-001", RecordStatus.CONFIRMED)
        assert log2.to_status == RecordStatus.CONFIRMED

        rec = self.sm.get_record("DE-001")
        assert rec.status == RecordStatus.CONFIRMED

    def test_normal_flow_created_to_rejected(self):
        self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        log = self.sm.transition("DE-001", RecordStatus.REJECTED)
        assert log.to_status == RecordStatus.REJECTED

    def test_rejected_can_resubmit(self):
        self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        self.sm.transition("DE-001", RecordStatus.REJECTED)
        log = self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        assert log.to_status == RecordStatus.PENDING_CONFIRM
        assert "重新提交" in log.remark

    def test_confirmed_can_reopen(self):
        self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        self.sm.transition("DE-001", RecordStatus.CONFIRMED)
        log = self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        assert log.to_status == RecordStatus.PENDING_CONFIRM
        assert "重新审核" in log.remark


class TestInvalidTransitions:
    def setup_method(self):
        self.sm = StateMachine()
        self.sm.load_records(SITE_RECORDS)

    def test_created_cannot_go_directly_to_confirmed(self):
        with pytest.raises(StatusTransitionError) as exc_info:
            self.sm.transition("DE-001", RecordStatus.CONFIRMED)
        assert "新建记录只能提交到待确认" in str(exc_info.value.reason)

    def test_created_cannot_go_directly_to_rejected(self):
        with pytest.raises(StatusTransitionError) as exc_info:
            self.sm.transition("DE-001", RecordStatus.REJECTED)
        assert "新建记录只能提交到待确认" in str(exc_info.value.reason)

    def test_confirmed_cannot_go_to_rejected(self):
        self.sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        self.sm.transition("DE-001", RecordStatus.CONFIRMED)
        with pytest.raises(StatusTransitionError) as exc_info:
            self.sm.transition("DE-001", RecordStatus.REJECTED)
        assert "已确认记录只能退回待确认" in str(exc_info.value.reason)

    def test_nonexistent_record(self):
        with pytest.raises(StatusTransitionError) as exc_info:
            self.sm.transition("DE-999", RecordStatus.PENDING_CONFIRM)
        assert "记录不存在" in str(exc_info.value.reason)


class TestOldVersionRecord:
    def setup_method(self):
        self.sm = StateMachine()
        self.sm.load_records(SITE_RECORDS)

    def test_old_version_exists(self):
        rec = self.sm.get_record("DE-003-OLD")
        assert rec is not None
        assert rec.source == RecordSource.OLD_VERSION
        assert rec.version == 0

    def test_old_version_boundary_note(self):
        rec = self.sm.get_record("DE-003-OLD")
        assert any("旧版" in bc.note for bc in rec.boundary_conditions)

    def test_old_version_symbol_differs(self):
        rec = self.sm.get_record("DE-003-OLD")
        symbols = [bc.symbol for bc in rec.boundary_conditions]
        assert "D_x y" in symbols
        normal_rec = self.sm.get_record("DE-001")
        normal_symbols = [bc.symbol for bc in normal_rec.boundary_conditions]
        assert "dy/dx" in normal_symbols


class TestOnSiteSupplement:
    def setup_method(self):
        self.sm = StateMachine()
        self.sm.load_records(SITE_RECORDS)

    def test_supplement_exists(self):
        rec = self.sm.get_record("DE-004-SUPP")
        assert rec is not None
        assert rec.source == RecordSource.ON_SITE_SUPPLEMENT

    def test_supplement_has_boundary_condition(self):
        rec = self.sm.get_record("DE-004-SUPP")
        assert len(rec.boundary_conditions) > 0
        assert rec.boundary_conditions[0].valid_range == "k > 0"

    def test_supplement_screenshot_note(self):
        rec = self.sm.get_record("DE-004-SUPP")
        assert "现场" in rec.screenshot_note or "手机拍照" in rec.screenshot_note


class TestExtrapolationWarnings:
    def setup_method(self):
        self.sm = StateMachine()
        self.sm.load_records(SITE_RECORDS)

    def test_consecutive_out_of_bound_detected(self):
        warnings = self.sm.get_extrapolation_warnings()
        assert len(warnings) > 0
        assert any(w["type"] == "连续外推越界" for w in warnings)

    def test_consecutive_warning_suggests_upstream(self):
        warnings = self.sm.get_extrapolation_warnings()
        upstream_warnings = [w for w in warnings if "上游" in w.get("suggestion", "")]
        assert len(upstream_warnings) > 0

    def test_consecutive_record_has_boundary_note_appended(self):
        rec = self.sm.get_record("DE-006")
        assert any("连续越界提示" in bc.note for bc in rec.boundary_conditions)


class TestReimportTraceability:
    def test_reimport_preserves_trace(self):
        sm = StateMachine()
        sm.load_records(SITE_RECORDS)

        sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        sm.transition("DE-001", RecordStatus.CONFIRMED)

        updated = Record(
            id="DE-001",
            version=2,
            original_remark="二次执行更新：已复核确认",
            boundary_conditions=[
                BoundaryCondition(
                    symbol="dy/dx",
                    equation_text="dy/dx = 2x, y(0)=1",
                    valid_range="x ∈ ℝ",
                    note="复核后确认无变更",
                )
            ],
        )
        logs = sm.load_records([updated])
        assert len(logs) > 0
        assert "原备注" in logs[0].remark

        trace = sm.get_trace("DE-001")
        assert trace is not None
        assert len(trace["status_history"]) >= 2

    def test_screenshot_note_tracks_original_remark(self):
        sm = StateMachine()
        sm.load_records(SITE_RECORDS)

        sm.transition("DE-002", RecordStatus.PENDING_CONFIRM)
        rec = sm.get_record("DE-002")
        assert "原备注" in rec.screenshot_note or "待确认" in rec.screenshot_note

    def test_changelog_tracks_all_changes(self):
        sm = StateMachine()
        sm.load_records(SITE_RECORDS)

        sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        sm.transition("DE-001", RecordStatus.CONFIRMED)

        changelog = sm.get_changelog("DE-001")
        assert len(changelog) == 2
        assert changelog[0].from_status == RecordStatus.CREATED
        assert changelog[0].to_status == RecordStatus.PENDING_CONFIRM
        assert changelog[1].from_status == RecordStatus.PENDING_CONFIRM
        assert changelog[1].to_status == RecordStatus.CONFIRMED

    def test_reimport_lower_version_ignored(self):
        sm = StateMachine()
        sm.load_records(SITE_RECORDS)

        sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        old_rec = Record(id="DE-001", version=0, original_remark="旧版本")
        logs = sm.load_records([old_rec])
        assert len(logs) == 0

    def test_handoff_trace_is_readable(self):
        sm = StateMachine()
        sm.load_records(SITE_RECORDS)

        sm.transition("DE-001", RecordStatus.PENDING_CONFIRM)
        sm.transition("DE-001", RecordStatus.CONFIRMED)

        trace = sm.get_trace("DE-001")
        assert trace["original_remark"] != ""
        assert len(trace["status_history"]) > 0
        for entry in trace["status_history"]:
            assert entry["remark"] != ""

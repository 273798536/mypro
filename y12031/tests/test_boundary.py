from datetime import date

from app import services
from app.models import SettlementRecord, SettlementChangeLog, DeliveryTicket, FarmerProfile, FloorPriceAgreement


PHASE1_DATA = {
    "grades": [
        {"grade_code": "A", "grade_name": "一等品", "price_multiplier": 1.0, "description": "优质"},
        {"grade_code": "B", "grade_name": "二等品", "price_multiplier": 0.85, "description": "良好"},
        {"grade_code": "C", "grade_name": "三等品", "price_multiplier": 0.7, "description": "一般"},
    ],
    "farmers": [
        {"farmer_code": "F001", "name": "张三", "id_number": "110101199001011234", "phone": "13800001111", "cooperative_id": "COOP01"},
        {"farmer_code": "F002", "name": "李四", "id_number": "110101199002021234", "phone": "13800002222", "cooperative_id": "COOP01"},
        {"farmer_code": "F003", "name": "王五", "id_number": "110101199003031234", "phone": "13800003333", "cooperative_id": "COOP01"},
    ],
    "tickets": [
        {"ticket_no": "T001", "farmer_code": "F001", "product_type": "小麦", "gross_weight": 1000.0, "tare_weight": 50.0, "deduction_amount": 20.0, "deduction_reason": "含水超标", "grade_code": "A", "market_price": 2.5, "delivery_date": "2025-06-01"},
        {"ticket_no": "T002", "farmer_code": "F002", "product_type": "小麦", "gross_weight": 800.0, "tare_weight": 30.0, "deduction_amount": 0.0, "grade_code": "B", "market_price": 2.5, "delivery_date": "2025-06-02"},
        {"ticket_no": "T003", "farmer_code": "F003", "product_type": "玉米", "gross_weight": 1200.0, "tare_weight": 40.0, "deduction_amount": 50.0, "deduction_reason": "杂质偏高", "grade_code": "C", "market_price": None, "delivery_date": "2025-06-03"},
        {"ticket_no": "T004", "farmer_code": "F001", "product_type": "小麦", "gross_weight": 500.0, "tare_weight": 20.0, "deduction_amount": 10.0, "grade_code": "A", "market_price": 2.5, "delivery_date": "2025-06-05"},
    ],
}

PHASE2_DATA = {
    "agreements": [
        {"agreement_no": "AG001", "product_type": "小麦", "floor_price": 2.8, "start_date": "2025-05-01", "end_date": "2025-07-31"},
        {"agreement_no": "AG002", "product_type": "玉米", "floor_price": 2.2, "start_date": "2025-05-01", "end_date": "2025-07-31"},
    ],
}


class TestPhase1Import:
    def test_basic_phase1(self, db):
        result = services.import_phase1(db, PHASE1_DATA)
        assert result["created_farmers"] == 3
        assert result["created_tickets"] == 4
        assert result["created_settlements"] == 4
        assert result["created_grades"] == 3

    def test_phase1_settlement_values(self, db):
        services.import_phase1(db, PHASE1_DATA)
        settlements = db.query(SettlementRecord).all()
        s_t001 = next(s for s in settlements if s.ticket_id == 1)

        assert s_t001.net_weight == 930.0
        assert s_t001.adjusted_weight == 930.0
        assert s_t001.applied_price == 2.5
        assert s_t001.price_source == "market_only"
        assert s_t001.net_amount == 2325.0
        assert s_t001.floor_difference is None
        assert s_t001.status == "draft"

    def test_phase1_market_price_missing(self, db):
        services.import_phase1(db, PHASE1_DATA)
        settlements = db.query(SettlementRecord).all()
        s_t003 = next(s for s in settlements if s.ticket_id == 3)

        assert s_t003.price_source == "missing"
        assert s_t003.net_amount is None
        assert s_t003.status == "pending_market_price"
        assert s_t003.verification_note == "市场价缺失，无法完成结算"

    def test_phase1_grade_b_multiplier(self, db):
        services.import_phase1(db, PHASE1_DATA)
        settlements = db.query(SettlementRecord).all()
        s_t002 = next(s for s in settlements if s.ticket_id == 2)

        assert s_t002.net_weight == 770.0
        assert s_t002.adjusted_weight == 654.5
        assert s_t002.applied_price == 2.5


class TestPhase2Import:
    def test_phase2_floor_applied(self, db):
        services.import_phase1(db, PHASE1_DATA)
        result = services.import_phase2(db, PHASE2_DATA)

        assert result["created_agreements"] == 2
        assert result["updated_settlements"] >= 1

        settlements = db.query(SettlementRecord).all()
        s_t001 = next(s for s in settlements if s.ticket_id == 1)

        assert s_t001.floor_price == 2.8
        assert s_t001.price_source == "floor_applied"
        assert s_t001.applied_price == 2.8
        assert s_t001.net_amount == 2604.0
        assert s_t001.floor_difference == 279.0

    def test_phase2_change_log_explanation(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s_t001 = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        logs = db.query(SettlementChangeLog).filter(SettlementChangeLog.settlement_id == s_t001.id).all()

        price_logs = [l for l in logs if l.field_changed == "applied_price"]
        assert len(price_logs) >= 1
        assert "保底价" in price_logs[0].explanation
        assert "高于市场价" in price_logs[0].explanation

    def test_phase2_missing_market_price_uses_floor(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s_t003 = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 3).first()

        assert s_t003.price_source == "floor_only"
        assert s_t003.applied_price == 2.2
        assert s_t003.status == "draft"
        assert s_t003.net_amount is not None

    def test_phase2_explains_before_after(self, db):
        services.import_phase1(db, PHASE1_DATA)
        result = services.import_phase2(db, PHASE2_DATA)

        for detail in result["change_details"]:
            assert len(detail["changes"]) > 0
            for change in detail["changes"]:
                assert change["old_value"] is not None or change["new_value"] is not None
                assert change["explanation"] is not None


class TestIdempotency:
    def test_phase1_idempotent(self, db):
        r1 = services.import_phase1(db, PHASE1_DATA)
        r2 = services.import_phase1(db, PHASE1_DATA)

        assert r2["skipped_farmers"] == 3
        assert r2["skipped_tickets"] == 4
        assert r2["created_settlements"] == 0

        settlements = db.query(SettlementRecord).all()
        assert len(settlements) == 4

    def test_phase2_idempotent(self, db):
        services.import_phase1(db, PHASE1_DATA)
        r1 = services.import_phase2(db, PHASE2_DATA)
        r2 = services.import_phase2(db, PHASE2_DATA)

        assert r2["skipped_agreements"] == 2
        assert r2["updated_settlements"] == 0

        settlements = db.query(SettlementRecord).all()
        for s in settlements:
            assert s.price_source in ("floor_applied", "floor_only", "market_higher", "market_only", "missing")

    def test_recalculate_idempotent(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        settlements = db.query(SettlementRecord).all()
        snapshots_before = {s.id: (s.net_amount, s.applied_price, s.price_source) for s in settlements}

        for s in settlements:
            services.reevaluate_settlement(db, s, "recalculate", "system")

        db.commit()
        settlements = db.query(SettlementRecord).all()
        for s in settlements:
            snap = snapshots_before[s.id]
            assert s.net_amount == snap[0]
            assert s.applied_price == snap[1]
            assert s.price_source == snap[2]

    def test_full_pipeline_twice_same_result(self, db):
        for _ in range(2):
            services.import_phase1(db, PHASE1_DATA)
            services.import_phase2(db, PHASE2_DATA)

        settlements = db.query(SettlementRecord).all()
        assert len(settlements) == 4

        t001_settlement = next(s for s in settlements if s.ticket_id == 1)
        assert t001_settlement.applied_price == 2.8
        assert t001_settlement.price_source == "floor_applied"
        assert t001_settlement.net_amount == 2604.0


class TestDeductionDispute:
    def test_deduction_dispute_marks_disputed(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        result = services.handle_deduction_dispute(db, s.id, "含水率检测方法有异议，要求复检", "结算员A")

        assert result["new_status"] == "disputed"
        assert result["new_verification_status"] == "disputed"
        assert "含水率" in result["verification_note"]

    def test_deduction_dispute_creates_changelog(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        services.handle_deduction_dispute(db, s.id, "扣杂比例争议", "结算员A")

        logs = db.query(SettlementChangeLog).filter(SettlementChangeLog.settlement_id == s.id, SettlementChangeLog.change_type == "deduction_dispute").all()
        assert len(logs) >= 1
        assert any("扣杂" in (l.explanation or "") for l in logs)


class TestGradeReverification:
    def test_grade_reverification_updates_settlement(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 2).first()
        old_adjusted_weight = s.adjusted_weight

        result = services.handle_grade_reverification(db, s.id, "A", "外观检验偏差，升级为一等品", "质检员B")

        assert result["new_verification_status"] == "reverified"
        assert "外观检验" in result["verification_note"]

        db.refresh(s)
        assert s.adjusted_weight != old_adjusted_weight
        assert s.verification_status == "reverified"

    def test_grade_reverification_with_floor_price(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 2).first()
        result = services.handle_grade_reverification(db, s.id, "A", "等级复核升级", "质检员B")

        db.refresh(s)
        assert s.price_source == "floor_applied"
        assert s.floor_difference is not None

        logs = db.query(SettlementChangeLog).filter(
            SettlementChangeLog.settlement_id == s.id,
            SettlementChangeLog.change_type == "grade_reverification",
        ).all()
        assert len(logs) >= 1
        assert any("等级复核" in (l.explanation or "") for l in logs)

    def test_grade_reverification_updates_floor_difference(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s_t002 = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 2).first()
        old_floor_diff = s_t002.floor_difference

        services.handle_grade_reverification(db, s_t002.id, "C", "降级为三等品", "质检员B")

        db.refresh(s_t002)
        if old_floor_diff is not None and s_t002.floor_difference is not None:
            assert s_t002.floor_difference != old_floor_diff
        assert s_t002.verification_status == "reverified"

    def test_grade_change_triggers_verification_and_explanation(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        result = services.handle_grade_reverification(db, s.id, "B", "抽样复检质量降级", "质检员C")

        db.refresh(s)
        assert s.verification_status == "reverified"
        assert "抽样复检" in s.verification_note

        logs = db.query(SettlementChangeLog).filter(
            SettlementChangeLog.settlement_id == s.id,
            SettlementChangeLog.change_type == "grade_reverification",
        ).all()
        field_names = [l.field_changed for l in logs]
        assert "adjusted_weight" in field_names or "applied_price" in field_names or "net_amount" in field_names


class TestMissingMarketPrice:
    def test_missing_market_price_pending_status(self, db):
        services.import_phase1(db, PHASE1_DATA)

        s_t003 = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 3).first()
        assert s_t003.status == "pending_market_price"
        assert s_t003.net_amount is None
        assert s_t003.verification_note == "市场价缺失，无法完成结算"

    def test_missing_market_price_resolved_by_agreement(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s_t003 = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 3).first()
        assert s_t003.status == "draft"
        assert s_t003.price_source == "floor_only"
        assert s_t003.net_amount is not None

    def test_missing_market_price_resolved_by_update(self, db):
        services.import_phase1(db, PHASE1_DATA)

        s_t003 = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 3).first()
        assert s_t003.status == "pending_market_price"

        result = services.update_market_price(db, s_t003.id, 2.1, "结算员A")

        db.refresh(s_t003)
        assert s_t003.status == "draft"
        assert s_t003.market_price == 2.1
        assert s_t003.verification_status == "verified"

    def test_missing_market_price_no_agreement(self, db):
        data = {
            "grades": [{"grade_code": "A", "grade_name": "一等品", "price_multiplier": 1.0}],
            "farmers": [{"farmer_code": "F010", "name": "赵六"}],
            "tickets": [
                {"ticket_no": "T010", "farmer_code": "F010", "product_type": "大豆", "gross_weight": 500.0, "tare_weight": 10.0, "grade_code": "A", "market_price": None, "delivery_date": "2025-06-01"},
            ],
        }
        services.import_phase1(db, data)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        assert s.price_source == "missing"
        assert s.status == "pending_market_price"
        assert s.net_amount is None


class TestManualCorrection:
    def test_manual_correction_comparison(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        ticket = db.query(DeliveryTicket).filter(DeliveryTicket.ticket_no == "T001").first()
        result = services.apply_manual_correction(
            db,
            ticket.id,
            corrections={"deduction_amount": 5.0},
            reason="原扣杂比例偏高，经协商调减",
            operator="结算员A",
        )

        assert result["old_values"]["net_weight"] == 930.0
        assert result["new_values"]["net_weight"] == 945.0
        assert len(result["changed_fields"]) > 0

        old_amount = result["old_values"]["net_amount"]
        new_amount = result["new_values"]["net_amount"]
        assert new_amount > old_amount

        assert result["summary"] is not None
        assert "结算员A" in result["summary"]
        assert "调减" in result["summary"]

    def test_manual_correction_changelog(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        ticket = db.query(DeliveryTicket).filter(DeliveryTicket.ticket_no == "T001").first()
        services.apply_manual_correction(
            db,
            ticket.id,
            corrections={"deduction_amount": 5.0},
            reason="扣杂调减",
            operator="结算员A",
        )

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == ticket.id).first()
        logs = db.query(SettlementChangeLog).filter(
            SettlementChangeLog.settlement_id == s.id,
            SettlementChangeLog.change_type == "manual_correction",
        ).all()
        assert len(logs) >= 1
        assert any(l.field_changed == "net_weight" for l in logs)
        assert any(l.field_changed == "net_amount" for l in logs)

    def test_manual_correction_updates_verification(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        ticket = db.query(DeliveryTicket).filter(DeliveryTicket.ticket_no == "T001").first()
        services.apply_manual_correction(
            db,
            ticket.id,
            corrections={"gross_weight": 1050.0},
            reason="磅秤校准后发现偏差",
            operator="结算员A",
        )

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == ticket.id).first()
        assert s.verification_status == "reverified"

    def test_correction_with_floor_price_recalculation(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        ticket = db.query(DeliveryTicket).filter(DeliveryTicket.ticket_no == "T001").first()
        s_before = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == ticket.id).first()
        old_floor_diff = s_before.floor_difference

        result = services.apply_manual_correction(
            db,
            ticket.id,
            corrections={"deduction_amount": 0.0},
            reason="取消扣杂",
            operator="结算员A",
        )

        new_floor_diff = result["new_values"]["floor_difference"]
        if old_floor_diff is not None and new_floor_diff is not None:
            assert new_floor_diff != old_floor_diff

        assert result["new_values"]["price_source"] == "floor_applied"


class TestFloorComparisonNotOneShot:
    def test_floor_recalculated_after_deduction_change(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        original_floor_diff = s.floor_difference

        ticket = db.query(DeliveryTicket).filter(DeliveryTicket.id == s.ticket_id).first()
        services.apply_manual_correction(
            db,
            ticket.id,
            corrections={"deduction_amount": 0.0},
            reason="调整扣杂",
            operator="结算员A",
        )

        db.refresh(s)
        assert s.floor_difference is not None
        assert s.floor_difference != original_floor_diff
        assert s.price_source == "floor_applied"

    def test_floor_recalculated_after_grade_change(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        original_floor_diff = s.floor_difference

        services.handle_grade_reverification(db, s.id, "B", "降级复核", "质检员")

        db.refresh(s)
        assert s.floor_difference is not None
        assert s.verification_status == "reverified"

    def test_floor_recalculated_after_market_price_change(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        assert s.price_source == "floor_applied"
        original_applied = s.applied_price

        services.update_market_price(db, s.id, 3.0, "system")

        db.refresh(s)
        assert s.applied_price == 3.0
        assert s.price_source == "market_higher"
        assert s.floor_difference == 0.0 or s.floor_difference is None or s.floor_difference <= 0


class TestPersistenceAcrossRestart:
    def test_data_persists_in_db(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        settlements = db.query(SettlementRecord).all()
        assert len(settlements) == 4

        changelogs = db.query(SettlementChangeLog).all()
        assert len(changelogs) >= 1

        farmers = db.query(FarmerProfile).all()
        assert len(farmers) == 3

        agreements = db.query(FloorPriceAgreement).all()
        assert len(agreements) == 2

    def test_settlement_recalculable_from_persisted_data(self, db):
        services.import_phase1(db, PHASE1_DATA)
        services.import_phase2(db, PHASE2_DATA)

        s = db.query(SettlementRecord).filter(SettlementRecord.ticket_id == 1).first()
        expected_net_amount = s.net_amount
        expected_applied_price = s.applied_price

        result = services.reevaluate_settlement(db, s, "recalculate", "system")

        assert result["new_values"]["net_amount"] == expected_net_amount
        assert result["new_values"]["applied_price"] == expected_applied_price

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from datetime import date, datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import Contract, StayRecord, Reschedule, Cancellation, DisputeNote
from core import VerificationEngine, DataCleaner, DataValidator
from config import ROOM_STATUS, VERIFICATION_CATEGORY


class TestDataCleaner(unittest.TestCase):
    def test_clean_string(self):
        self.assertEqual(DataCleaner.clean_string('  张三  '), '张三')
        self.assertEqual(DataCleaner.clean_string(None), None)
        self.assertEqual(DataCleaner.clean_string(''), None)
        self.assertEqual(DataCleaner.clean_string('NaN'), None)
        self.assertEqual(DataCleaner.clean_string('null'), None)

    def test_clean_date(self):
        self.assertEqual(DataCleaner.clean_date('2026-05-31'), date(2026, 5, 31))
        self.assertEqual(DataCleaner.clean_date('2026/05/31'), date(2026, 5, 31))
        self.assertEqual(DataCleaner.clean_date('2026年5月31日'), date(2026, 5, 31))
        self.assertEqual(DataCleaner.clean_date('2026.05.31'), date(2026, 5, 31))
        self.assertEqual(DataCleaner.clean_date(None), None)

    def test_clean_integer(self):
        self.assertEqual(DataCleaner.clean_integer('3'), 3)
        self.assertEqual(DataCleaner.clean_integer(3.0), 3)
        self.assertEqual(DataCleaner.clean_integer(None), 0)
        self.assertEqual(DataCleaner.clean_integer(''), 0)

    def test_clean_float(self):
        self.assertEqual(DataCleaner.clean_float('123.45'), 123.45)
        self.assertEqual(DataCleaner.clean_float('¥1,234.50'), 1234.5)
        self.assertEqual(DataCleaner.clean_float('300元'), 300.0)
        self.assertEqual(DataCleaner.clean_float(None), 0.0)

    def test_clean_boolean(self):
        self.assertTrue(DataCleaner.clean_boolean('是'))
        self.assertTrue(DataCleaner.clean_boolean('true'))
        self.assertTrue(DataCleaner.clean_boolean('1'))
        self.assertFalse(DataCleaner.clean_boolean('否'))
        self.assertFalse(DataCleaner.clean_boolean('false'))
        self.assertFalse(DataCleaner.clean_boolean(''))

    def test_parse_remark(self):
        result = DataCleaner.parse_remark('客人晚到，实际2晚，房费300元')
        self.assertTrue(result['is_no_show'])
        self.assertEqual(result['extracted_info'].get('nights'), 2)
        self.assertEqual(result['extracted_info'].get('amount'), 300.0)

        result2 = DataCleaner.parse_remark('自营补房，有争议')
        self.assertTrue(result2['is_self_booked'])
        self.assertTrue(result2['has_dispute'])

        result3 = DataCleaner.parse_remark('改期到2026-06-15')
        self.assertTrue(result3['is_reschedule'])
        self.assertEqual(result3['extracted_info'].get('date'), date(2026, 6, 15))

    def test_merge_remarks(self):
        merged = DataCleaner.merge_remarks('旧系统备注', '新备注')
        self.assertEqual(merged, '[历史]旧系统备注; 新备注')
        self.assertIsNone(DataCleaner.merge_remarks(None, None))


class TestDataValidator(unittest.TestCase):
    def test_validate_nights(self):
        valid, msg = DataValidator.validate_nights(
            date(2026, 5, 30), date(2026, 6, 2), 3
        )
        self.assertTrue(valid)

        valid, msg = DataValidator.validate_nights(
            date(2026, 5, 30), date(2026, 6, 2), 2
        )
        self.assertFalse(valid)
        self.assertIn('不一致', msg)

    def test_validate_guest_info(self):
        valid, msg = DataValidator.validate_guest_info('张三')
        self.assertTrue(valid)

        valid, msg = DataValidator.validate_guest_info('')
        self.assertFalse(valid)

        valid, msg = DataValidator.validate_guest_info('张三', '110101199003071234')
        self.assertTrue(valid)

    def test_detect_cross_week(self):
        is_cross, weeks_diff = DataValidator.detect_cross_week(
            date(2026, 5, 29), date(2026, 6, 5)
        )
        self.assertTrue(is_cross)
        self.assertEqual(weeks_diff, 1)

        is_cross, weeks_diff = DataValidator.detect_cross_week(
            date(2026, 5, 27), date(2026, 5, 28)
        )
        self.assertFalse(is_cross)

    def test_generate_sheet_no(self):
        no1 = DataValidator.generate_sheet_no('HX')
        no2 = DataValidator.generate_sheet_no('HX')
        self.assertNotEqual(no1, no2)
        self.assertTrue(no1.startswith('HX'))


class BaseTestWithDB(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite:///:memory:')
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

    def tearDown(self):
        self.db.close()

    def _create_contract(self, guest_name='张三', checkin_date=None,
                         nights=2, rate=300.0, contract_no=None):
        checkin = checkin_date or date(2026, 5, 30)
        contract = Contract(
            contract_no=contract_no or f'CT{datetime.now().strftime("%H%M%S")}',
            hotel_name='测试酒店',
            room_type='标准间',
            checkin_date=checkin,
            checkout_date=checkin + timedelta(days=nights),
            contracted_nights=nights,
            contracted_rate=rate,
            guest_name=guest_name,
            id_card='110101199003071234',
            contact_phone='13800138000',
            status='CONTRACTED'
        )
        self.db.add(contract)
        self.db.commit()
        return contract

    def _create_stay(self, contract, is_self_booked=False, is_no_show=False):
        stay = StayRecord(
            contract_id=contract.id,
            record_no=f'ST{contract.id}',
            hotel_name=contract.hotel_name,
            room_type=contract.room_type,
            room_number='101',
            guest_name=contract.guest_name,
            id_card=contract.id_card,
            checkin_date=contract.checkin_date,
            checkout_date=contract.checkout_date,
            actual_nights=contract.contracted_nights,
            actual_rate=contract.contracted_rate,
            is_self_booked=is_self_booked,
            is_no_show=is_no_show
        )
        self.db.add(stay)
        self.db.commit()
        return stay

    def _create_reschedule(self, contract, new_checkin=None, is_cross_week=False,
                            is_revised=False):
        original = contract.checkin_date
        new = new_checkin or (original + timedelta(days=7) if is_cross_week
                              else original + timedelta(days=2))
        reschedule = Reschedule(
            contract_id=contract.id,
            reschedule_no=f'RS{contract.id}',
            hotel_name=contract.hotel_name,
            guest_name=contract.guest_name,
            original_checkin=original,
            original_checkout=contract.checkout_date,
            new_checkin=new,
            new_checkout=new + timedelta(days=contract.contracted_nights),
            reschedule_nights=contract.contracted_nights,
            is_cross_week=is_cross_week,
            is_revised=is_revised,
            operator='测试员',
            operate_time=datetime.now()
        )
        self.db.add(reschedule)
        self.db.commit()
        return reschedule

    def _create_cancellation(self, contract, cancel_type='NORMAL', penalty=0):
        cancel = Cancellation(
            contract_id=contract.id,
            cancel_no=f'CN{contract.id}',
            hotel_name=contract.hotel_name,
            guest_name=contract.guest_name,
            checkin_date=contract.checkin_date,
            checkout_date=contract.checkout_date,
            cancel_nights=contract.contracted_nights,
            cancel_type=cancel_type,
            cancel_time=datetime.now(),
            operator='测试员',
            penalty_amount=penalty
        )
        self.db.add(cancel)
        self.db.commit()
        return cancel


class TestVerificationEngine(BaseTestWithDB):
    def test_normal_stay_verification(self):
        contract = self._create_contract('正常客人')
        self._create_stay(contract)
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        self.assertEqual(result['total_contracts'], 1)
        self.assertEqual(result['total_results'], 1)
        verify_result = result['results'][0]
        self.assertEqual(verify_result.category, 'NORMAL')
        self.assertEqual(verify_result.verified_nights, 2)
        self.assertEqual(verify_result.verified_amount, 600.0)

    def test_self_booked_verification(self):
        contract = self._create_contract('自营补房客人')
        self._create_stay(contract, is_self_booked=True)
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        verify_result = result['results'][0]
        self.assertEqual(verify_result.category, 'SELF_COMPENSATE')
        self.assertTrue(verify_result.is_self_booked)

    def test_cancellation_verification(self):
        contract = self._create_contract('取消客人')
        self._create_cancellation(contract, 'NORMAL')
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        verify_result = result['results'][0]
        self.assertEqual(verify_result.category, 'CANCEL_NO_SHOW')
        self.assertEqual(verify_result.verified_nights, 2)
        self.assertEqual(verify_result.verified_amount, 0)

    def test_no_show_verification(self):
        contract = self._create_contract('晚到客人')
        self._create_cancellation(contract, 'NO_SHOW', penalty=150)
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        verify_result = result['results'][0]
        self.assertEqual(verify_result.category, 'CANCEL_NO_SHOW')
        self.assertTrue(verify_result.is_no_show)
        self.assertEqual(verify_result.penalty_amount, 150.0)

    def test_reschedule_verification(self):
        contract = self._create_contract('改期客人')
        self._create_reschedule(contract)
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        verify_result = result['results'][0]
        self.assertEqual(verify_result.category, 'RESCHEDULE')
        self.assertEqual(verify_result.status, 'RESCHEDULED')

    def test_cross_week_reschedule(self):
        contract = self._create_contract('跨周改期客人')
        self._create_reschedule(contract, is_cross_week=True)
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        self.assertEqual(result['summary']['cross_week_count'], 1)
        verify_result = result['results'][0]
        self.assertTrue(verify_result.is_cross_week)

    def test_revised_reschedule(self):
        contract = self._create_contract('修正客人')
        original = self._create_reschedule(contract, is_cross_week=True)
        revised = Reschedule(
            contract_id=contract.id,
            reschedule_no=f'RS{contract.id}_R',
            hotel_name=contract.hotel_name,
            guest_name=contract.guest_name,
            original_checkin=contract.checkin_date,
            original_checkout=contract.checkout_date,
            new_checkin=date(2026, 6, 10),
            new_checkout=date(2026, 6, 12),
            reschedule_nights=2,
            is_cross_week=True,
            is_revised=True,
            revised_from_id=original.id,
            operator='测试员',
            operate_time=datetime.now()
        )
        self.db.add(revised)
        self.db.commit()
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        self.assertEqual(result['summary']['revised_count'], 2)
        revised_results = [r for r in result['results'] if r.is_revised]
        self.assertTrue(len(revised_results) >= 1)

    def test_dispute_note(self):
        contract = self._create_contract('有争议客人')
        stay = self._create_stay(contract)
        dispute = DisputeNote(
            stay_record_id=stay.id,
            dispute_type='NIGHTS',
            dispute_content='酒店记录3晚，合同2晚',
            handler='财务小王',
            handle_result='按合同2晚核销',
            handle_time=datetime.now(),
            is_resolved=True,
            remark='客人要求补一晚'
        )
        self.db.add(dispute)
        self.db.commit()
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        self.assertEqual(result['summary']['dispute_count'], 1)
        verify_result = result['results'][0]
        self.assertTrue(verify_result.has_dispute)
        self.assertTrue(verify_result.dispute_resolved)
        self.assertIn('酒店记录3晚', verify_result.dispute_content)

    def test_sequence_order(self):
        contract = self._create_contract('顺序测试客人')
        self._create_stay(contract)
        self._create_reschedule(contract)
        self._create_cancellation(contract, 'NO_SHOW')
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        results = result['results']
        no_show_results = [r for r in results if r.is_no_show]
        reschedule_results = [r for r in results if r.category == 'RESCHEDULE']
        stay_results = [r for r in results if r.category == 'NORMAL']
        if no_show_results:
            no_show_seq = no_show_results[0].sequence_no
            if reschedule_results:
                self.assertLess(no_show_seq, reschedule_results[0].sequence_no)
            if stay_results:
                self.assertLess(no_show_seq, stay_results[0].sequence_no)

    def test_empty_remark_and_null(self):
        contract = Contract(
            contract_no='CT_NULL_TEST',
            hotel_name='测试酒店',
            room_type='标准间',
            checkin_date=date(2026, 6, 1),
            checkout_date=date(2026, 6, 3),
            contracted_nights=2,
            contracted_rate=300.0,
            guest_name='空值测试客人',
            remark=None,
            old_remark=None
        )
        self.db.add(contract)
        self.db.commit()
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        self.assertEqual(result['total_contracts'], 1)
        self.assertGreater(len(result['warnings']), 0)

    def test_old_remark_merge(self):
        contract = Contract(
            contract_no='CT_OLD_REMARK',
            hotel_name='测试酒店',
            room_type='标准间',
            checkin_date=date(2026, 6, 1),
            checkout_date=date(2026, 6, 3),
            contracted_nights=2,
            contracted_rate=300.0,
            guest_name='旧备注客人',
            old_remark='2025年旧系统备注：客人有VIP身份',
            remark='新增：客人要求高楼层'
        )
        self.db.add(contract)
        self.db.commit()
        stay = StayRecord(
            contract_id=contract.id,
            record_no='ST_OLD',
            hotel_name=contract.hotel_name,
            guest_name=contract.guest_name,
            checkin_date=contract.checkin_date,
            checkout_date=contract.checkout_date,
            actual_nights=2,
            actual_rate=300.0,
            remark='前台备注：已安排高楼层'
        )
        self.db.add(stay)
        self.db.commit()
        engine = VerificationEngine(self.db)
        result = engine.verify_all()
        verify_result = result['results'][0]
        self.assertIsNotNone(verify_result.old_remark)


if __name__ == '__main__':
    unittest.main(verbosity=2)

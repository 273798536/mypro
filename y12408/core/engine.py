from datetime import date, datetime
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session
import uuid

from models import (
    Contract, StayRecord, Reschedule, Cancellation,
    VerificationSheet, DisputeNote, VerificationResult
)
from config import ROOM_STATUS, VERIFICATION_CATEGORY
from .exceptions import (
    MatchingException, CrossWeekRescheduleException,
    DuplicateNightException
)
from .validator import DataCleaner, DataValidator


class VerificationEngine:
    def __init__(self, db: Session):
        self.db = db
        self.warnings = []
        self.errors = []
        self.sequence_counter = 0

    def _next_sequence(self) -> int:
        self.sequence_counter += 1
        return self.sequence_counter

    def _log_warning(self, message: str, context: dict = None):
        self.warnings.append({
            'message': message,
            'context': context or {},
            'time': datetime.now()
        })

    def _log_error(self, message: str, context: dict = None):
        self.errors.append({
            'message': message,
            'context': context or {},
            'time': datetime.now()
        })

    def load_all_contracts(self) -> List[Contract]:
        return self.db.query(Contract).order_by(Contract.checkin_date).all()

    def match_contract_to_records(self, contract: Contract) -> Dict:
        stay_records = self.db.query(StayRecord).filter(
            (StayRecord.contract_id == contract.id) |
            (
                (StayRecord.guest_name == contract.guest_name) &
                (StayRecord.checkin_date == contract.checkin_date)
            )
        ).all()
        reschedules = self.db.query(Reschedule).filter(
            (Reschedule.contract_id == contract.id) |
            (
                (Reschedule.guest_name == contract.guest_name) &
                (Reschedule.original_checkin == contract.checkin_date)
            )
        ).order_by(Reschedule.created_at).all()
        cancellations = self.db.query(Cancellation).filter(
            (Cancellation.contract_id == contract.id) |
            (
                (Cancellation.guest_name == contract.guest_name) &
                (Cancellation.checkin_date == contract.checkin_date)
            )
        ).order_by(Cancellation.created_at).all()
        dispute_notes = self.db.query(DisputeNote).join(
            StayRecord, DisputeNote.stay_record_id == StayRecord.id
        ).filter(
            (StayRecord.contract_id == contract.id) |
            (StayRecord.guest_name == contract.guest_name)
        ).all()
        return {
            'contract': contract,
            'stay_records': stay_records,
            'reschedules': reschedules,
            'cancellations': cancellations,
            'dispute_notes': dispute_notes
        }

    def detect_duplicate_nights(self, all_records: List[Dict]) -> List[Dict]:
        night_groups = defaultdict(list)
        for rec in all_records:
            contract = rec['contract']
            guest = contract.guest_name
            checkin = contract.checkin_date
            if guest and checkin:
                night_groups[(guest, checkin)].append(rec)
        duplicates = []
        for (guest, checkin), records in night_groups.items():
            if len(records) > 1:
                dup_info = {
                    'guest_name': guest,
                    'checkin_date': checkin,
                    'contracts': [r['contract'].contract_no for r in records],
                    'record_count': len(records)
                }
                duplicates.append(dup_info)
                self._log_warning(
                    f'发现重复房晚: {guest} {checkin}',
                    context=dup_info
                )
        return duplicates

    def process_cross_week_reschedule(self, reschedule: Reschedule,
                                      contract: Contract) -> Dict:
        is_cross, weeks_diff = DataValidator.detect_cross_week(
            reschedule.original_checkin,
            reschedule.new_checkin
        )
        result = {
            'is_cross_week': is_cross,
            'weeks_diff': weeks_diff,
            'is_revised': reschedule.is_revised,
            'revised_from_id': reschedule.revised_from_id,
            'has_conflict': False,
            'conflict_type': None,
            'conflict_record': None
        }
        if is_cross:
            self._log_warning(
                f'改期跨周: {reschedule.guest_name} 从第{reschedule.original_checkin.isocalendar()[1]}周改到第{reschedule.new_checkin.isocalendar()[1]}周',
                context={'reschedule_id': reschedule.id, 'weeks_diff': weeks_diff}
            )
            overlapping_cancel = self.db.query(Cancellation).filter(
                Cancellation.guest_name == reschedule.guest_name,
                Cancellation.checkin_date >= reschedule.original_checkin,
                Cancellation.checkin_date <= reschedule.new_checkin
            ).first()
            if overlapping_cancel:
                result['has_conflict'] = True
                result['conflict_type'] = 'CANCEL_NO_SHOW'
                result['conflict_record'] = overlapping_cancel
                self._log_warning(
                    f'改期跨周与取消/晚到冲突: {reschedule.guest_name}',
                    context={
                        'reschedule_id': reschedule.id,
                        'cancel_id': overlapping_cancel.id,
                        'cancel_type': overlapping_cancel.cancel_type
                    }
                )
        return result

    def sort_records_by_priority(self, records: Dict) -> List[Tuple[str, object]]:
        sorted_items = []
        for cancel in records['cancellations']:
            priority = 1 if cancel.cancel_type == 'NO_SHOW' else 2
            sorted_items.append(('CANCEL', cancel, priority, cancel.created_at))
        for reschedule in records['reschedules']:
            priority = 3
            if reschedule.is_revised:
                priority = 5
            elif reschedule.is_cross_week:
                priority = 4
            sorted_items.append(('RESCHEDULE', reschedule, priority, reschedule.created_at))
        for stay in records['stay_records']:
            priority = 6
            if stay.is_self_booked:
                priority = 7
            sorted_items.append(('STAY', stay, priority, stay.created_at))
        sorted_items.sort(key=lambda x: (x[2], x[3]))
        return [(item[0], item[1]) for item in sorted_items]

    def create_verification_result(self, contract: Contract,
                                    record_type: str,
                                    record,
                                    cross_week_info: Dict = None,
                                    sequence_no: int = None) -> VerificationResult:
        result = VerificationResult()
        result.contract_no = contract.contract_no
        result.hotel_name = contract.hotel_name
        result.guest_name = contract.guest_name
        result.id_card = contract.id_card
        result.contracted_nights = contract.contracted_nights or 0
        result.old_remark = contract.old_remark
        result.source_file = contract.source_file
        result.sequence_no = sequence_no or self._next_sequence()
        result.trace_id = DataValidator.generate_trace_id(
            contract.id, record_type, getattr(record, 'id', None)
        )
        if record_type == 'STAY':
            result.checkin_date = record.checkin_date or contract.checkin_date
            result.checkout_date = record.checkout_date or contract.checkout_date
            result.verified_nights = record.actual_nights or result.contracted_nights
            result.verified_amount = (record.actual_nights or 0) * (contract.contracted_rate or 0)
            result.is_self_booked = record.is_self_booked or False
            result.is_no_show = record.is_no_show or False
            result.related_record_type = 'STAY'
            result.related_record_id = record.id
            result.remark = record.remark
            if result.is_self_booked:
                result.category = 'SELF_COMPENSATE'
                result.status = 'SELF_BOOKED'
            elif result.is_no_show:
                result.category = 'CANCEL_NO_SHOW'
                result.status = 'NO_SHOW'
            else:
                result.category = 'NORMAL'
                result.status = 'CHECKED_IN'
        elif record_type == 'RESCHEDULE':
            is_revised = cross_week_info.get('is_revised', False) if cross_week_info else record.is_revised
            if is_revised and record.new_checkin:
                result.checkin_date = record.new_checkin
                result.checkout_date = record.new_checkout
            elif record.new_checkin:
                result.checkin_date = record.new_checkin
                result.checkout_date = record.new_checkout
            else:
                result.checkin_date = contract.checkin_date
                result.checkout_date = contract.checkout_date
            result.verified_nights = record.reschedule_nights or result.contracted_nights
            result.verified_amount = (record.reschedule_nights or 0) * (contract.contracted_rate or 0)
            result.is_cross_week = cross_week_info.get('is_cross_week', False) if cross_week_info else record.is_cross_week
            result.weeks_diff = cross_week_info.get('weeks_diff', 0) if cross_week_info else record.weeks_difference
            result.is_revised = is_revised
            result.related_record_type = 'RESCHEDULE'
            result.related_record_id = record.id
            result.remark = record.remark
            if cross_week_info and cross_week_info.get('has_conflict'):
                conflict = cross_week_info['conflict_record']
                result.cancel_type = conflict.cancel_type
                result.is_no_show = conflict.cancel_type == 'NO_SHOW'
                result.penalty_amount = conflict.penalty_amount or 0
            if is_revised:
                result.category = 'REVISED'
                if record.revised_from_id:
                    orig = self.db.query(Reschedule).get(record.revised_from_id)
                    if orig:
                        result.revised_from = orig.reschedule_no
            else:
                result.category = 'RESCHEDULE'
            result.status = 'RESCHEDULED'
        elif record_type == 'CANCEL':
            result.checkin_date = record.checkin_date or contract.checkin_date
            result.checkout_date = record.checkout_date or contract.checkout_date
            result.verified_nights = record.cancel_nights or result.contracted_nights
            result.verified_amount = 0
            result.penalty_amount = record.penalty_amount or 0
            result.cancel_type = record.cancel_type
            result.is_no_show = record.cancel_type == 'NO_SHOW'
            result.related_record_type = 'CANCEL'
            result.related_record_id = record.id
            result.remark = record.remark
            result.category = 'CANCEL_NO_SHOW'
            result.status = 'NO_SHOW' if result.is_no_show else 'CANCELLED'
        result.category_name = VERIFICATION_CATEGORY.get(result.category, result.category)
        result.status_name = ROOM_STATUS.get(result.status, result.status)
        return result

    def add_dispute_info(self, result: VerificationResult,
                          dispute_notes: List[DisputeNote],
                          stay_id: int = None):
        for note in dispute_notes:
            if stay_id and note.stay_record_id != stay_id:
                continue
            result.has_dispute = True
            result.dispute_content = (result.dispute_content + '; ' if result.dispute_content else '') + note.dispute_content
            result.dispute_resolved = note.is_resolved
            if not result.remark:
                result.remark = note.dispute_content
            elif note.dispute_content not in result.remark:
                result.remark += f'; [争议]{note.dispute_content}'
            break

    def process_contract(self, contract: Contract) -> List[VerificationResult]:
        records = self.match_contract_to_records(contract)
        results = []
        sorted_records = self.sort_records_by_priority(records)
        if not sorted_records:
            result = self.create_verification_result(
                contract, 'STAY',
                type('MockRecord', (), {
                    'checkin_date': contract.checkin_date,
                    'checkout_date': contract.checkout_date,
                    'actual_nights': contract.contracted_nights,
                    'is_self_booked': False,
                    'is_no_show': False,
                    'id': None,
                    'remark': contract.remark
                })(),
                sequence_no=self._next_sequence()
            )
            result.status = 'CONTRACTED'
            result.status_name = ROOM_STATUS['CONTRACTED']
            result.category = 'NORMAL'
            result.category_name = VERIFICATION_CATEGORY['NORMAL']
            self.add_dispute_info(result, records['dispute_notes'])
            results.append(result)
            self._log_warning(
                f'合同{contract.contract_no}无匹配记录，按合同原始信息核销',
                context={'contract_id': contract.id}
            )
            return results
        for record_type, record in sorted_records:
            cross_week_info = None
            if record_type == 'RESCHEDULE':
                cross_week_info = self.process_cross_week_reschedule(record, contract)
            seq = self._next_sequence()
            result = self.create_verification_result(
                contract, record_type, record, cross_week_info, seq
            )
            self.add_dispute_info(
                result, records['dispute_notes'],
                stay_id=record.id if record_type == 'STAY' else None
            )
            results.append(result)
        return results

    def verify_all(self, start_date: date = None, end_date: date = None,
                    hotel_name: str = None) -> Dict:
        self.warnings = []
        self.errors = []
        self.sequence_counter = 0
        query = self.db.query(Contract)
        if start_date:
            query = query.filter(Contract.checkin_date >= start_date)
        if end_date:
            query = query.filter(Contract.checkin_date <= end_date)
        if hotel_name:
            query = query.filter(Contract.hotel_name.like(f'%{hotel_name}%'))
        contracts = query.order_by(Contract.checkin_date, Contract.contract_no).all()
        all_results = []
        all_matched = []
        for contract in contracts:
            try:
                matched = self.match_contract_to_records(contract)
                all_matched.append(matched)
                results = self.process_contract(contract)
                all_results.extend(results)
            except MatchingException as e:
                self._log_error(str(e), e.context)
            except CrossWeekRescheduleException as e:
                self._log_error(str(e), e.context)
            except Exception as e:
                self._log_error(f'处理合同{contract.contract_no}出错: {str(e)}',
                               {'contract_id': contract.id})
        all_records_flat = []
        for matched in all_matched:
            all_records_flat.append(matched)
        duplicates = self.detect_duplicate_nights(all_records_flat)
        for dup in duplicates:
            for result in all_results:
                if (result.guest_name == dup['guest_name'] and
                    result.checkin_date == dup['checkin_date']):
                    result.remark = (result.remark + '; ' if result.remark else '') + \
                                   f'[警告]该房晚存在重复，涉及合同: {", ".join(dup["contracts"])}'
        all_results.sort(key=lambda x: (x.checkin_date or date.min, x.sequence_no))
        self._save_verification_sheets(all_results)
        return {
            'total_contracts': len(contracts),
            'total_results': len(all_results),
            'results': all_results,
            'duplicates': duplicates,
            'warnings': self.warnings,
            'errors': self.errors,
            'summary': self._generate_summary(all_results)
        }

    def _save_verification_sheets(self, results: List[VerificationResult]):
        existing_sheets = self.db.query(VerificationSheet).all()
        existing_map = {(s.contract_id, s.related_record_type, s.related_record_id): s
                        for s in existing_sheets}
        for result in results:
            contract = self.db.query(Contract).filter(
                Contract.contract_no == result.contract_no
            ).first()
            if not contract:
                continue
            key = (contract.id, result.related_record_type, result.related_record_id)
            if key in existing_map:
                sheet = existing_map[key]
                if result.is_revised and not sheet.is_revised:
                    new_sheet = VerificationSheet(
                        contract_id=contract.id,
                        sheet_no=DataValidator.generate_sheet_no(),
                        hotel_name=result.hotel_name,
                        guest_name=result.guest_name,
                        checkin_date=result.checkin_date,
                        checkout_date=result.checkout_date,
                        verified_nights=result.verified_nights,
                        verified_amount=result.verified_amount,
                        verification_date=date.today(),
                        category=result.category,
                        related_record_id=result.related_record_id,
                        related_record_type=result.related_record_type,
                        sequence_no=result.sequence_no,
                        is_revised=True,
                        original_sheet_id=sheet.id,
                        hotel_confirm_no=result.hotel_confirm_no,
                        remark=result.remark,
                        source_file=result.source_file
                    )
                    self.db.add(new_sheet)
            else:
                sheet = VerificationSheet(
                    contract_id=contract.id,
                    sheet_no=DataValidator.generate_sheet_no(),
                    hotel_name=result.hotel_name,
                    guest_name=result.guest_name,
                    checkin_date=result.checkin_date,
                    checkout_date=result.checkout_date,
                    verified_nights=result.verified_nights,
                    verified_amount=result.verified_amount,
                    verification_date=date.today(),
                    category=result.category,
                    related_record_id=result.related_record_id,
                    related_record_type=result.related_record_type,
                    sequence_no=result.sequence_no,
                    is_revised=result.is_revised,
                    hotel_confirm_no=result.hotel_confirm_no,
                    remark=result.remark,
                    source_file=result.source_file
                )
                self.db.add(sheet)
        self.db.commit()

    def _generate_summary(self, results: List[VerificationResult]) -> Dict:
        summary = {
            'total_nights': 0,
            'total_amount': 0,
            'by_category': defaultdict(lambda: {'count': 0, 'nights': 0, 'amount': 0}),
            'by_status': defaultdict(lambda: {'count': 0, 'nights': 0}),
            'cross_week_count': 0,
            'revised_count': 0,
            'no_show_count': 0,
            'self_booked_count': 0,
            'dispute_count': 0,
            'duplicate_count': 0
        }
        for r in results:
            summary['total_nights'] += r.verified_nights
            summary['total_amount'] += r.verified_amount
            cat = r.category or 'OTHER'
            summary['by_category'][cat]['count'] += 1
            summary['by_category'][cat]['nights'] += r.verified_nights
            summary['by_category'][cat]['amount'] += r.verified_amount
            status = r.status or 'OTHER'
            summary['by_status'][status]['count'] += 1
            summary['by_status'][status]['nights'] += r.verified_nights
            if r.is_cross_week:
                summary['cross_week_count'] += 1
            if r.is_revised:
                summary['revised_count'] += 1
            if r.is_no_show:
                summary['no_show_count'] += 1
            if r.is_self_booked:
                summary['self_booked_count'] += 1
            if r.has_dispute:
                summary['dispute_count'] += 1
        return dict(summary)

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import List, Optional, Tuple
import json

from app.models.database import (
    RoyaltyDetail, RoyaltyStatus, Currency, Platform, EventType,
    RoyaltyHistory, RoyaltyAccrual, AccrualDetail, ExchangeRate,
    Track, Producer, PlayReport
)
from app.schemas.royalty import (
    RoyaltyDetailCreate, RoyaltyDetailQuery, RoyaltyStatusUpdate,
    RoyaltyTrialCalculateRequest, RoyaltyAccrualCreate
)


class RoyaltyService:
    @staticmethod
    def get_exchange_rate(db: Session, from_currency: Currency, rate_date: datetime) -> Optional[Decimal]:
        rate = db.query(ExchangeRate).filter(
            and_(
                ExchangeRate.from_currency == from_currency,
                ExchangeRate.rate_date == rate_date.date()
            )
        ).first()
        return rate.rate if rate else None

    @staticmethod
    def calculate_amounts(
        original_amount: Decimal,
        original_currency: Currency,
        tax_rate: float,
        exchange_rate: Decimal
    ) -> Tuple[Decimal, Decimal, Decimal]:
        cny_amount = (original_amount * exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        withholding_tax = (cny_amount * Decimal(str(tax_rate))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        net_amount = cny_amount - withholding_tax
        return cny_amount, withholding_tax, net_amount

    @staticmethod
    def _parse_report_period_to_date(report_period: str) -> datetime:
        try:
            year = int(report_period[:4])
            quarter = int(report_period[5]) if len(report_period) > 5 else 1
            month_map = {1: 1, 2: 4, 3: 7, 4: 10}
            month = month_map.get(quarter, 1)
            return datetime(year, month, 1)
        except:
            return datetime.now()

    @staticmethod
    def create_royalty_detail(
        db: Session,
        detail_data: RoyaltyDetailCreate,
        rate_date: Optional[datetime] = None
    ) -> RoyaltyDetail:
        if rate_date is None:
            rate_date = RoyaltyService._parse_report_period_to_date(detail_data.report_period)
        exchange_rate = RoyaltyService.get_exchange_rate(db, detail_data.original_currency, rate_date)

        if exchange_rate is None:
            raise ValueError(
                f"未找到币种 {detail_data.original_currency.value} 在 {rate_date.date()} 的汇率"
            )

        cny_amount, withholding_tax, net_amount = RoyaltyService.calculate_amounts(
            detail_data.original_amount,
            detail_data.original_currency,
            detail_data.tax_rate,
            exchange_rate
        )

        db_detail = RoyaltyDetail(
            **detail_data.model_dump(),
            exchange_rate=exchange_rate,
            cny_amount=cny_amount,
            withholding_tax=withholding_tax,
            net_amount=net_amount,
            status=RoyaltyStatus.PENDING
        )
        db.add(db_detail)
        db.commit()
        db.refresh(db_detail)
        return db_detail

    @staticmethod
    def get_royalty_details(
        db: Session,
        query: RoyaltyDetailQuery
    ) -> Tuple[List[RoyaltyDetail], int]:
        filters = []
        if query.report_period:
            filters.append(RoyaltyDetail.report_period == query.report_period)
        if query.platform:
            filters.append(RoyaltyDetail.platform == query.platform)
        if query.producer_id:
            filters.append(RoyaltyDetail.producer_id == query.producer_id)
        if query.status:
            filters.append(RoyaltyDetail.status == query.status)
        if query.track_title:
            filters.append(RoyaltyDetail.track.has(Track.title.contains(query.track_title)))

        query_builder = db.query(RoyaltyDetail).filter(and_(*filters))
        total = query_builder.count()

        details = query_builder.order_by(RoyaltyDetail.created_at.desc()) \
            .offset((query.page - 1) * query.page_size) \
            .limit(query.page_size) \
            .all()

        return details, total

    @staticmethod
    def get_royalty_detail(db: Session, detail_id: int) -> Optional[RoyaltyDetail]:
        return db.query(RoyaltyDetail).filter(RoyaltyDetail.id == detail_id).first()

    @staticmethod
    def update_status(
        db: Session,
        detail_id: int,
        update_data: RoyaltyStatusUpdate
    ) -> RoyaltyDetail:
        detail = RoyaltyService.get_royalty_detail(db, detail_id)
        if not detail:
            raise ValueError(f"版税明细ID {detail_id} 不存在")

        old_status = detail.status

        history = RoyaltyHistory(
            royalty_detail_id=detail_id,
            event_type=EventType.STATUS_CHANGE,
            old_status=old_status,
            new_status=update_data.status,
            change_reason=update_data.change_reason,
            operator=update_data.operator
        )
        db.add(history)

        detail.status = update_data.status
        db.commit()
        db.refresh(detail)
        return detail

    @staticmethod
    def get_history(db: Session, detail_id: int) -> List[RoyaltyHistory]:
        return db.query(RoyaltyHistory).filter(
            RoyaltyHistory.royalty_detail_id == detail_id
        ).order_by(RoyaltyHistory.created_at.desc()).all()

    @staticmethod
    def trial_calculate(
        db: Session,
        request: RoyaltyTrialCalculateRequest
    ) -> dict:
        filters = [RoyaltyDetail.report_period == request.report_period]
        if request.platform:
            filters.append(RoyaltyDetail.platform == request.platform)
        if request.detail_ids:
            filters.append(RoyaltyDetail.id.in_(request.detail_ids))

        details = db.query(RoyaltyDetail).filter(and_(*filters)).all()

        if not details:
            raise ValueError("未找到符合条件的版税明细")

        total_original = Decimal('0')
        total_cny = Decimal('0')
        total_tax = Decimal('0')
        total_net = Decimal('0')
        currency_breakdown = {}

        for detail in details:
            total_original += detail.original_amount
            total_cny += detail.cny_amount
            total_tax += detail.withholding_tax
            total_net += detail.net_amount

            curr_key = detail.original_currency.value
            if curr_key not in currency_breakdown:
                currency_breakdown[curr_key] = {
                    'amount': Decimal('0'),
                    'rate': str(detail.exchange_rate),
                    'count': 0
                }
            currency_breakdown[curr_key]['amount'] += detail.original_amount
            currency_breakdown[curr_key]['count'] += 1

        conversion_note = RoyaltyService._generate_conversion_note(
            details, currency_breakdown, request.report_period
        )

        return {
            'total_records': len(details),
            'total_original_amount': total_original,
            'total_cny_amount': total_cny,
            'total_withholding_tax': total_tax,
            'total_net_amount': total_net,
            'currency_breakdown': currency_breakdown,
            'conversion_note': conversion_note,
            'details': details
        }

    @staticmethod
    def _generate_conversion_note(
        details: List[RoyaltyDetail],
        currency_breakdown: dict,
        report_period: str
    ) -> str:
        note_parts = [
            f"【币种换算口径说明】",
            f"报表期间：{report_period}",
            f"换算规则：按各币种入账当月1日央行中间价折算为人民币",
            "",
            f"各币种明细："
        ]

        for currency, data in currency_breakdown.items():
            note_parts.append(
                f"- {currency}: 原币金额 {data['amount']}，汇率 {data['rate']}，记录数 {data['count']}条"
            )

        note_parts.extend([
            "",
            f"预提税说明：根据《内地和香港特别行政区关于对所得避免双重征税和防止偷漏税的安排》，",
            f"特许权使用费预提所得税税率为 7%（需提供税收居民身份证明），未提供证明则按 10% 计征。",
            "",
            f"如对金额有疑问，请联系版权财务部核对。"
        ])

        return "\n".join(note_parts)

    @staticmethod
    def create_accrual(
        db: Session,
        request: RoyaltyAccrualCreate
    ) -> RoyaltyAccrual:
        details = db.query(RoyaltyDetail).filter(
            RoyaltyDetail.id.in_(request.detail_ids)
        ).all()

        if not details:
            raise ValueError("未找到指定的版税明细")

        invalid_details = [d for d in details if d.status != RoyaltyStatus.VERIFIED]
        if invalid_details:
            invalid_ids = [d.id for d in invalid_details]
            raise ValueError(
                f"以下明细状态不正确（需为已验证）: {invalid_ids}。"
                f"请先完成曲目核对和金额确认后再执行归集。"
            )

        total_original = sum((d.original_amount for d in details), Decimal('0'))
        total_cny = sum((d.cny_amount for d in details), Decimal('0'))
        total_tax = sum((d.withholding_tax for d in details), Decimal('0'))
        total_net = sum((d.net_amount for d in details), Decimal('0'))

        accrual_ref = f"ACCR-{request.report_period}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        currency_breakdown = {}
        for detail in details:
            curr_key = detail.original_currency.value
            if curr_key not in currency_breakdown:
                currency_breakdown[curr_key] = {
                    'amount': Decimal('0'),
                    'rate': str(detail.exchange_rate),
                    'count': 0
                }
            currency_breakdown[curr_key]['amount'] += detail.original_amount
            currency_breakdown[curr_key]['count'] += 1

        conversion_note = RoyaltyService._generate_conversion_note(
            details, currency_breakdown, request.report_period
        )

        db_accrual = RoyaltyAccrual(
            accrual_reference=accrual_ref,
            report_period=request.report_period,
            platform=request.platform,
            total_original_amount=total_original,
            total_cny_amount=total_cny,
            total_withholding_tax=total_tax,
            total_net_amount=total_net,
            currency_conversion_note=conversion_note,
            created_by=request.created_by
        )
        db.add(db_accrual)
        db.flush()

        for detail in details:
            db.add(AccrualDetail(
                accrual_id=db_accrual.id,
                royalty_detail_id=detail.id
            ))

            history = RoyaltyHistory(
                royalty_detail_id=detail.id,
                event_type=EventType.ACCRUAL,
                old_status=detail.status,
                new_status=RoyaltyStatus.ACCRUED,
                change_reason=f"版税归集，归集单号：{accrual_ref}",
                operator=request.created_by
            )
            db.add(history)

            detail.status = RoyaltyStatus.ACCRUED

        db.commit()
        db.refresh(db_accrual)
        return db_accrual

    @staticmethod
    def get_accruals(
        db: Session,
        report_period: Optional[str] = None,
        platform: Optional[Platform] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[RoyaltyAccrual], int]:
        filters = []
        if report_period:
            filters.append(RoyaltyAccrual.report_period == report_period)
        if platform:
            filters.append(RoyaltyAccrual.platform == platform)

        query = db.query(RoyaltyAccrual).filter(and_(*filters))
        total = query.count()
        accruals = query.order_by(RoyaltyAccrual.created_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        return accruals, total

    @staticmethod
    def get_accrual_details(db: Session, accrual_id: int) -> List[RoyaltyDetail]:
        accrual = db.query(RoyaltyAccrual).filter(RoyaltyAccrual.id == accrual_id).first()
        if not accrual:
            raise ValueError(f"归集记录ID {accrual_id} 不存在")
        return accrual.details

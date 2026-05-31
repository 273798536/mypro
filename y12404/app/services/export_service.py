import pandas as pd
from io import BytesIO
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import os

from app.models.database import RoyaltyDetail, RoyaltyAccrual, ExportLog, EventType, RoyaltyHistory
from app.schemas.royalty import RoyaltyDetailQuery


class ExportService:
    @staticmethod
    def export_royalty_details(
        db: Session, query: RoyaltyDetailQuery, exported_by: str
    ) -> BytesIO:
        from app.services.royalty_service import RoyaltyService

        details, total = RoyaltyService.get_royalty_details(db, query)

        if not details:
            raise ValueError("没有可导出的数据")

        data = []
        for d in details:
            row = {
                'ID': d.id,
                '平台': d.platform.value if d.platform else '',
                '报表期间': d.report_period,
                '曲目名称': d.track.title if d.track else '',
                'ISRC': d.track.isrc if d.track else '',
                '制作人': d.producer.name if d.producer else '',
                '播放量': d.streams or 0,
                '原始币种': d.original_currency.value if d.original_currency else '',
                '原始金额': float(d.original_amount) if d.original_amount else 0,
                '汇率': float(d.exchange_rate) if d.exchange_rate else 0,
                '人民币金额': float(d.cny_amount) if d.cny_amount else 0,
                '税率': f"{d.tax_rate * 100:.1f}%",
                '预提税': float(d.withholding_tax) if d.withholding_tax else 0,
                '净额': float(d.net_amount) if d.net_amount else 0,
                '状态': ExportService._get_status_text(d.status),
                '备注': d.notes or '',
                '创建时间': d.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            data.append(row)

        df = pd.DataFrame(data)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='版税明细', index=False)

            ExportService._add_conversion_sheet(writer, details)

        output.seek(0)

        ExportService._log_export(db, 'royalty_details', f"版税明细_{datetime.now().strftime('%Y%m%d')}.xlsx", total, exported_by, query)

        return output

    @staticmethod
    def _get_status_text(status) -> str:
        status_map = {
            'pending': '待处理',
            'verified': '已验证',
            'accrued': '已归集',
            'settled': '已结算',
            'disputed': '有异议'
        }
        return status_map.get(status.value if hasattr(status, 'value') else status, '未知')

    @staticmethod
    def _add_conversion_sheet(writer, details):
        currency_data = {}
        for d in details:
            curr = d.original_currency.value
            if curr not in currency_data:
                currency_data[curr] = {
                    '币种': curr,
                    '汇率': float(d.exchange_rate) if d.exchange_rate else 0,
                    '原始金额': 0,
                    '人民币金额': 0,
                    '预提税': 0,
                    '记录数': 0
                }
            currency_data[curr]['原始金额'] += float(d.original_amount) if d.original_amount else 0
            currency_data[curr]['人民币金额'] += float(d.cny_amount) if d.cny_amount else 0
            currency_data[curr]['预提税'] += float(d.withholding_tax) if d.withholding_tax else 0
            currency_data[curr]['记录数'] += 1

        df = pd.DataFrame(list(currency_data.values()))
        df.to_excel(writer, sheet_name='币种汇总', index=False)

    @staticmethod
    def export_accrual_report(
        db: Session, accrual_id: int, exported_by: str
    ) -> BytesIO:
        accrual = db.query(RoyaltyAccrual).filter(RoyaltyAccrual.id == accrual_id).first()

        if not accrual:
            raise ValueError(f"归集记录ID {accrual_id} 不存在")

        details = accrual.details

        output = BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            summary_data = [{
                '归集单号': accrual.accrual_reference,
                '报表期间': accrual.report_period,
                '平台': accrual.platform.value if accrual.platform else '',
                '原始金额合计': float(accrual.total_original_amount),
                '人民币金额合计': float(accrual.total_cny_amount),
                '预提税合计': float(accrual.total_withholding_tax),
                '净额合计': float(accrual.total_net_amount),
                '创建人': accrual.created_by,
                '创建时间': accrual.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }]
            pd.DataFrame(summary_data).T.to_excel(writer, sheet_name='归集汇总', header=False)

            detail_data = []
            for d in details:
                row = {
                    '曲目名称': d.track.title if d.track else '',
                    'ISRC': d.track.isrc if d.track else '',
                    '制作人': d.producer.name if d.producer else '',
                    '播放量': d.streams or 0,
                    '原始币种': d.original_currency.value,
                    '原始金额': float(d.original_amount),
                    '汇率': float(d.exchange_rate),
                    '人民币金额': float(d.cny_amount),
                    '税率': f"{d.tax_rate * 100:.1f}%",
                    '预提税': float(d.withholding_tax),
                    '净额': float(d.net_amount)
                }
                detail_data.append(row)
            pd.DataFrame(detail_data).to_excel(writer, sheet_name='明细数据', index=False)

            note_df = pd.DataFrame({'说明': [accrual.currency_conversion_note]})
            note_df.to_excel(writer, sheet_name='换算说明', index=False)

        output.seek(0)

        ExportService._log_export(
            db,
            'accrual_report',
            f'版税归集报告_{accrual.accrual_reference}.xlsx',
            len(details),
            exported_by
        )

        return output

    @staticmethod
    def _log_export(
        db: Session,
        export_type: str,
        file_name: str,
        record_count: int,
        exported_by: str,
        filters=None
    ):
        log = ExportLog(
            export_type=export_type,
            file_name=file_name,
            filters=str(filters) if filters else '',
            record_count=record_count,
            exported_by=exported_by
        )
        db.add(log)
        db.commit()

    @staticmethod
    def get_export_logs(
        db: Session, page: int = 1, page_size: int = 50
    ):
        query = db.query(ExportLog).order_by(ExportLog.created_at.desc())
        total = query.count()
        logs = query.offset((page - 1) * page_size).limit(page_size).all()
        return logs, total

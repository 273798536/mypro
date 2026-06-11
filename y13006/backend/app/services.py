from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from dateutil import parser as date_parser

from .models import (
    ApprovalEmail, CashflowRecord, ManualRemark, ImportLog, Attachment,
    EmailStatus, RecordStatus, ImportAction
)
from .parsers import parse_mixed_tax_rate, parse_amount, is_valid_counterparty, generate_unique_key
from .database import SessionLocal


def _ensure_datetime(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return date_parser.parse(str(val))
    except Exception:
        return None


class CashflowImportService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.batch_no = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    def _log_import(self, action: ImportAction, email_id: Optional[int],
                    record_id: Optional[int], row: Optional[int],
                    detail: str, imported_by: str = "system") -> None:
        log = ImportLog(
            batch_no=self.batch_no,
            approval_email_id=email_id,
            cashflow_record_id=record_id,
            original_row_number=row,
            action=action,
            detail=detail,
            imported_by=imported_by
        )
        self.db.add(log)

    def import_email_records(self, email_data: Dict[str, Any], imported_by: str = "system") -> Dict[str, Any]:
        result = {"created": 0, "updated": 0, "skipped": 0, "suspended": 0, "errors": 0, "details": [], "batch_no": self.batch_no}

        base_msg_id = email_data["email_message_id"]
        existing_email = self.db.query(ApprovalEmail).filter_by(email_message_id=base_msg_id).first()
        msg_id = base_msg_id
        if existing_email:
            ts = datetime.now().strftime("%Y%m%d%H%M%S%f")
            msg_id = f"{base_msg_id}-reimport-{ts}"

        email = ApprovalEmail(
            email_message_id=msg_id,
            subject=email_data.get("subject", ""),
            sender=email_data.get("sender", ""),
            recipient=email_data.get("recipient", ""),
            sent_at=_ensure_datetime(email_data.get("sent_at")),
            received_at=_ensure_datetime(email_data.get("received_at")),
            raw_content=email_data.get("raw_content", ""),
            status=EmailStatus.PROCESSING,
            is_attachment_late=email_data.get("is_attachment_late", False)
        )
        self.db.add(email)
        self.db.flush()

        is_reimport = existing_email is not None
        if is_reimport:
            self._log_import(
                ImportAction.SKIPPED, email.id, None, None,
                f"重复导入审批邮件：原始email_message_id='{base_msg_id}'已存在，本次导入使用'{msg_id}'。"
                f"下级记录将按unique_key逐条去重，不会翻倍。",
                imported_by
            )

        for att_data in email_data.get("attachments", []):
            attachment = Attachment(
                approval_email_id=email.id,
                file_name=att_data["file_name"],
                is_arrived=att_data.get("is_arrived", False),
                arrived_at=_ensure_datetime(att_data.get("arrived_at")),
                raw_content=str(att_data.get("rows", []))
            )
            self.db.add(attachment)

            if not att_data.get("is_arrived", False):
                for row_data in att_data.get("rows", []):
                    result["suspended"] += 1
                    voucher = row_data.get("voucher_number", "")
                    detail = (
                        f"附件晚到已挂起：文件'{att_data['file_name']}'未到达，"
                        f"对应行号{row_data.get('row_number')}凭证号{voucher}。"
                        f"请项目经理确认后再处理。"
                    )
                    suspended_record = CashflowRecord(
                        approval_email_id=email.id,
                        original_row_number=row_data.get("row_number"),
                        raw_mixed_tax_rate_column=row_data.get("raw_mixed_tax_rate"),
                        voucher_number=voucher,
                        currency=row_data.get("currency"),
                        counterparty=row_data.get("counterparty"),
                        unique_key=generate_unique_key(voucher, row_data.get("transaction_date"), row_data.get("amount")),
                        status=RecordStatus.SUSPENDED,
                        abnormal_reason=detail,
                        raw_data=str(row_data)
                    )
                    self.db.add(suspended_record)
                    self.db.flush()
                    self._log_import(ImportAction.SUSPENDED, email.id, suspended_record.id,
                                     row_data.get("row_number"), detail, imported_by)
                    result["details"].append({"row": row_data.get("row_number"), "status": "suspended", "detail": detail, "voucher": voucher})
                continue

            for row_data in att_data.get("rows", []):
                row_num = row_data.get("row_number")
                voucher = row_data.get("voucher_number", "")
                errors = []

                tax_amount, exchange_rate, tax_rate_error = parse_mixed_tax_rate(
                    row_data.get("raw_mixed_tax_rate", "")
                )
                if tax_rate_error:
                    errors.append(tax_rate_error)

                amount, amount_error = parse_amount(row_data.get("amount"))
                if amount_error:
                    errors.append(amount_error)

                if not is_valid_counterparty(row_data.get("counterparty", "")):
                    errors.append(f"对手方无效：'{row_data.get('counterparty')}'")

                unique_key = generate_unique_key(voucher, row_data.get("transaction_date"), amount)
                existing = self.db.query(CashflowRecord).filter_by(unique_key=unique_key).first()

                if existing:
                    result["skipped"] += 1
                    remark_status = f"（is_manual_remark_updated={existing.is_manual_remark_updated}）"
                    if existing.is_manual_remark_updated:
                        remark_count = self.db.query(ManualRemark).filter_by(cashflow_record_id=existing.id).count()
                        remark_status += f"，含{remark_count}条人工备注，均未覆盖"
                    detail = (
                        f"重复导入已跳过：凭证号{voucher}唯一键{unique_key}已存在。"
                        f"未覆盖原有数据和人工备注{remark_status}。"
                        f"原始来源：审批邮件第{existing.original_row_number}行。"
                    )
                    self._log_import(ImportAction.SKIPPED, email.id, existing.id, row_num, detail, imported_by)
                    result["details"].append({"row": row_num, "status": "skipped", "detail": detail, "voucher": voucher})
                    continue

                if errors:
                    result["errors"] += 1
                    error_detail = "；".join(errors) + f"。原始数据来源：审批邮件第{row_num}行，对象：{voucher or '未知凭证'}。"
                    abnormal_record = CashflowRecord(
                        approval_email_id=email.id,
                        original_row_number=row_num,
                        raw_mixed_tax_rate_column=row_data.get("raw_mixed_tax_rate"),
                        amount=amount,
                        currency=row_data.get("currency"),
                        counterparty=row_data.get("counterparty"),
                        voucher_number=voucher,
                        unique_key=unique_key,
                        status=RecordStatus.ABNORMAL,
                        abnormal_reason=error_detail,
                        raw_data=str(row_data)
                    )
                    self.db.add(abnormal_record)
                    self.db.flush()
                    self._log_import(ImportAction.ERROR, email.id, abnormal_record.id, row_num, error_detail, imported_by)
                    result["details"].append({"row": row_num, "status": "abnormal", "detail": error_detail, "voucher": voucher})
                    continue

                normal_record = CashflowRecord(
                    approval_email_id=email.id,
                    original_row_number=row_num,
                    raw_mixed_tax_rate_column=row_data.get("raw_mixed_tax_rate"),
                    tax_amount=tax_amount,
                    exchange_rate=exchange_rate,
                    transaction_date=_ensure_datetime(row_data.get("transaction_date")),
                    amount=amount,
                    currency=row_data.get("currency"),
                    counterparty=row_data.get("counterparty"),
                    voucher_number=voucher,
                    unique_key=unique_key,
                    status=RecordStatus.NORMAL,
                    raw_data=str(row_data)
                )
                self.db.add(normal_record)
                self.db.flush()
                result["created"] += 1
                detail = f"正常导入：凭证号{voucher}。审批邮件第{row_num}行。税费={tax_amount}, 汇率={exchange_rate}"
                self._log_import(ImportAction.CREATED, email.id, normal_record.id, row_num, detail, imported_by)
                result["details"].append({"row": row_num, "status": "normal", "detail": detail, "voucher": voucher})

        email.status = EmailStatus.COMPLETED
        self.db.commit()
        return result

    def supplement_record(self, record_id: int, supplement_data: Dict[str, Any], operator: str) -> Optional[CashflowRecord]:
        record = self.db.query(CashflowRecord).filter_by(id=record_id).first()
        if not record:
            return None
        if record.status != RecordStatus.SUSPENDED:
            return None

        old_status = record.status.value
        old_reason = record.abnormal_reason

        if supplement_data.get("tax_amount") is not None:
            record.tax_amount = supplement_data["tax_amount"]
        if supplement_data.get("exchange_rate") is not None:
            record.exchange_rate = supplement_data["exchange_rate"]
        if supplement_data.get("amount") is not None:
            record.amount = supplement_data["amount"]

        record.status = RecordStatus.SUPPLEMENTARY
        record.abnormal_reason = (
            f"【已补录】原挂起原因：{old_reason}。"
            f"补录操作：由{operator}于{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}确认补录，"
            f"补录后税费={record.tax_amount}，汇率={record.exchange_rate}。"
        )

        self.db.flush()

        attachment = (
            self.db.query(Attachment)
            .filter_by(approval_email_id=record.approval_email_id)
            .filter_by(is_arrived=False)
            .first()
        )
        if attachment:
            attachment.is_arrived = True
            attachment.arrived_at = datetime.utcnow()

        email = self.db.query(ApprovalEmail).filter_by(id=record.approval_email_id).first()
        if email:
            any_suspended = (
                self.db.query(CashflowRecord)
                .filter_by(approval_email_id=email.id)
                .filter_by(status=RecordStatus.SUSPENDED)
                .first()
            )
            if not any_suspended:
                email.status = EmailStatus.COMPLETED
                email.is_attachment_late = False

        self._log_import(
            ImportAction.UPDATED,
            record.approval_email_id,
            record.id,
            record.original_row_number,
            f"补录完成：凭证号{record.voucher_number}由'{old_status}'变更为'supplementary'。操作人：{operator}。补录数据：{supplement_data}",
            operator
        )

        self.db.commit()
        self.db.refresh(record)
        return record

    def update_manual_remark(self, record_id: int, remark_content: str, operator: str) -> Optional[ManualRemark]:
        record = self.db.query(CashflowRecord).filter_by(id=record_id).first()
        if not record:
            return None

        remark = ManualRemark(
            cashflow_record_id=record_id,
            remark_content=remark_content,
            operator=operator,
            is_export_synced=False
        )
        self.db.add(remark)
        record.is_manual_remark_updated = True
        self.db.commit()
        self.db.refresh(remark)
        return remark

    def sync_export_remarks(self) -> int:
        unsynced = self.db.query(ManualRemark).filter_by(is_export_synced=False).all()
        count = 0
        for rm in unsynced:
            rm.is_export_synced = True
            count += 1
        if count > 0:
            self.db.commit()
        return count

    def close(self):
        self.db.close()

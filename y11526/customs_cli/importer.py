import os
import hashlib
import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
from sqlalchemy.orm import Session

from .database import (
    get_session, DataSource, DataSourceType, ImportStrategy,
    Package, TrackingNode, TaxNotice, SupplierStatement, ApprovalEmail,
    AuditLog, AsyncTask, TaskStatus, ExceptionRecord, ExceptionType, ExceptionStage
)


def generate_batch_id() -> str:
    return f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"


def calculate_file_hash(filepath: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def is_empty_value(val) -> bool:
    if val is None:
        return True
    if isinstance(val, float) and pd.isna(val):
        return True
    s = str(val).strip()
    if not s:
        return True
    if s.lower() in ("nan", "none", "null", "n/a", "na"):
        return True
    return False


def safe_str_value(val) -> Optional[str]:
    if is_empty_value(val):
        return None
    return str(val).strip()


def log_audit(session: Session, batch_id: str, table_name: str, record_id: int,
              action: str, field_name: str = None, old_value: str = None,
              new_value: str = None, changed_by: str = "system",
              comment: str = None, source_type: str = None, original_row: int = None):
    audit = AuditLog(
        batch_id=batch_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        changed_by=changed_by,
        changed_at=datetime.utcnow(),
        comment=comment,
        source_type=source_type,
        original_row=original_row
    )
    session.add(audit)


class BaseImporter:
    def __init__(self, session: Session, source_type: DataSourceType,
                 batch_id: str, strategy: ImportStrategy, user: str = "system"):
        self.session = session
        self.source_type = source_type
        self.batch_id = batch_id
        self.strategy = strategy
        self.user = user
        self.success_count = 0
        self.failed_count = 0
        self.failed_rows: List[Tuple[int, str]] = []
        self.source_id = None

    def import_row(self, row: pd.Series, original_row: int) -> Optional[int]:
        raise NotImplementedError

    def log_exception(self, original_row: int, tracking_number: str,
                      exception_type: ExceptionType, message: str,
                      field_name: str = None, expected: str = None,
                      actual: str = None, severity: str = "error",
                      exception_stage: ExceptionStage = ExceptionStage.IMPORT):
        exc = ExceptionRecord(
            batch_id=self.batch_id,
            source_id=self.source_id,
            exception_type=exception_type,
            exception_stage=exception_stage,
            severity=severity,
            tracking_number=None if is_empty_value(tracking_number) else str(tracking_number),
            original_row=original_row,
            field_name=field_name,
            expected_value=str(expected) if expected else None,
            actual_value=str(actual) if actual else None,
            message=message
        )
        self.session.add(exc)


class DeclarationImporter(BaseImporter):
    def __init__(self, session: Session, batch_id: str, strategy: ImportStrategy, user: str = "system"):
        super().__init__(session, DataSourceType.DECLARATION, batch_id, strategy, user)

    def import_row(self, row: pd.Series, original_row: int) -> Optional[int]:
        try:
            raw_tracking = row.get("tracking_number", row.get("运单号", ""))
            if is_empty_value(raw_tracking):
                self.failed_count += 1
                self.failed_rows.append((original_row, "缺少运单号"))
                self.log_exception(original_row, None, ExceptionType.MISSING_DATA,
                                   "缺少运单号", field_name="tracking_number")
                return None

            tracking_number = str(raw_tracking).strip()

            existing = self.session.query(Package).filter(
                Package.tracking_number == tracking_number
            ).first()

            if existing:
                if self.strategy == ImportStrategy.IGNORE:
                    self.success_count += 1
                    return existing.id
                elif self.strategy == ImportStrategy.OVERWRITE:
                    for key, value in {
                        "batch_id": self.batch_id,
                        "original_row": original_row,
                        "declaration_number": str(row.get("declaration_number", row.get("申报单号", ""))),
                        "supplier": str(row.get("supplier", row.get("供应商", ""))),
                        "sender": str(row.get("sender", row.get("发件人", ""))),
                        "receiver": str(row.get("receiver", row.get("收件人", ""))),
                        "weight": float(row.get("weight", row.get("重量", 0)) or 0),
                        "declared_value": float(row.get("declared_value", row.get("申报价值", 0)) or 0),
                        "currency": str(row.get("currency", row.get("币种", "USD"))),
                        "origin_country": str(row.get("origin_country", row.get("始发国", ""))),
                        "destination_country": str(row.get("destination_country", row.get("目的国", ""))),
                        "item_description": str(row.get("item_description", row.get("商品描述", ""))),
                        "hs_code": str(row.get("hs_code", row.get("HS编码", ""))),
                    }.items():
                        old_val = getattr(existing, key)
                        if old_val != value:
                            log_audit(self.session, self.batch_id, "packages", existing.id,
                                      "update", key, old_val, value, self.user,
                                      source_type=self.source_type.value, original_row=original_row)
                            setattr(existing, key, value)
                    self.success_count += 1
                    return existing.id

            split_flag = str(row.get("split_flag", row.get("拆分标记", ""))).lower() in ("true", "1", "yes", "是")
            parent_package_id = None

            if split_flag:
                parent_tracking = safe_str_value(row.get("parent_package_tracking", row.get("父包裹运单号", "")))
                if parent_tracking:
                    parent = self.session.query(Package).filter(
                        Package.tracking_number == parent_tracking
                    ).first()
                    if parent:
                        parent_package_id = parent.id

            package = Package(
                batch_id=self.batch_id,
                original_row=original_row,
                tracking_number=tracking_number,
                package_number=str(row.get("package_number", row.get("包裹号", tracking_number))),
                declaration_number=str(row.get("declaration_number", row.get("申报单号", ""))),
                supplier=str(row.get("supplier", row.get("供应商", ""))),
                sender=str(row.get("sender", row.get("发件人", ""))),
                receiver=str(row.get("receiver", row.get("收件人", ""))),
                weight=float(row.get("weight", row.get("重量", 0)) or 0),
                declared_value=float(row.get("declared_value", row.get("申报价值", 0)) or 0),
                currency=str(row.get("currency", row.get("币种", "USD"))),
                origin_country=str(row.get("origin_country", row.get("始发国", ""))),
                destination_country=str(row.get("destination_country", row.get("目的国", ""))),
                item_description=str(row.get("item_description", row.get("商品描述", ""))),
                hs_code=str(row.get("hs_code", row.get("HS编码", ""))),
                split_flag=split_flag,
                parent_package_id=parent_package_id,
            )
            self.session.add(package)
            self.session.flush()

            log_audit(self.session, self.batch_id, "packages", package.id,
                      "create", changed_by=self.user,
                      source_type=self.source_type.value, original_row=original_row)

            self.success_count += 1
            return package.id
        except Exception as e:
            self.failed_count += 1
            self.failed_rows.append((original_row, str(e)))
            self.log_exception(original_row, row.get("tracking_number", ""),
                               ExceptionType.INVALID_FORMAT, str(e))
            return None


class TrackingImporter(BaseImporter):
    def __init__(self, session: Session, batch_id: str, strategy: ImportStrategy, user: str = "system"):
        super().__init__(session, DataSourceType.TRACKING, batch_id, strategy, user)

    def import_row(self, row: pd.Series, original_row: int) -> Optional[int]:
        try:
            raw_tracking = row.get("tracking_number", row.get("运单号", ""))
            raw_node_time = row.get("node_time", row.get("节点时间", ""))

            if is_empty_value(raw_tracking) or is_empty_value(raw_node_time):
                self.failed_count += 1
                self.failed_rows.append((original_row, "缺少运单号或节点时间"))
                self.log_exception(original_row, raw_tracking, ExceptionType.MISSING_DATA,
                                   "缺少运单号或节点时间")
                return None

            tracking_number = str(raw_tracking).strip()
            node_time_str = str(raw_node_time).strip()

            try:
                node_time = pd.to_datetime(node_time_str).to_pydatetime()
            except:
                node_time = datetime.utcnow()

            existing = self.session.query(TrackingNode).filter(
                TrackingNode.tracking_number == tracking_number,
                TrackingNode.node_time == node_time
            ).first()

            if existing and self.strategy == ImportStrategy.IGNORE:
                self.success_count += 1
                return existing.id

            node = TrackingNode(
                batch_id=self.batch_id,
                original_row=original_row,
                tracking_number=tracking_number,
                node_time=node_time,
                node_location=str(row.get("node_location", row.get("节点地点", ""))),
                node_status=str(row.get("node_status", row.get("节点状态", ""))),
                node_description=str(row.get("node_description", row.get("节点描述", ""))),
                operator=str(row.get("operator", row.get("操作员", ""))),
            )
            self.session.add(node)
            self.session.flush()

            log_audit(self.session, self.batch_id, "tracking_nodes", node.id,
                      "create", changed_by=self.user,
                      source_type=self.source_type.value, original_row=original_row)

            self.success_count += 1
            return node.id
        except Exception as e:
            self.failed_count += 1
            self.failed_rows.append((original_row, str(e)))
            return None


class TaxNoticeImporter(BaseImporter):
    def __init__(self, session: Session, batch_id: str, strategy: ImportStrategy, user: str = "system"):
        super().__init__(session, DataSourceType.TAX_NOTICE, batch_id, strategy, user)

    def import_row(self, row: pd.Series, original_row: int) -> Optional[int]:
        try:
            raw_notice = row.get("notice_number", row.get("通知书号", ""))
            raw_tracking = row.get("tracking_number", row.get("运单号", ""))

            if is_empty_value(raw_notice):
                self.failed_count += 1
                self.failed_rows.append((original_row, "缺少通知书号"))
                self.log_exception(original_row, raw_tracking, ExceptionType.MISSING_DATA,
                                   "缺少通知书号", field_name="notice_number")
                return None

            notice_number = str(raw_notice).strip()
            tracking_number = None if is_empty_value(raw_tracking) else str(raw_tracking).strip()

            existing = self.session.query(TaxNotice).filter(
                TaxNotice.notice_number == notice_number
            ).first()

            if existing:
                if self.strategy == ImportStrategy.IGNORE:
                    self.success_count += 1
                    return existing.id
                elif self.strategy == ImportStrategy.OVERWRITE:
                    for key, value in {
                        "batch_id": self.batch_id,
                        "original_row": original_row,
                        "tracking_number": tracking_number,
                        "declaration_number": str(row.get("declaration_number", row.get("申报单号", ""))),
                        "tax_type": str(row.get("tax_type", row.get("税种", ""))),
                        "tax_amount": float(row.get("tax_amount", row.get("税额", 0)) or 0),
                        "tax_currency": str(row.get("tax_currency", row.get("币种", "USD"))),
                        "payer": str(row.get("payer", row.get("纳税人", ""))),
                        "tax_authority": str(row.get("tax_authority", row.get("税务机关", ""))),
                        "status": str(row.get("status", row.get("状态", "unpaid"))),
                    }.items():
                        old_val = getattr(existing, key)
                        if old_val != value:
                            log_audit(self.session, self.batch_id, "tax_notices", existing.id,
                                      "update", key, old_val, value, self.user,
                                      source_type=self.source_type.value, original_row=original_row)
                            setattr(existing, key, value)
                    self.success_count += 1
                    return existing.id

            notice = TaxNotice(
                batch_id=self.batch_id,
                original_row=original_row,
                notice_number=notice_number,
                tracking_number=tracking_number,
                declaration_number=str(row.get("declaration_number", row.get("申报单号", ""))),
                tax_type=str(row.get("tax_type", row.get("税种", ""))),
                tax_amount=float(row.get("tax_amount", row.get("税额", 0)) or 0),
                tax_currency=str(row.get("tax_currency", row.get("币种", "USD"))),
                payer=str(row.get("payer", row.get("纳税人", ""))),
                tax_authority=str(row.get("tax_authority", row.get("税务机关", ""))),
                status=str(row.get("status", row.get("状态", "unpaid"))),
                remark=str(row.get("remark", row.get("备注", ""))),
            )
            self.session.add(notice)
            self.session.flush()

            log_audit(self.session, self.batch_id, "tax_notices", notice.id,
                      "create", changed_by=self.user,
                      source_type=self.source_type.value, original_row=original_row)

            self.success_count += 1
            return notice.id
        except Exception as e:
            self.failed_count += 1
            self.failed_rows.append((original_row, str(e)))
            return None


class SupplierStatementImporter(BaseImporter):
    def __init__(self, session: Session, batch_id: str, strategy: ImportStrategy, user: str = "system"):
        super().__init__(session, DataSourceType.SUPPLIER_STATEMENT, batch_id, strategy, user)

    def import_row(self, row: pd.Series, original_row: int) -> Optional[int]:
        try:
            raw_statement = row.get("statement_number", row.get("对账单号", ""))
            raw_tracking = row.get("tracking_number", row.get("运单号", ""))

            if is_empty_value(raw_statement):
                self.failed_count += 1
                self.failed_rows.append((original_row, "缺少对账单号"))
                self.log_exception(original_row, raw_tracking,
                                   ExceptionType.MISSING_DATA, "缺少对账单号",
                                   field_name="statement_number")
                return None

            statement_number = str(raw_statement).strip()
            tracking_number = None if is_empty_value(raw_tracking) else str(raw_tracking).strip()

            existing = self.session.query(SupplierStatement).filter(
                SupplierStatement.statement_number == statement_number
            ).first()

            if existing:
                if self.strategy == ImportStrategy.IGNORE:
                    self.success_count += 1
                    return existing.id
                elif self.strategy == ImportStrategy.OVERWRITE:
                    for key, value in {
                        "batch_id": self.batch_id,
                        "original_row": original_row,
                        "supplier": str(row.get("supplier", row.get("供应商", ""))),
                        "tracking_number": str(row.get("tracking_number", row.get("运单号", ""))),
                        "declaration_number": str(row.get("declaration_number", row.get("申报单号", ""))),
                        "invoice_amount": float(row.get("invoice_amount", row.get("发票金额", 0)) or 0),
                        "currency": str(row.get("currency", row.get("币种", "USD"))),
                        "tax_amount": float(row.get("tax_amount", row.get("税额", 0)) or 0),
                        "status": str(row.get("status", row.get("状态", "pending"))),
                    }.items():
                        old_val = getattr(existing, key)
                        if old_val != value:
                            log_audit(self.session, self.batch_id, "supplier_statements", existing.id,
                                      "update", key, old_val, value, self.user,
                                      source_type=self.source_type.value, original_row=original_row)
                            setattr(existing, key, value)
                    self.success_count += 1
                    return existing.id

            stmt = SupplierStatement(
                batch_id=self.batch_id,
                original_row=original_row,
                statement_number=statement_number,
                supplier=str(row.get("supplier", row.get("供应商", ""))),
                tracking_number=str(row.get("tracking_number", row.get("运单号", ""))),
                declaration_number=str(row.get("declaration_number", row.get("申报单号", ""))),
                invoice_amount=float(row.get("invoice_amount", row.get("发票金额", 0)) or 0),
                currency=str(row.get("currency", row.get("币种", "USD"))),
                tax_amount=float(row.get("tax_amount", row.get("税额", 0)) or 0),
                status=str(row.get("status", row.get("状态", "pending"))),
                remark=str(row.get("remark", row.get("备注", ""))),
            )
            self.session.add(stmt)
            self.session.flush()

            log_audit(self.session, self.batch_id, "supplier_statements", stmt.id,
                      "create", changed_by=self.user,
                      source_type=self.source_type.value, original_row=original_row)

            self.success_count += 1
            return stmt.id
        except Exception as e:
            self.failed_count += 1
            self.failed_rows.append((original_row, str(e)))
            return None


class ApprovalEmailImporter(BaseImporter):
    def __init__(self, session: Session, batch_id: str, strategy: ImportStrategy, user: str = "system"):
        super().__init__(session, DataSourceType.APPROVAL_EMAIL, batch_id, strategy, user)

    def import_row(self, row: pd.Series, original_row: int) -> Optional[int]:
        try:
            raw_email_id = row.get("email_id", row.get("邮件ID", ""))

            if is_empty_value(raw_email_id):
                self.failed_count += 1
                self.failed_rows.append((original_row, "缺少邮件ID"))
                self.log_exception(original_row, None, ExceptionType.MISSING_DATA,
                                   "缺少邮件ID", field_name="email_id")
                return None

            email_id = str(raw_email_id).strip()

            existing = self.session.query(ApprovalEmail).filter(
                ApprovalEmail.email_id == email_id
            ).first()

            if existing and self.strategy == ImportStrategy.IGNORE:
                self.success_count += 1
                return existing.id

            email = ApprovalEmail(
                batch_id=self.batch_id,
                original_row=original_row,
                email_id=email_id,
                subject=str(row.get("subject", row.get("主题", ""))),
                sender=str(row.get("sender", row.get("发件人", ""))),
                receiver=str(row.get("receiver", row.get("收件人", ""))),
                approval_type=str(row.get("approval_type", row.get("审批类型", ""))),
                approval_status=str(row.get("approval_status", row.get("审批状态", ""))),
                related_batch_id=str(row.get("related_batch_id", row.get("关联批次", ""))),
                related_tracking_numbers=str(row.get("related_tracking_numbers", row.get("关联运单号", ""))),
                content=str(row.get("content", row.get("内容", ""))),
            )
            self.session.add(email)
            self.session.flush()

            log_audit(self.session, self.batch_id, "approval_emails", email.id,
                      "create", changed_by=self.user,
                      source_type=self.source_type.value, original_row=original_row)

            self.success_count += 1
            return email.id
        except Exception as e:
            self.failed_count += 1
            self.failed_rows.append((original_row, str(e)))
            return None


def get_importer(source_type: DataSourceType, session: Session, batch_id: str,
                 strategy: ImportStrategy, user: str = "system") -> BaseImporter:
    importers = {
        DataSourceType.DECLARATION: DeclarationImporter,
        DataSourceType.TRACKING: TrackingImporter,
        DataSourceType.TAX_NOTICE: TaxNoticeImporter,
        DataSourceType.SUPPLIER_STATEMENT: SupplierStatementImporter,
        DataSourceType.APPROVAL_EMAIL: ApprovalEmailImporter,
    }
    return importers[source_type](session, batch_id, strategy, user)


def import_file(filepath: str, source_type: DataSourceType,
                strategy: ImportStrategy = ImportStrategy.APPEND,
                batch_id: str = None, user: str = "system",
                async_mode: bool = False) -> Dict[str, Any]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"文件不存在: {filepath}")

    file_hash = calculate_file_hash(filepath)
    batch_id = batch_id or generate_batch_id()

    if async_mode:
        return _import_async(filepath, source_type, strategy, batch_id, user, file_hash)

    return _import_sync(filepath, source_type, strategy, batch_id, user, file_hash)


def _import_sync(filepath: str, source_type: DataSourceType,
                 strategy: ImportStrategy, batch_id: str, user: str,
                 file_hash: str) -> Dict[str, Any]:
    session = get_session()

    try:
        data_source = DataSource(
            source_type=source_type,
            file_name=os.path.basename(filepath),
            file_hash=file_hash,
            import_strategy=strategy,
            batch_id=batch_id,
            imported_by=user,
        )
        session.add(data_source)
        session.flush()

        df = pd.read_excel(filepath) if filepath.endswith(('.xlsx', '.xls')) else pd.read_csv(filepath)
        total_rows = len(df)

        importer = get_importer(source_type, session, batch_id, strategy, user)
        importer.source_id = data_source.id

        for idx, row in df.iterrows():
            original_row = idx + 2
            record_id = importer.import_row(row, original_row)
            if record_id:
                session.query(Package if source_type == DataSourceType.DECLARATION else
                              TrackingNode if source_type == DataSourceType.TRACKING else
                              TaxNotice if source_type == DataSourceType.TAX_NOTICE else
                              SupplierStatement if source_type == DataSourceType.SUPPLIER_STATEMENT else
                              ApprovalEmail).filter_by(id=record_id).update({"source_id": data_source.id})

        data_source.total_rows = total_rows
        data_source.success_rows = importer.success_count
        data_source.failed_rows = importer.failed_count

        session.commit()

        return {
            "batch_id": batch_id,
            "source_id": data_source.id,
            "total_rows": total_rows,
            "success_rows": importer.success_count,
            "failed_rows": importer.failed_count,
            "failed_details": importer.failed_rows,
        }
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()


def _import_async(filepath: str, source_type: DataSourceType,
                  strategy: ImportStrategy, batch_id: str, user: str,
                  file_hash: str) -> Dict[str, Any]:
    session = get_session()

    try:
        task_id = f"TASK{uuid.uuid4().hex[:12].upper()}"

        task = AsyncTask(
            task_id=task_id,
            task_type="import",
            batch_id=batch_id,
            status=TaskStatus.PENDING,
            payload=json.dumps({
                "filepath": filepath,
                "source_type": source_type.value,
                "strategy": strategy.value,
                "user": user,
                "file_hash": file_hash,
            }),
            created_by=user,
        )
        session.add(task)
        session.commit()

        return {
            "task_id": task_id,
            "batch_id": batch_id,
            "status": "pending",
            "message": "异步任务已创建，使用 'customs-cli task run' 执行",
        }
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()

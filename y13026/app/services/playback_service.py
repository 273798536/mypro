from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import (
    PlaybackBatch, PlaybackDetail, SourceMaterial, ConclusionHistory,
    DetailRemark, PlaybackStatus, SourceType
)
from app.schemas import (
    BatchCreate, DetailCreate, SourceMaterialUpload, DetailRemarkCreate, ManualOverride
)
from app.services.split_detector import detect_split_repayment, determine_detail_status


class PlaybackService:
    def __init__(self, db: Session):
        self.db = db

    def create_batch(self, data: BatchCreate) -> PlaybackBatch:
        """创建批次，同一批次号递增run_index"""
        existing = (
            self.db.query(PlaybackBatch)
            .filter(PlaybackBatch.batch_no == data.batch_no)
            .order_by(PlaybackBatch.run_index.desc())
            .first()
        )
        run_index = (existing.run_index + 1) if existing else 1

        batch = PlaybackBatch(
            batch_no=data.batch_no,
            run_index=run_index,
            operator=data.operator,
            remark=data.remark,
        )
        self.db.add(batch)
        self.db.flush()
        return batch

    def get_batch(self, batch_id: int) -> Optional[PlaybackBatch]:
        return self.db.query(PlaybackBatch).filter(PlaybackBatch.id == batch_id).first()

    def get_batch_by_no(self, batch_no: str) -> List[PlaybackBatch]:
        return (
            self.db.query(PlaybackBatch)
            .filter(PlaybackBatch.batch_no == batch_no)
            .order_by(PlaybackBatch.run_index.asc())
            .all()
        )

    def add_detail(self, batch_id: int, data: DetailCreate) -> PlaybackDetail:
        detail = PlaybackDetail(
            batch_id=batch_id,
            detail_no=data.detail_no,
            broker_name=data.broker_name,
            customer_name=data.customer_name,
            product_name=data.product_name,
            risk_level=data.risk_level,
            transaction_amount=data.transaction_amount,
            previous_conclusion=data.previous_conclusion,
            current_conclusion=data.current_conclusion,
        )
        self.db.add(detail)
        self.db.flush()

        if data.previous_conclusion:
            self._add_conclusion_history(
                detail.id, data.previous_conclusion,
                change_reason="昨日结论（初始化）",
                changed_by="系统初始化",
                sequence=1,
            )
        detail.status = determine_detail_status(detail)
        self.db.flush()
        return detail

    def get_detail(self, detail_id: int) -> Optional[PlaybackDetail]:
        return self.db.query(PlaybackDetail).filter(PlaybackDetail.id == detail_id).first()

    def list_details(self, batch_id: int) -> List[PlaybackDetail]:
        return (
            self.db.query(PlaybackDetail)
            .filter(PlaybackDetail.batch_id == batch_id)
            .order_by(PlaybackDetail.detail_no.asc())
            .all()
        )

    def upload_source_material(
        self, detail_id: int, data: SourceMaterialUpload
    ) -> SourceMaterial:
        """上传原始来源材料，保留raw_content原貌不做清洗"""
        material = SourceMaterial(
            detail_id=detail_id,
            source_type=data.source_type,
            raw_content=data.raw_content,
            filename=data.filename,
            uploaded_by=data.uploaded_by,
        )
        self.db.add(material)
        self.db.flush()

        detail = self.get_detail(detail_id)
        if detail:
            if data.source_type == SourceType.APPROVAL_EMAIL:
                is_split, hint = detect_split_repayment(
                    data.raw_content,
                    transaction_amount=detail.transaction_amount,
                )
                if is_split:
                    detail.is_split_repayment = True
                    detail.repayment_split_hint = hint

            history = sorted(detail.conclusion_history, key=lambda h: h.sequence)
            next_seq = (history[-1].sequence + 1) if history else 1

            if data.source_type == SourceType.APPROVAL_EMAIL:
                self._add_conclusion_history(
                    detail_id,
                    conclusion=detail.current_conclusion or detail.previous_conclusion or "审批邮件已录入，结论待确认",
                    change_reason=f"审批邮件录入（来源材料ID: {material.id}）",
                    changed_by=data.uploaded_by or "系统",
                    source_material_id=material.id,
                    sequence=next_seq,
                )
            elif data.source_type == SourceType.SUPPLEMENT_VOUCHER:
                self._add_conclusion_history(
                    detail_id,
                    conclusion=detail.current_conclusion or detail.previous_conclusion or "后补凭证已录入，结论待确认",
                    change_reason=f"后补凭证录入（来源材料ID: {material.id}）",
                    changed_by=data.uploaded_by or "系统",
                    source_material_id=material.id,
                    sequence=next_seq,
                )

            detail.status = determine_detail_status(detail)
            self.db.flush()

        return material

    def manual_override(self, detail_id: int, data: ManualOverride) -> PlaybackDetail:
        """人工改判，追加到结论历史链"""
        detail = self.get_detail(detail_id)
        if not detail:
            raise ValueError(f"明细不存在: {detail_id}")

        history = sorted(detail.conclusion_history, key=lambda h: h.sequence)
        next_seq = (history[-1].sequence + 1) if history else 1

        self._add_conclusion_history(
            detail_id, data.new_conclusion,
            change_reason=data.reason,
            changed_by=f"人工改判-{data.operator or '未知操作人'}",
            sequence=next_seq,
        )
        detail.current_conclusion = data.new_conclusion
        detail.status = PlaybackStatus.MANUAL_OVERRIDDEN
        self.db.flush()
        return detail

    def add_remark(self, detail_id: int, data: DetailRemarkCreate) -> DetailRemark:
        remark = DetailRemark(
            detail_id=detail_id,
            content=data.content,
            remarked_by=data.remarked_by,
        )
        self.db.add(remark)
        self.db.flush()
        return remark

    def commit(self):
        self.db.commit()

    def _add_conclusion_history(
        self,
        detail_id: int,
        conclusion: str,
        change_reason: Optional[str] = None,
        changed_by: Optional[str] = None,
        source_material_id: Optional[int] = None,
        sequence: int = 1,
    ):
        entry = ConclusionHistory(
            detail_id=detail_id,
            conclusion=conclusion,
            change_reason=change_reason,
            changed_by=changed_by,
            source_material_id=source_material_id,
            sequence=sequence,
        )
        self.db.add(entry)
        self.db.flush()

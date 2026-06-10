from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
import schemas
from datetime import datetime


def create_weighing_form(db: Session, form: schemas.WeighingFormCreate):
    db_form = models.WeighingForm(**form.model_dump())
    db.add(db_form)
    db.commit()
    db.refresh(db_form)

    db_track = models.BatchTrack(
        weighing_form_id=db_form.id,
        batch_no=db_form.batch_no,
        track_type="创建",
        operation_type="新建称量单",
        operation_remarks="系统自动创建称量单记录",
        data_version=1
    )
    db.add(db_track)
    db.commit()

    return db_form


def get_weighing_form(db: Session, form_id: int):
    return db.query(models.WeighingForm).filter(models.WeighingForm.id == form_id).first()


def get_weighing_forms(db: Session, skip: int = 0, limit: int = 100, batch_no: str = None):
    query = db.query(models.WeighingForm).order_by(desc(models.WeighingForm.created_at))
    if batch_no:
        query = query.filter(models.WeighingForm.batch_no.contains(batch_no))
    return query.offset(skip).limit(limit).all()


def update_weighing_form(db: Session, form_id: int, form: schemas.WeighingFormUpdate):
    db_form = db.query(models.WeighingForm).filter(models.WeighingForm.id == form_id).first()
    if db_form:
        old_is_supplement = db_form.is_supplement
        for key, value in form.model_dump(exclude_unset=True).items():
            setattr(db_form, key, value)
        db_form.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_form)

        op_type = "更新称量单"
        if form.is_supplement and not old_is_supplement:
            op_type = "补录"
            remarks = f"补录数据，来源: {form.supplement_source or '未知'}"
        else:
            remarks = f"更新字段: {', '.join(form.model_dump(exclude_unset=True).keys())}"

        db_track = models.BatchTrack(
            weighing_form_id=db_form.id,
            batch_no=db_form.batch_no,
            track_type="更新",
            operation_type=op_type,
            operation_remarks=remarks,
            data_version=2
        )
        db.add(db_track)
        db.commit()

    return db_form


def create_reagent_ledger(db: Session, ledger: schemas.ReagentLedgerCreate):
    db_ledger = models.ReagentLedger(**ledger.model_dump())
    db.add(db_ledger)
    db.commit()
    db.refresh(db_ledger)

    form = db.query(models.WeighingForm).filter(models.WeighingForm.id == ledger.weighing_form_id).first()
    if form:
        db_track = models.BatchTrack(
            weighing_form_id=form.id,
            batch_no=form.batch_no,
            track_type="更新",
            operation_type="录入试剂台账",
            operation_remarks=f"录入试剂: {ledger.reagent_batch_no or '未填写批次号'}",
            data_version=2
        )
        db.add(db_track)
        db.commit()

    return db_ledger


def get_reagent_ledger(db: Session, ledger_id: int):
    return db.query(models.ReagentLedger).filter(models.ReagentLedger.id == ledger_id).first()


def get_reagent_ledger_by_form(db: Session, form_id: int):
    return db.query(models.ReagentLedger).filter(models.ReagentLedger.weighing_form_id == form_id).first()


def update_reagent_ledger(db: Session, ledger_id: int, ledger: schemas.ReagentLedgerUpdate):
    db_ledger = db.query(models.ReagentLedger).filter(models.ReagentLedger.id == ledger_id).first()
    if db_ledger:
        for key, value in ledger.model_dump(exclude_unset=True).items():
            setattr(db_ledger, key, value)
        db_ledger.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_ledger)

        form = db.query(models.WeighingForm).filter(models.WeighingForm.id == db_ledger.weighing_form_id).first()
        if form:
            db_track = models.BatchTrack(
                weighing_form_id=form.id,
                batch_no=form.batch_no,
                track_type="更新",
                operation_type="更新试剂台账",
                operation_remarks=f"更新字段: {', '.join(ledger.model_dump(exclude_unset=True).keys())}",
                data_version=2
            )
            db.add(db_track)
            db.commit()

    return db_ledger


def create_treatment_opinion(db: Session, opinion: schemas.TreatmentOpinionCreate):
    db_opinion = models.TreatmentOpinion(**opinion.model_dump())
    db_opinion.last_run_time = datetime.utcnow()
    db.add(db_opinion)
    db.commit()
    db.refresh(db_opinion)

    form = db.query(models.WeighingForm).filter(models.WeighingForm.id == opinion.weighing_form_id).first()
    if form:
        db_track = models.BatchTrack(
            weighing_form_id=form.id,
            treatment_opinion_id=db_opinion.id,
            batch_no=form.batch_no,
            track_type="处理",
            operation_type="创建处理意见",
            before_judgment=None,
            after_judgment=opinion.final_judgment,
            operation_remarks=f"创建处理意见，初步判断: {opinion.preliminary_judgment or '未填写'}",
            data_version=1
        )
        db.add(db_track)
        db.commit()

    return db_opinion


def get_treatment_opinion(db: Session, opinion_id: int):
    return db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.id == opinion_id).first()


def get_treatment_opinion_by_form(db: Session, form_id: int):
    return db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.weighing_form_id == form_id).first()


def update_treatment_opinion(db: Session, opinion_id: int, opinion: schemas.TreatmentOpinionUpdate):
    db_opinion = db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.id == opinion_id).first()
    if db_opinion:
        before_judgment = db_opinion.final_judgment

        if opinion.run_count is not None:
            db_opinion.run_count = opinion.run_count
        if opinion.last_run_time is not None:
            db_opinion.last_run_time = opinion.last_run_time
        db_opinion.updated_at = datetime.utcnow()

        for key, value in opinion.model_dump(exclude_unset=True).items():
            if key not in ['run_count', 'last_run_time']:
                setattr(db_opinion, key, value)

        judgment_changed = False
        if opinion.final_judgment and before_judgment and opinion.final_judgment != before_judgment:
            db_opinion.judgment_changed = True
            judgment_changed = True

        db.commit()
        db.refresh(db_opinion)

        form = db.query(models.WeighingForm).filter(models.WeighingForm.id == db_opinion.weighing_form_id).first()
        if form:
            diff = None
            if judgment_changed:
                diff = f"判断变更: {before_judgment} -> {opinion.final_judgment}"

            db_track = models.BatchTrack(
                weighing_form_id=form.id,
                treatment_opinion_id=db_opinion.id,
                batch_no=form.batch_no,
                track_type="处理",
                operation_type="更新处理意见",
                before_judgment=before_judgment,
                after_judgment=db_opinion.final_judgment,
                judgment_difference=diff,
                operation_remarks=f"更新处理意见字段: {', '.join(opinion.model_dump(exclude_unset=True).keys())}",
                data_version=db_opinion.report_version
            )
            db.add(db_track)
            db.commit()

    return db_opinion


def rerun_analysis(db: Session, opinion_id: int):
    db_opinion = db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.id == opinion_id).first()
    if db_opinion:
        db_opinion.run_count += 1
        db_opinion.last_run_time = datetime.utcnow()
        db.commit()
        db.refresh(db_opinion)

        form = db.query(models.WeighingForm).filter(models.WeighingForm.id == db_opinion.weighing_form_id).first()
        if form:
            db_track = models.BatchTrack(
                weighing_form_id=form.id,
                treatment_opinion_id=db_opinion.id,
                batch_no=form.batch_no,
                track_type="处理",
                operation_type="重复运行",
                before_judgment=db_opinion.final_judgment,
                after_judgment=db_opinion.final_judgment,
                operation_remarks=f"第 {db_opinion.run_count} 次运行分析",
                data_version=db_opinion.report_version
            )
            db.add(db_track)
            db.commit()

    return db_opinion


def manual_confirm(db: Session, opinion_id: int, operator: str, remarks: str = None):
    db_opinion = db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.id == opinion_id).first()
    if db_opinion:
        before_judgment = db_opinion.final_judgment
        db_opinion.manual_confirm = True
        db_opinion.confirmer = operator
        db_opinion.confirm_date = datetime.utcnow()
        db_opinion.confirm_remarks = remarks
        db_opinion.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_opinion)

        form = db.query(models.WeighingForm).filter(models.WeighingForm.id == db_opinion.weighing_form_id).first()
        if form:
            db_track = models.BatchTrack(
                weighing_form_id=form.id,
                treatment_opinion_id=db_opinion.id,
                batch_no=form.batch_no,
                track_type="确认",
                operation_type="人工确认",
                before_judgment=before_judgment,
                after_judgment=db_opinion.final_judgment,
                operator=operator,
                operation_remarks=remarks or "人工确认通过",
                data_version=db_opinion.report_version
            )
            db.add(db_track)
            db.commit()

    return db_opinion


def export_report(db: Session, opinion_id: int):
    db_opinion = db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.id == opinion_id).first()
    if db_opinion:
        before_judgment = db_opinion.final_judgment
        db_opinion.report_exported = True
        db_opinion.report_export_time = datetime.utcnow()
        db_opinion.report_version += 1
        db.commit()
        db.refresh(db_opinion)

        form = db.query(models.WeighingForm).filter(models.WeighingForm.id == db_opinion.weighing_form_id).first()
        if form:
            db_track = models.BatchTrack(
                weighing_form_id=form.id,
                treatment_opinion_id=db_opinion.id,
                batch_no=form.batch_no,
                track_type="报告",
                operation_type="导出报告",
                before_judgment=before_judgment,
                after_judgment=db_opinion.final_judgment,
                operation_remarks=f"导出报告，版本号: {db_opinion.report_version - 1}",
                data_version=db_opinion.report_version - 1
            )
            db.add(db_track)
            db.commit()

    return db_opinion


def supplement_record(db: Session, form_id: int, supplement_data: dict, operator: str = None):
    db_form = db.query(models.WeighingForm).filter(models.WeighingForm.id == form_id).first()
    if db_form:
        db_form.is_supplement = True
        db_form.supplement_remarks = supplement_data.get('remarks', db_form.supplement_remarks)
        db_form.supplement_source = supplement_data.get('source', db_form.supplement_source)
        db_form.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_form)

        db_track = models.BatchTrack(
            weighing_form_id=db_form.id,
            batch_no=db_form.batch_no,
            track_type="补录",
            operation_type="补录数据",
            operator=operator,
            operation_remarks=f"补录数据: {supplement_data.get('remarks', '补充信息')}",
            data_version=2
        )
        db.add(db_track)
        db.commit()

    return db_form


def create_batch_track(db: Session, track: schemas.BatchTrackCreate):
    db_track = models.BatchTrack(**track.model_dump())
    db.add(db_track)
    db.commit()
    db.refresh(db_track)
    return db_track


def get_batch_tracks(db: Session, batch_no: str = None, form_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(models.BatchTrack).order_by(desc(models.BatchTrack.operation_time))
    if batch_no:
        query = query.filter(models.BatchTrack.batch_no == batch_no)
    if form_id:
        query = query.filter(models.BatchTrack.weighing_form_id == form_id)
    return query.offset(skip).limit(limit).all()


def get_weighing_form_detail(db: Session, form_id: int):
    form = db.query(models.WeighingForm).filter(models.WeighingForm.id == form_id).first()
    if form:
        ledger = db.query(models.ReagentLedger).filter(models.ReagentLedger.weighing_form_id == form_id).first()
        opinion = db.query(models.TreatmentOpinion).filter(models.TreatmentOpinion.weighing_form_id == form_id).first()
        tracks = db.query(models.BatchTrack).filter(models.BatchTrack.weighing_form_id == form_id).order_by(desc(models.BatchTrack.operation_time)).all()

        form_detail = schemas.WeighingFormDetail.model_validate(form)
        form_detail.reagent_ledger = ledger
        form_detail.treatment_opinion = opinion
        form_detail.batch_tracks = tracks
        return form_detail
    return None


def get_all_batches(db: Session):
    results = db.query(
        models.BatchTrack.batch_no,
        models.BatchTrack.operation_type,
        models.BatchTrack.before_judgment,
        models.BatchTrack.after_judgment,
        models.BatchTrack.operation_time
    ).order_by(desc(models.BatchTrack.operation_time)).all()

    batch_map = {}
    for r in results:
        if r.batch_no not in batch_map:
            batch_map[r.batch_no] = []
        batch_map[r.batch_no].append({
            "operation_type": r.operation_type,
            "before_judgment": r.before_judgment,
            "after_judgment": r.after_judgment,
            "operation_time": r.operation_time.isoformat() if r.operation_time else None,
            "has_difference": r.before_judgment != r.after_judgment and r.before_judgment is not None and r.after_judgment is not None
        })

    return batch_map


def check_spectrum_overlap(db: Session, form_id: int):
    opinion = get_treatment_opinion_by_form(db, form_id)
    if opinion and opinion.spectrum_peak_overlap:
        return {
            "has_overlap": True,
            "material": opinion.overlap_material,
            "details": opinion.overlap_details,
            "final_judgment": opinion.final_judgment,
            "confirmer": opinion.confirmer
        }
    return {"has_overlap": False}


def mark_bad_data(db: Session, form_id: int, reason: str):
    db_form = db.query(models.WeighingForm).filter(models.WeighingForm.id == form_id).first()
    if db_form:
        db_form.is_bad_data = True
        db_form.bad_data_reason = reason
        db_form.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_form)

        db_track = models.BatchTrack(
            weighing_form_id=db_form.id,
            batch_no=db_form.batch_no,
            track_type="异常",
            operation_type="标记坏数据",
            operator="系统检测",
            operation_remarks=reason,
            data_version=2
        )
        db.add(db_track)
        db.commit()

    return db_form

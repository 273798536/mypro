from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os

import models
import schemas
import crud
from database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="酸洗槽浓度补加质检系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")


@app.get("/")
def read_root():
    return {
        "name": "酸洗槽浓度补加质检系统",
        "version": "1.0.0",
        "docs": "/docs",
        "frontend": "/static/index.html"
    }


@app.post("/api/weighing-forms/", response_model=schemas.WeighingForm)
def create_weighing_form(form: schemas.WeighingFormCreate, db: Session = Depends(get_db)):
    return crud.create_weighing_form(db=db, form=form)


@app.get("/api/weighing-forms/", response_model=List[schemas.WeighingForm])
def read_weighing_forms(
    skip: int = 0,
    limit: int = 100,
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db)
):
    forms = crud.get_weighing_forms(db, skip=skip, limit=limit, batch_no=batch_no)
    return forms


@app.get("/api/weighing-forms/{form_id}", response_model=schemas.WeighingForm)
def read_weighing_form(form_id: int, db: Session = Depends(get_db)):
    db_form = crud.get_weighing_form(db, form_id=form_id)
    if db_form is None:
        raise HTTPException(status_code=404, detail="称量单不存在")
    return db_form


@app.get("/api/weighing-forms/{form_id}/detail", response_model=schemas.WeighingFormDetail)
def read_weighing_form_detail(form_id: int, db: Session = Depends(get_db)):
    detail = crud.get_weighing_form_detail(db, form_id=form_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="称量单不存在")
    return detail


@app.put("/api/weighing-forms/{form_id}", response_model=schemas.WeighingForm)
def update_weighing_form(
    form_id: int,
    form: schemas.WeighingFormUpdate,
    db: Session = Depends(get_db)
):
    db_form = crud.update_weighing_form(db, form_id=form_id, form=form)
    if db_form is None:
        raise HTTPException(status_code=404, detail="称量单不存在")
    return db_form


@app.post("/api/reagent-ledgers/", response_model=schemas.ReagentLedger)
def create_reagent_ledger(ledger: schemas.ReagentLedgerCreate, db: Session = Depends(get_db)):
    form = crud.get_weighing_form(db, form_id=ledger.weighing_form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="关联的称量单不存在")
    return crud.create_reagent_ledger(db=db, ledger=ledger)


@app.get("/api/reagent-ledgers/{ledger_id}", response_model=schemas.ReagentLedger)
def read_reagent_ledger(ledger_id: int, db: Session = Depends(get_db)):
    db_ledger = crud.get_reagent_ledger(db, ledger_id=ledger_id)
    if db_ledger is None:
        raise HTTPException(status_code=404, detail="试剂台账不存在")
    return db_ledger


@app.get("/api/weighing-forms/{form_id}/reagent-ledger", response_model=schemas.ReagentLedger)
def read_reagent_ledger_by_form(form_id: int, db: Session = Depends(get_db)):
    db_ledger = crud.get_reagent_ledger_by_form(db, form_id=form_id)
    if db_ledger is None:
        raise HTTPException(status_code=404, detail="该称量单暂无试剂台账")
    return db_ledger


@app.put("/api/reagent-ledgers/{ledger_id}", response_model=schemas.ReagentLedger)
def update_reagent_ledger(
    ledger_id: int,
    ledger: schemas.ReagentLedgerUpdate,
    db: Session = Depends(get_db)
):
    db_ledger = crud.update_reagent_ledger(db, ledger_id=ledger_id, ledger=ledger)
    if db_ledger is None:
        raise HTTPException(status_code=404, detail="试剂台账不存在")
    return db_ledger


@app.post("/api/treatment-opinions/", response_model=schemas.TreatmentOpinion)
def create_treatment_opinion(opinion: schemas.TreatmentOpinionCreate, db: Session = Depends(get_db)):
    form = crud.get_weighing_form(db, form_id=opinion.weighing_form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="关联的称量单不存在")
    return crud.create_treatment_opinion(db=db, opinion=opinion)


@app.get("/api/treatment-opinions/{opinion_id}", response_model=schemas.TreatmentOpinion)
def read_treatment_opinion(opinion_id: int, db: Session = Depends(get_db)):
    db_opinion = crud.get_treatment_opinion(db, opinion_id=opinion_id)
    if db_opinion is None:
        raise HTTPException(status_code=404, detail="处理意见不存在")
    return db_opinion


@app.get("/api/weighing-forms/{form_id}/treatment-opinion", response_model=schemas.TreatmentOpinion)
def read_treatment_opinion_by_form(form_id: int, db: Session = Depends(get_db)):
    db_opinion = crud.get_treatment_opinion_by_form(db, form_id=form_id)
    if db_opinion is None:
        raise HTTPException(status_code=404, detail="该称量单暂无处理意见")
    return db_opinion


@app.put("/api/treatment-opinions/{opinion_id}", response_model=schemas.TreatmentOpinion)
def update_treatment_opinion(
    opinion_id: int,
    opinion: schemas.TreatmentOpinionUpdate,
    db: Session = Depends(get_db)
):
    db_opinion = crud.update_treatment_opinion(db, opinion_id=opinion_id, opinion=opinion)
    if db_opinion is None:
        raise HTTPException(status_code=404, detail="处理意见不存在")
    return db_opinion


@app.post("/api/treatment-opinions/{opinion_id}/rerun", response_model=schemas.TreatmentOpinion)
def rerun_analysis(opinion_id: int, db: Session = Depends(get_db)):
    db_opinion = crud.rerun_analysis(db, opinion_id=opinion_id)
    if db_opinion is None:
        raise HTTPException(status_code=404, detail="处理意见不存在")
    return db_opinion


@app.post("/api/treatment-opinions/{opinion_id}/manual-confirm", response_model=schemas.TreatmentOpinion)
def manual_confirm(
    opinion_id: int,
    operator: str = Query(..., description="确认人"),
    remarks: Optional[str] = Query(None, description="确认备注"),
    db: Session = Depends(get_db)
):
    db_opinion = crud.manual_confirm(db, opinion_id=opinion_id, operator=operator, remarks=remarks)
    if db_opinion is None:
        raise HTTPException(status_code=404, detail="处理意见不存在")
    return db_opinion


@app.post("/api/treatment-opinions/{opinion_id}/export-report", response_model=schemas.TreatmentOpinion)
def export_report(opinion_id: int, db: Session = Depends(get_db)):
    db_opinion = crud.export_report(db, opinion_id=opinion_id)
    if db_opinion is None:
        raise HTTPException(status_code=404, detail="处理意见不存在")
    return db_opinion


@app.post("/api/weighing-forms/{form_id}/supplement", response_model=schemas.WeighingForm)
def supplement_record(
    form_id: int,
    source: str = Query(..., description="补录来源"),
    remarks: str = Query(..., description="补录备注"),
    operator: Optional[str] = Query(None, description="补录人"),
    db: Session = Depends(get_db)
):
    db_form = crud.supplement_record(
        db,
        form_id=form_id,
        supplement_data={"source": source, "remarks": remarks},
        operator=operator
    )
    if db_form is None:
        raise HTTPException(status_code=404, detail="称量单不存在")
    return db_form


@app.post("/api/batch-tracks/", response_model=schemas.BatchTrack)
def create_batch_track(track: schemas.BatchTrackCreate, db: Session = Depends(get_db)):
    return crud.create_batch_track(db=db, track=track)


@app.get("/api/batch-tracks/", response_model=List[schemas.BatchTrack])
def read_batch_tracks(
    batch_no: Optional[str] = None,
    form_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    tracks = crud.get_batch_tracks(db, batch_no=batch_no, form_id=form_id, skip=skip, limit=limit)
    return tracks


@app.get("/api/batch-tracking")
def get_batch_tracking(db: Session = Depends(get_db)):
    return crud.get_all_batches(db)


@app.get("/api/weighing-forms/{form_id}/spectrum-overlap")
def check_spectrum_overlap(form_id: int, db: Session = Depends(get_db)):
    result = crud.check_spectrum_overlap(db, form_id=form_id)
    return result


@app.post("/api/weighing-forms/{form_id}/mark-bad-data", response_model=schemas.WeighingForm)
def mark_bad_data(
    form_id: int,
    reason: str = Query(..., description="坏数据原因"),
    db: Session = Depends(get_db)
):
    db_form = crud.mark_bad_data(db, form_id=form_id, reason=reason)
    if db_form is None:
        raise HTTPException(status_code=404, detail="称量单不存在")
    return db_form


@app.post("/api/import-sample-data")
def import_sample_data(db: Session = Depends(get_db)):
    sample_data = [
        {
            "weighing_form": {
                "batch_no": "SX-2026-0601-001",
                "tank_no": "酸洗槽#3",
                "reagent_name": "浓硝酸",
                "required_amount": 2500,
                "actual_amount": 2485,
                "unit": "mL",
                "weighing_operator": "张工",
                "weighing_date": "2026-06-01T09:30:00",
                "weighing_time": "09:30",
                "balance_no": "BL-003",
                "remarks": "日常浓度补加",
                "is_supplement": False
            },
            "reagent_ledger": {
                "reagent_batch_no": "HNO3-20260415",
                "reagent_cas_no": "7697-37-2",
                "purity": "65-68%",
                "concentration": "65%",
                "concentration_value": 65,
                "concentration_unit": "%",
                "manufacturer": "国药集团化学试剂有限公司",
                "production_date": "2026-04-15T00:00:00",
                "expiry_date": "2027-04-14T00:00:00",
                "storage_condition": "阴凉通风处",
                "receiver": "李工",
                "receive_date": "2026-04-20T00:00:00",
                "usage_record": "2026-05-15 补加#2槽 2000mL"
            },
            "treatment_opinion": {
                "inspector": "王工",
                "inspection_date": "2026-06-01T10:00:00",
                "original_concentration": 120,
                "target_concentration": 150,
                "calculated_supplement": 2500,
                "actual_supplement": 2485,
                "spectrum_peak_overlap": False,
                "preliminary_judgment": "合格",
                "final_judgment": "合格",
                "run_count": 1,
                "processing_remarks": "硝酸浓度偏低，按计算量补加"
            }
        },
        {
            "weighing_form": {
                "batch_no": "SX-2026-0602-002",
                "tank_no": "酸洗槽#1",
                "reagent_name": "浓盐酸",
                "required_amount": 1800,
                "actual_amount": 1820,
                "unit": "mL",
                "weighing_operator": "刘工",
                "weighing_date": "2026-06-02T14:20:00",
                "weighing_time": "14:20",
                "balance_no": "BL-002",
                "remarks": "补录5月30日数据",
                "supplement_remarks": "5月30日系统故障，数据于6月2日补录",
                "is_supplement": True,
                "supplement_source": "纸质称量记录单 #20260530-001"
            },
            "reagent_ledger": {
                "reagent_batch_no": "HCl-20260312",
                "reagent_cas_no": "7647-01-0",
                "purity": "36-38%",
                "concentration": "37%",
                "concentration_value": 37,
                "concentration_unit": "%",
                "manufacturer": "西陇化工股份有限公司",
                "production_date": "2026-03-12T00:00:00",
                "expiry_date": "2027-03-11T00:00:00",
                "storage_condition": "密封阴凉处",
                "receiver": "刘工",
                "receive_date": "2026-03-18T00:00:00",
                "usage_record": "2026-05-20 补加#3槽 1500mL",
                "remarks": "补录台账"
            },
            "treatment_opinion": {
                "inspector": "陈工",
                "inspection_date": "2026-06-02T15:00:00",
                "original_concentration": 105,
                "target_concentration": 130,
                "calculated_supplement": 1800,
                "actual_supplement": 1820,
                "spectrum_peak_overlap": True,
                "overlap_material": "2026-05-28 批次 304不锈钢试样",
                "overlap_details": "谱图中Fe³+峰与Cr⁶+峰发生部分重叠，干扰区域在220-230nm波长处",
                "preliminary_judgment": "待复核",
                "final_judgment": "合格",
                "judgment_changed": False,
                "run_count": 2,
                "processing_remarks": "谱峰重叠已通过差谱法扣除干扰，结果可信",
                "manual_confirm": True,
                "confirmer": "张主管",
                "confirm_date": "2026-06-02T16:30:00",
                "confirm_remarks": "同意人工复核结论，谱峰重叠已正确处理"
            }
        },
        {
            "weighing_form": {
                "batch_no": "SX-2026-0603-003",
                "tank_no": "酸洗槽#2",
                "reagent_name": "氢氟酸",
                "required_amount": 800,
                "actual_amount": 790,
                "unit": None,
                "weighing_operator": "赵工",
                "weighing_date": "2026-06-03T11:15:00",
                "weighing_time": "11:15",
                "balance_no": "BL-001",
                "remarks": "旧表数据，原始记录单未标注单位",
                "is_supplement": False,
                "is_bad_data": False
            },
            "reagent_ledger": {
                "reagent_batch_no": "HF-20260105",
                "reagent_cas_no": "7664-39-3",
                "purity": "40%",
                "concentration": "400",
                "concentration_value": 400,
                "concentration_unit": None,
                "manufacturer": "国药集团化学试剂有限公司",
                "production_date": "2026-01-05T00:00:00",
                "expiry_date": "2026-12-31T00:00:00",
                "storage_condition": "塑料瓶密封，避免玻璃",
                "receiver": "王工",
                "receive_date": "2026-01-10T00:00:00",
                "remarks": "浓度单位错填，应为40%，误写为400",
                "usage_record": "2026-04-10 补加#2槽 600mL"
            },
            "treatment_opinion": {
                "inspector": "李工",
                "inspection_date": "2026-06-03T14:00:00",
                "original_concentration": 45,
                "target_concentration": 60,
                "calculated_supplement": 800,
                "actual_supplement": 790,
                "spectrum_peak_overlap": False,
                "preliminary_judgment": "待确认",
                "final_judgment": "数据存疑",
                "judgment_changed": True,
                "change_reason": "试剂浓度单位缺失，原始记录存疑，需要重新核对",
                "run_count": 1,
                "processing_remarks": "注意：称量单和试剂台账均存在单位缺失问题，已标记为可疑数据",
                "report_exported": True,
                "report_export_time": "2026-06-03T15:30:00",
                "report_version": 2
            }
        },
        {
            "weighing_form": {
                "batch_no": "SX-2026-0603-004",
                "tank_no": "酸洗槽#5",
                "reagent_name": "硝酸",
                "required_amount": 3000,
                "actual_amount": 3050,
                "unit": "mL",
                "weighing_operator": "孙工",
                "weighing_date": "2026-06-03T08:45:00",
                "weighing_time": "08:45",
                "balance_no": "BL-004",
                "remarks": "坏数据测试样例",
                "is_supplement": False,
                "is_bad_data": True,
                "bad_data_reason": "试剂浓度错填：浓度值填错10倍，实际应为65%，记录为650%"
            },
            "reagent_ledger": {
                "reagent_batch_no": "HNO3-20260501-BAD",
                "reagent_cas_no": "7697-37-2",
                "purity": "650%",
                "concentration": "650%",
                "concentration_value": 650,
                "concentration_unit": "%",
                "manufacturer": "国药集团化学试剂有限公司",
                "production_date": "2026-05-01T00:00:00",
                "expiry_date": "2027-04-30T00:00:00",
                "storage_condition": "阴凉通风处",
                "receiver": "孙工",
                "receive_date": "2026-05-05T00:00:00",
                "usage_record": "首次使用",
                "remarks": "典型坏数据：浓度不可能达到650%，属于录入时多写了一个0"
            },
            "treatment_opinion": {
                "inspector": "周工",
                "inspection_date": "2026-06-03T09:30:00",
                "original_concentration": 140,
                "target_concentration": 150,
                "calculated_supplement": 500,
                "actual_supplement": 3050,
                "spectrum_peak_overlap": False,
                "preliminary_judgment": "数据错误",
                "final_judgment": "数据错误",
                "run_count": 3,
                "processing_remarks": "已标记为坏数据，实际补加量3050mL异常偏大，原因是浓度值错填导致计算错误。正确浓度应为65%，实际补加应为500mL左右。"
            }
        },
        {
            "weighing_form": {
                "batch_no": "SX-2026-0604-005",
                "tank_no": "酸洗槽#4",
                "reagent_name": "混合酸(硝酸+盐酸)",
                "required_amount": 4000,
                "actual_amount": 3980,
                "unit": "mL",
                "weighing_operator": "吴工",
                "weighing_date": "2026-06-04T10:00:00",
                "weighing_time": "10:00",
                "balance_no": "BL-002",
                "remarks": "王水配置，硝酸:盐酸=1:3",
                "is_supplement": False
            },
            "reagent_ledger": {
                "reagent_batch_no": "MIX-20260601",
                "reagent_cas_no": "混合酸",
                "purity": "硝酸68% + 盐酸37%",
                "concentration": "混合",
                "concentration_value": None,
                "concentration_unit": None,
                "manufacturer": "现场配置",
                "production_date": "2026-06-04T09:00:00",
                "expiry_date": "2026-06-11T00:00:00",
                "storage_condition": "现配现用",
                "receiver": "吴工",
                "receive_date": "2026-06-04T09:30:00",
                "usage_record": "首次配置",
                "remarks": "混合酸按体积比1:3配置"
            },
            "treatment_opinion": {
                "inspector": "郑工",
                "inspection_date": "2026-06-04T11:00:00",
                "original_concentration": 180,
                "target_concentration": 220,
                "calculated_supplement": 4000,
                "actual_supplement": 3980,
                "spectrum_peak_overlap": True,
                "overlap_material": "2026-06-03 批次 316L不锈钢试样 + 2026-06-03 批次 钛合金试样",
                "overlap_details": "复杂谱图，Ni、Cr、Ti、Fe多元素谱峰相互干扰，重叠区域覆盖190-260nm全波段，需要分峰拟合处理",
                "preliminary_judgment": "待复核",
                "final_judgment": "待复核",
                "run_count": 4,
                "processing_remarks": "混合酸体系复杂，谱峰重叠严重，已重复运行4次，需要人工进一步确认"
            }
        }
    ]

    created_ids = []
    for item in sample_data:
        wf = crud.create_weighing_form(db, schemas.WeighingFormCreate(**item["weighing_form"]))

        item["reagent_ledger"]["weighing_form_id"] = wf.id
        rl = crud.create_reagent_ledger(db, schemas.ReagentLedgerCreate(**item["reagent_ledger"]))

        item["treatment_opinion"]["weighing_form_id"] = wf.id
        to = crud.create_treatment_opinion(db, schemas.TreatmentOpinionCreate(**item["treatment_opinion"]))

        created_ids.append({
            "weighing_form_id": wf.id,
            "batch_no": wf.batch_no,
            "reagent_ledger_id": rl.id,
            "treatment_opinion_id": to.id
        })

    bad_form = crud.get_weighing_form(db, created_ids[3]["weighing_form_id"])
    if bad_form and bad_form.is_bad_data:
        crud.mark_bad_data(db, bad_form.id, bad_form.bad_data_reason)

    return {
        "message": "样例数据导入成功",
        "count": len(sample_data),
        "records": created_ids
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

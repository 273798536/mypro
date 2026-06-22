from fastapi import FastAPI, HTTPException
from pydantic import BaseModel as PydanticModel

from src.de_report.models import RecordStatus, StatusTransitionError
from src.de_report.state_machine import StateMachine
from src.de_report.sample_data import SITE_RECORDS

app = FastAPI(title="微分方程报告讲解", version="1.0.0")
sm = StateMachine()
sm.load_records(SITE_RECORDS)


class TransitionRequest(PydanticModel):
    to_status: RecordStatus
    operator: str = "api_user"


class TransitionResponse(PydanticModel):
    record_id: str
    from_status: str
    to_status: str
    remark: str


class ErrorResponse(PydanticModel):
    detail: str
    record_id: str
    from_status: str
    to_status: str


@app.get("/records")
def list_records():
    return [r.model_dump(mode="json") for r in sm.list_records()]


@app.get("/records/{record_id}")
def get_record(record_id: str):
    rec = sm.get_record(record_id)
    if rec is None:
        raise HTTPException(status_code=404, detail=f"记录 {record_id} 不存在")
    return rec.model_dump(mode="json")


@app.post("/records/{record_id}/transition", response_model=TransitionResponse)
def transition_record(record_id: str, req: TransitionRequest):
    try:
        log = sm.transition(record_id, req.to_status, req.operator)
        return TransitionResponse(
            record_id=log.record_id,
            from_status=log.from_status.value,
            to_status=log.to_status.value,
            remark=log.remark,
        )
    except StatusTransitionError as e:
        raise HTTPException(
            status_code=409,
            detail=ErrorResponse(
                detail=e.reason,
                record_id=e.record_id,
                from_status=e.from_status.value,
                to_status=e.to_status.value,
            ).model_dump(),
        )


@app.get("/records/{record_id}/trace")
def get_trace(record_id: str):
    trace = sm.get_trace(record_id)
    if trace is None:
        raise HTTPException(status_code=404, detail=f"记录 {record_id} 不存在")
    return trace


@app.get("/records/{record_id}/changelog")
def get_changelog(record_id: str):
    logs = sm.get_changelog(record_id)
    return [
        {
            "from": l.from_status.value,
            "to": l.to_status.value,
            "time": l.timestamp.isoformat(),
            "operator": l.operator,
            "remark": l.remark,
        }
        for l in logs
    ]


@app.get("/extrapolation-warnings")
def get_extrapolation_warnings():
    return sm.get_extrapolation_warnings()


@app.post("/reload")
def reload_records():
    logs = sm.load_records(SITE_RECORDS)
    return {
        "reimported": len(logs),
        "details": [
            {
                "record_id": l.record_id,
                "from": l.from_status.value,
                "to": l.to_status.value,
                "remark": l.remark,
            }
            for l in logs
        ],
    }

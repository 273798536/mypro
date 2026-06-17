from sqlalchemy.orm import Session
from models import ProcessingTrace
from schemas import ProcessingTraceCreate
from datetime import datetime


class TraceService:
    @staticmethod
    def add_trace(
        db: Session,
        experiment_id: int,
        operation: str,
        old_status: str = None,
        new_status: str = None,
        operator: str = None,
        remark: str = None,
        affected_data: str = None
    ) -> ProcessingTrace:
        trace = ProcessingTrace(
            experiment_id=experiment_id,
            operation=operation,
            old_status=old_status,
            new_status=new_status,
            operator=operator,
            remark=remark,
            affected_data=affected_data
        )
        db.add(trace)
        db.flush()
        return trace

    @staticmethod
    def get_traces_by_experiment(db: Session, experiment_id: int):
        return (
            db.query(ProcessingTrace)
            .filter(ProcessingTrace.experiment_id == experiment_id)
            .order_by(ProcessingTrace.operation_time.desc())
            .all()
        )

    @staticmethod
    def get_all_traces(db: Session, skip: int = 0, limit: int = 100):
        return (
            db.query(ProcessingTrace)
            .order_by(ProcessingTrace.operation_time.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

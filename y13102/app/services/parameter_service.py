import hashlib
import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from ..models import (
    Parameter, ParameterHistory, Remark, Screenshot,
    CalculationResult, ScreenshotStatus
)
from ..schemas import (
    ParameterCreate, ParameterUpdate, RemarkCreate,
    ScreenshotCreate, ScreenshotUpdate
)


class ParameterService:
    def __init__(self, db: Session):
        self.db = db

    def create_parameter(self, data: ParameterCreate) -> Parameter:
        parameter = Parameter(**data.model_dump())
        self.db.add(parameter)
        self.db.flush()

        history = ParameterHistory(
            parameter_id=parameter.id,
            version=1,
            value=parameter.current_value,
            unit=parameter.unit,
            threshold_low=parameter.threshold_low,
            threshold_high=parameter.threshold_high,
            segment_count=parameter.segment_count,
            change_reason="初始创建",
            changed_by="system"
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(parameter)

        return parameter

    def update_parameter(self, parameter_id: int, data: ParameterUpdate) -> Optional[Parameter]:
        parameter = self.db.query(Parameter).filter(Parameter.id == parameter_id).first()
        if not parameter:
            return None

        old_values = {
            "value": parameter.current_value,
            "unit": parameter.unit,
            "threshold_low": parameter.threshold_low,
            "threshold_high": parameter.threshold_high,
            "segment_count": parameter.segment_count
        }

        update_data = data.model_dump(exclude_unset=True)
        change_reason = update_data.pop("change_reason", None)
        changed_by = update_data.pop("changed_by", None)

        for key, value in update_data.items():
            setattr(parameter, key, value)

        current_version = self.db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == parameter_id
        ).count() + 1

        history = ParameterHistory(
            parameter_id=parameter.id,
            version=current_version,
            value=parameter.current_value,
            unit=parameter.unit,
            threshold_low=parameter.threshold_low,
            threshold_high=parameter.threshold_high,
            segment_count=parameter.segment_count,
            change_reason=change_reason or self._detect_changes(old_values, {
                "value": parameter.current_value,
                "unit": parameter.unit,
                "threshold_low": parameter.threshold_low,
                "threshold_high": parameter.threshold_high,
                "segment_count": parameter.segment_count
            }),
            changed_by=changed_by or "system"
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(parameter)

        return parameter

    def _detect_changes(self, old: Dict, new: Dict) -> str:
        changes = []
        if old["value"] != new["value"]:
            changes.append(f"参数值: {old['value']} → {new['value']}")
        if old["unit"] != new["unit"]:
            changes.append(f"单位: {old['unit']} → {new['unit']}")
        if old["threshold_low"] != new["threshold_low"]:
            changes.append(f"低阈值: {old['threshold_low']} → {new['threshold_low']}")
        if old["threshold_high"] != new["threshold_high"]:
            changes.append(f"高阈值: {old['threshold_high']} → {new['threshold_high']}")
        if old["segment_count"] != new["segment_count"]:
            changes.append(f"分段数: {old['segment_count']} → {new['segment_count']}")
        return "；".join(changes) if changes else "参数更新"

    def get_parameter(self, parameter_id: int) -> Optional[Parameter]:
        return self.db.query(Parameter).filter(Parameter.id == parameter_id).first()

    def get_all_parameters(self, skip: int = 0, limit: int = 100) -> List[Parameter]:
        return self.db.query(Parameter).offset(skip).limit(limit).all()

    def get_parameter_history(self, parameter_id: int) -> List[ParameterHistory]:
        return self.db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == parameter_id
        ).order_by(ParameterHistory.version.desc()).all()

    def add_remark(self, data: RemarkCreate) -> Remark:
        if not data.idempotency_key:
            idempotency_key = hashlib.sha256(
                json.dumps({
                    "parameter_id": data.parameter_id,
                    "content": data.content,
                    "remark_type": data.remark_type,
                    "created_by": data.created_by
                }, sort_keys=True, ensure_ascii=False).encode('utf-8')
            ).hexdigest()
        else:
            idempotency_key = data.idempotency_key

        existing = self.db.query(Remark).filter(
            Remark.idempotency_key == idempotency_key
        ).first()

        if existing:
            return existing

        remark = Remark(
            parameter_id=data.parameter_id,
            idempotency_key=idempotency_key,
            content=data.content,
            remark_type=data.remark_type,
            created_by=data.created_by
        )
        self.db.add(remark)
        self.db.commit()
        self.db.refresh(remark)

        return remark

    def get_remarks(self, parameter_id: int) -> List[Remark]:
        return self.db.query(Remark).filter(
            Remark.parameter_id == parameter_id
        ).order_by(Remark.created_at.desc()).all()

    def add_screenshot(self, data: ScreenshotCreate) -> Screenshot:
        screenshot = Screenshot(**data.model_dump())
        self.db.add(screenshot)
        self.db.commit()
        self.db.refresh(screenshot)
        return screenshot

    def update_screenshot_status(self, screenshot_id: int, data: ScreenshotUpdate) -> Optional[Screenshot]:
        screenshot = self.db.query(Screenshot).filter(Screenshot.id == screenshot_id).first()
        if not screenshot:
            return None

        if data.status is not None:
            screenshot.status = data.status
        if data.description is not None:
            screenshot.description = data.description

        self.db.commit()
        self.db.refresh(screenshot)
        return screenshot

    def get_screenshots(self, parameter_id: int, status: Optional[ScreenshotStatus] = None) -> List[Screenshot]:
        query = self.db.query(Screenshot).filter(Screenshot.parameter_id == parameter_id)
        if status:
            query = query.filter(Screenshot.status == status)
        return query.order_by(Screenshot.created_at.desc()).all()

    def get_screenshots_by_status(self, parameter_id: int) -> Dict[str, List[Screenshot]]:
        screenshots = self.get_screenshots(parameter_id)
        return {
            "processed": [s for s in screenshots if s.status == ScreenshotStatus.PROCESSED],
            "pending": [s for s in screenshots if s.status == ScreenshotStatus.PENDING_MATERIAL],
            "manual": [s for s in screenshots if s.status == ScreenshotStatus.MANUAL_JUDGMENT]
        }

    def get_latest_result(self, parameter_id: int) -> Optional[CalculationResult]:
        return self.db.query(CalculationResult).filter(
            CalculationResult.parameter_id == parameter_id
        ).order_by(CalculationResult.created_at.desc()).first()

    def get_all_results(self, parameter_id: int, skip: int = 0, limit: int = 20) -> List[CalculationResult]:
        return self.db.query(CalculationResult).filter(
            CalculationResult.parameter_id == parameter_id
        ).order_by(CalculationResult.created_at.desc()).offset(skip).limit(limit).all()

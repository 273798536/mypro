"""接口返回模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class InterfaceResponse(BaseModel):
    """线上接口单次返回结果。"""

    response_id: str = Field(..., description="返回记录唯一ID")
    sample_id: str = Field(..., description="对应样本ID")
    model_version_id: str = Field(..., description="模型版本ID")
    threshold_version_id: str = Field(..., description="阈值版本ID")
    score: Optional[float] = Field(None, description="模型输出分数")
    decision: str = Field(..., description="最终决策（pass/review/reject 等）")
    risk_level: Optional[str] = Field(None, description="风险等级")
    raw_response: Dict[str, Any] = Field(default_factory=dict, description="原始接口返回")
    request_at: datetime = Field(default_factory=datetime.now, description="请求时间")
    latency_ms: Optional[float] = Field(None, description="接口耗时（毫秒）")

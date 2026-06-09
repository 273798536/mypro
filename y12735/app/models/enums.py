from __future__ import annotations

from enum import Enum


class ReviewStatus(str, Enum):
    PENDING = "待确认"
    APPROVED = "通过"
    REJECTED = "驳回"


class ResultClassification(str, Enum):
    USABLE = "可用"
    DEFERRED = "暂缓"
    RECOLLECT = "需要重新采集"


class OutlierType(str, Enum):
    EXTRAPOLATION = "外推越界"
    RESIDUAL = "残差异常"
    CONSTRAINT = "约束违反"
    MISSING_DATA = "数据缺失"
    INSUFFICIENT_POINTS = "样本不足"


class ReviewerRole(str, Enum):
    EDITOR = "教研编辑"
    COMMITTEE = "投委会"
    SYSTEM = "系统"

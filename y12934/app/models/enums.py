from enum import Enum


class QuestionStatus(str, Enum):
    IMPORTED = "imported"
    UNDER_REVIEW = "under_review"
    REVIEW_PASSED = "review_passed"
    REVIEW_BLOCKED = "review_blocked"
    APPROVED = "approved"
    REJECTED = "rejected"


class IssueType(str, Enum):
    MATERIAL_MISSING = "material_missing"
    CALIBRATION_WRONG = "calibration_wrong"


class CopyrightType(str, Enum):
    PUBLIC_DOMAIN = "public_domain"
    AUTHORIZED = "authorized"
    FAIR_USE = "fair_use"
    ORIGINAL = "original"
    UNKNOWN = "unknown"

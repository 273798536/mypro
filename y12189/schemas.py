from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class PartBase(BaseModel):
    instrument: str = Field(..., max_length=50, description="乐器名称，如：二胡、琵琶、笛子")
    page_start: int = Field(1, ge=1, description="声部起始页码")
    page_end: int = Field(1, ge=1, description="声部结束页码")
    remarks: Optional[str] = Field(None, description="备注")


class PartCreate(PartBase):
    pass


class Part(PartBase):
    id: int
    score_id: int
    file_path: Optional[str]

    class Config:
        from_attributes = True


class ScoreBase(BaseModel):
    title: str = Field(..., max_length=200, description="曲谱名称")
    composer: Optional[str] = Field(None, max_length=100, description="作曲家")
    key: Optional[str] = Field(None, max_length=20, description="调式，如：C调、G调、D调")
    time_signature: Optional[str] = Field(None, max_length=20, description="拍号，如：4/4、2/4")
    total_pages: int = Field(1, ge=1, description="总页数")
    remarks: Optional[str] = Field(None, description="备注")


class ScoreCreate(ScoreBase):
    parts: List[PartCreate] = Field(default_factory=list, description="乐器声部分谱")


class Score(ScoreBase):
    id: int
    file_path: Optional[str]
    file_name: Optional[str]
    file_hash: Optional[str]
    created_at: datetime
    updated_at: datetime
    parts: List[Part] = []

    class Config:
        from_attributes = True


class BorrowRecordBase(BaseModel):
    borrower: str = Field(..., max_length=100, description="借阅人")
    purpose: Optional[str] = Field(None, max_length=200, description="借阅用途")
    remarks: Optional[str] = Field(None, description="备注")


class BorrowRecordCreate(BorrowRecordBase):
    score_id: int


class BorrowRecord(BorrowRecordBase):
    id: int
    score_id: int
    borrowed_at: datetime
    returned_at: Optional[datetime]
    score_title: Optional[str] = None

    class Config:
        from_attributes = True


class ValidationError(BaseModel):
    error_type: str
    field: str
    message: str
    suggestion: Optional[str] = None


class ScoreUploadResponse(BaseModel):
    success: bool
    score_id: Optional[int] = None
    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []


class SearchResult(BaseModel):
    total: int
    items: List[Score]

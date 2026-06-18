from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field


class RunConfig(BaseModel):
    input_dir: Path
    output_dir: Path
    case_id: Optional[str] = None
    force_reimport: bool = False
    skip_idempotency_check: bool = False

    class Config:
        arbitrary_types_allowed = True


class SourceRef(BaseModel):
    file_name: str
    line_number: Optional[int] = None
    sheet_name: Optional[str] = None
    image_name: Optional[str] = None
    note: Optional[str] = None
    raw_content: Optional[str] = None

    def to_display(self) -> str:
        parts = [self.file_name]
        if self.line_number:
            parts.append(f":{self.line_number}")
        if self.sheet_name:
            parts.append(f" [{self.sheet_name}]")
        if self.note:
            parts.append(f" # {self.note}")
        return "".join(parts)


class FindingSeverity(str):
    SAFE_TO_USE = "safe_to_use"
    NEEDS_SRE_REVIEW = "needs_sre_review"

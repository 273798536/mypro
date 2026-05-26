from pydantic import BaseModel
from typing import List, Optional


class ExportRequest(BaseModel):
    ledger_ids: List[int]
    mask_sensitive: bool = True
    include_history: bool = False

from pydantic import BaseModel, Field
from datetime import datetime
import uuid
from typing import List, Optional

class WorkRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    owner_name: str
    title: str
    phash: str
    embedding: List[float]
    width: Optional[int] = None
    height: Optional[int] = None
    image_path: Optional[str] = None
    low_detail: Optional[bool] = None
    pipeline_version: Optional[str] = None
    created_at: datetime
    prev_hash: str
    entry_hash: str

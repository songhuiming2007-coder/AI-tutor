from pydantic import BaseModel, Field
from typing import Any, Optional


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="课程主题")
    num_slides: int = Field(default=18, ge=15, le=18, description="幻灯片数量")
    language: str = Field(default="zh", description="语言")


class Slide(BaseModel):
    index: int
    title: str
    bullets: list[str]
    narration: str
    slide_type: str = "concept"
    chart: Optional[dict[str, Any]] = None
    audio_url: str = ""


class GenerateResponse(BaseModel):
    lesson_id: str
    topic: str
    slides: list[Slide]


class ErrorResponse(BaseModel):
    detail: str
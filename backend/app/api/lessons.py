import asyncio
import json
import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from ..models import GenerateRequest, GenerateResponse
from ..services.llm import llm_service
from ..services.tts_service import tts_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate_lesson(request: GenerateRequest):
    lesson_id = uuid4().hex[:8]

    # 调用 LLM 生成幻灯片
    try:
        slides = await llm_service.generate_slides(
            request.topic, request.language
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM 返回数据无效: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM 调用失败: {str(e)}")

    # 调用 TTS 生成音频
    try:
        audio_urls = await tts_service.generate_all(lesson_id, slides)
        for slide, audio_url in zip(slides, audio_urls):
            slide.audio_url = audio_url
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS 调用失败: {str(e)}")

    return GenerateResponse(
        lesson_id=lesson_id,
        topic=request.topic,
        slides=slides,
    )


@router.get("/generate/stream")
async def generate_stream(topic: str = Query(..., min_length=1)):
    lesson_id = uuid4().hex[:8]

    async def event_generator():
        # ---- 第一阶段：LLM 上半部分 ----
        try:
            upper_slides = await llm_service.generate_upper(topic)
        except Exception as e:
            logger.error(f"LLM 上半部分失败: {e}")
            yield {"event": "error", "data": json.dumps({"message": f"LLM 上半部分失败: {e}"})}
            return

        for slide in upper_slides:
            yield {"event": "slide", "data": json.dumps({
                "lesson_id": lesson_id, "topic": topic, "slide": slide.model_dump(),
            })}

        # ---- 上半部分 TTS ----
        try:
            urls = await tts_service.generate_concurrent(lesson_id, upper_slides)
            for slide, url in zip(upper_slides, urls):
                if url:
                    slide.audio_url = url
                    yield {"event": "audio", "data": json.dumps({"index": slide.index, "audio_url": url})}
        except Exception as e:
            logger.error(f"上半部分 TTS 失败: {e}")

        # ---- 第二阶段：LLM 下半部分 ----
        upper_titles = [s.title for s in upper_slides]
        try:
            lower_slides = await llm_service.generate_lower(topic, upper_titles)
        except Exception as e:
            logger.error(f"LLM 下半部分失败: {e}")
            yield {"event": "error", "data": json.dumps({"message": f"LLM 下半部分失败: {e}"})}
            return

        for slide in lower_slides:
            yield {"event": "slide", "data": json.dumps({
                "lesson_id": lesson_id, "topic": topic, "slide": slide.model_dump(),
            })}

        # ---- 下半部分 TTS ----
        try:
            urls = await tts_service.generate_concurrent(lesson_id, lower_slides)
            for slide, url in zip(lower_slides, urls):
                if url:
                    slide.audio_url = url
                    yield {"event": "audio", "data": json.dumps({"index": slide.index, "audio_url": url})}
        except Exception as e:
            logger.error(f"下半部分 TTS 失败: {e}")

        yield {"event": "done", "data": json.dumps({"lesson_id": lesson_id, "topic": topic})}

    return EventSourceResponse(event_generator())
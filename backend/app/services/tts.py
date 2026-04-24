import asyncio
from pathlib import Path
from openai import AsyncOpenAI

from ..config import settings
from ..models import Slide


class TTSService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.semaphore = asyncio.Semaphore(settings.TTS_MAX_CONCURRENCY)

    async def _generate_one(self, lesson_id: str, slide: Slide) -> None:
        filename = f"{lesson_id}_slide_{slide.index}.mp3"
        filepath = settings.AUDIO_DIR / filename

        async with self.semaphore:
            response = await self.client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=slide.narration,
                timeout=settings.TTS_TIMEOUT,
            )
            audio_data = await response.aread()
            filepath.write_bytes(audio_data)

        slide.audio_url = f"/audio/{filename}"

    async def generate_all(self, lesson_id: str, slides: list[Slide]) -> None:
        tasks = [self._generate_one(lesson_id, slide) for slide in slides]
        await asyncio.gather(*tasks)


tts_service = TTSService()
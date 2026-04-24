import os
import asyncio
import logging
from pathlib import Path

import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["WEBSOCKET_CLIENT_CA_BUNDLE"] = certifi.where()

import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer

from ..config import settings

logger = logging.getLogger(__name__)

dashscope.api_key = settings.DASHSCOPE_API_KEY


class TTSService:
    def __init__(self):
        self.audio_dir = settings.STATIC_DIR / "audio"
        self.audio_dir.mkdir(parents=True, exist_ok=True)

    def _call_tts(self, script: str) -> bytes:
        """同步调用百炼 TTS API - 每次新建实例"""
        synthesizer = SpeechSynthesizer(
            model="cosyvoice-v1",
            voice="longxiaochun",
        )
        audio = synthesizer.call(script)
        return audio

    async def _generate_one(self, lesson_id: str, index: int, script: str) -> str:
        filename = f"{lesson_id}_slide_{index}.mp3"
        filepath = self.audio_dir / filename
        audio_url = f"/static/audio/{filename}"

        try:
            audio_data = await asyncio.to_thread(self._call_tts, script)
            filepath.write_bytes(audio_data)

            assert filepath.exists(), f"音频文件不存在: {filepath}"
            assert filepath.stat().st_size > 0, f"音频文件为空: {filepath}"

            logger.info(f"生成音频成功: {filename} ({filepath.stat().st_size} bytes)")
            return audio_url

        except Exception as e:
            logger.error(f"生成音频失败 {filename}: {e}")
            raise

    async def generate_all(self, lesson_id: str, slides: list) -> list[str]:
        # 串行调用，避免 WebSocket 并发冲突
        results = []
        for slide in slides:
            url = await self._generate_one(lesson_id, slide.index, slide.narration)
            results.append(url)
        return results

    async def generate_concurrent(
        self, lesson_id: str, slides: list, concurrency: int = 3
    ) -> list[str]:
        """并发生成 TTS，用 semaphore 限制并发数，单个失败不中断其他"""
        sem = asyncio.Semaphore(concurrency)

        async def limited(slide):
            async with sem:
                try:
                    return await self._generate_one(lesson_id, slide.index, slide.narration)
                except Exception as e:
                    logger.error(f"TTS 并发任务失败 slide_{slide.index}: {e}")
                    return ""

        tasks = [limited(slide) for slide in slides]
        return await asyncio.gather(*tasks)


tts_service = TTSService()
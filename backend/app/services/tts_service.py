import os
import asyncio
import base64
import logging

import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["WEBSOCKET_CLIENT_CA_BUNDLE"] = certifi.where()

import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer

from ..config import settings

logger = logging.getLogger(__name__)

dashscope.api_key = settings.DASHSCOPE_API_KEY


class TTSService:
    def _call_tts(self, script: str) -> bytes:
        """同步调用百炼 TTS API - 每次新建实例"""
        synthesizer = SpeechSynthesizer(
            model="cosyvoice-v1",
            voice="longxiaochun",
        )
        audio = synthesizer.call(script)
        return audio

    async def _generate_one(self, lesson_id: str, index: int, script: str) -> str:
        """生成音频并返回 base64 data URL（不写磁盘）"""
        try:
            audio_data = await asyncio.to_thread(self._call_tts, script)
            b64 = base64.b64encode(audio_data).decode("utf-8")
            data_url = f"data:audio/mp3;base64,{b64}"
            logger.info(f"生成音频成功: lesson={lesson_id} slide_{index} ({len(audio_data)} bytes)")
            return data_url
        except Exception as e:
            logger.error(f"生成音频失败 lesson={lesson_id} slide_{index}: {e}")
            raise

    async def generate_all(self, lesson_id: str, slides: list) -> list[str]:
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

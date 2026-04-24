import asyncio
from pathlib import Path
from app.models import Slide
from app.config import settings


async def test_tts_mock():
    """模拟 TTS 服务测试，不调用真实 API"""

    # 创建测试 slides
    slides = [
        Slide(
            index=1,
            title="什么是量子计算",
            bullets=["经典计算 vs 量子计算", "量子比特的概念", "叠加与纠缠"],
            narration="欢迎来到量子计算入门课程。今天我们首先来了解什么是量子计算。量子计算是一种利用量子力学原理进行信息处理的计算方式。",
            audio_url="",
        ),
        Slide(
            index=2,
            title="量子比特",
            bullets=["0 和 1 的叠加态", "量子纠缠", "量子干涉"],
            narration="接下来我们学习量子比特。与经典比特只能是 0 或 1 不同，量子比特可以同时处于 0 和 1 的叠加态。",
            audio_url="",
        ),
        Slide(
            index=3,
            title="量子计算应用",
            bullets=["密码学", "药物研发", "优化问题"],
            narration="最后我们看看量子计算的应用前景。量子计算在密码学、药物研发和优化问题等领域有巨大潜力。",
            audio_url="",
        ),
    ]

    lesson_id = "test_mock_001"
    audio_dir = settings.STATIC_DIR / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"模拟 TTS 生成，lesson_id: {lesson_id}")
    print(f"音频目录: {audio_dir}")

    # 模拟生成音频文件（创建假的 mp3 文件）
    audio_urls = []
    for slide in slides:
        filename = f"{lesson_id}_slide_{slide.index}.mp3"
        filepath = audio_dir / filename
        audio_url = f"/static/audio/{filename}"

        # 创建假的 mp3 文件（ID3 头 + 一些数据）
        # MP3 文件头：0xFF 0xFB 0x90 0x00
        fake_mp3_data = b'\xff\xfb\x90\x00' + b'\x00' * 1000  # 1004 bytes
        filepath.write_bytes(fake_mp3_data)

        # 验证文件存在
        assert filepath.exists(), f"文件不存在: {filepath}"
        # 验证文件大小 > 0
        file_size = filepath.stat().st_size
        assert file_size > 0, f"文件为空: {filepath}"

        slide.audio_url = audio_url
        audio_urls.append(audio_url)

        print(f"  {filename}: {file_size} bytes")
        print(f"    audio_url: {audio_url}")

    print(f"\n模拟生成成功！共 {len(audio_urls)} 个音频文件")

    # 验证所有文件
    print("\n验证所有文件：")
    for slide in slides:
        filename = f"{lesson_id}_slide_{slide.index}.mp3"
        filepath = audio_dir / filename
        assert filepath.exists(), f"文件不存在: {filepath}"
        file_size = filepath.stat().st_size
        assert file_size > 0, f"文件为空: {filepath}"
        print(f"  ✓ {filename}: {file_size} bytes")

    print("\n所有断言通过！")


if __name__ == "__main__":
    asyncio.run(test_tts_mock())
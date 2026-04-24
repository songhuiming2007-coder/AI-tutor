import asyncio
from app.services.tts_service import tts_service
from app.models import Slide


async def test_tts():
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

    lesson_id = "test_001"
    print(f"开始生成 TTS 音频，lesson_id: {lesson_id}")

    try:
        audio_urls = await tts_service.generate_all(lesson_id, slides)
        print(f"\n生成成功！共 {len(audio_urls)} 个音频文件：")

        for i, (slide, audio_url) in enumerate(zip(slides, audio_urls)):
            slide.audio_url = audio_url
            filename = f"{lesson_id}_slide_{slide.index}.mp3"
            filepath = tts_service.audio_dir / filename

            # 验证文件存在
            assert filepath.exists(), f"文件不存在: {filepath}"
            # 验证文件大小 > 0
            file_size = filepath.stat().st_size
            assert file_size > 0, f"文件为空: {filepath}"

            print(f"  {filename}: {file_size} bytes")
            print(f"    audio_url: {audio_url}")

    except Exception as e:
        print(f"生成失败: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(test_tts())
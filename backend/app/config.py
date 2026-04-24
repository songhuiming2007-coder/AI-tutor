from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DASHSCOPE_API_KEY: str
    STATIC_DIR: Path = Path(__file__).parent.parent / "static"
    LLM_TIMEOUT: int = 180
    TTS_TIMEOUT: int = 30
    TTS_MAX_CONCURRENCY: int = 5
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": "../.env"}


settings = Settings()
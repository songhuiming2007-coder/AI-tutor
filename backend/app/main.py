from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .api.router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AI-tutor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# 静态文件挂载（本地开发用，Vercel 环境跳过）
try:
    from fastapi.staticfiles import StaticFiles
    settings.STATIC_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")
except Exception:
    pass

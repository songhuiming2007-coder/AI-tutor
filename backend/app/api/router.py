from fastapi import APIRouter

from .lessons import router as lessons_router

router = APIRouter(prefix="/api")
router.include_router(lessons_router)
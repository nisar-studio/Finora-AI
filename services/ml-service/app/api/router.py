from fastapi import APIRouter

from app.api.routes import analyze, detect, intelligence, predict

api_router = APIRouter()

api_router.include_router(predict.router)
api_router.include_router(detect.router)
api_router.include_router(analyze.router)
api_router.include_router(intelligence.router)
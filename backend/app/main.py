from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models
from app.api import admin, auth, flashcards, grading, idioms, progress, quizzes
from app.core.config import get_settings
from app.core.log import RequestContextMiddleware, get_logger, setup_logging

settings = get_settings()
setup_logging(settings.log_level, settings.log_to_client)
log = get_logger("APP")
app = FastAPI(
    title="Vietnamese Idiom Learning API",
    version="0.1.0",
    root_path=settings.root_path,
)

app.add_middleware(RequestContextMiddleware, log_to_client=settings.log_to_client)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(idioms.router)
app.include_router(grading.router)
app.include_router(quizzes.router)
app.include_router(flashcards.router)
app.include_router(progress.router)


@app.get("/health")
def health():
    return {"status": "ok"}


log.info("api started log_level=%s log_to_client=%s", settings.log_level, settings.log_to_client)

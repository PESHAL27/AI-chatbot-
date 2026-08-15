from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, chat, conversations, memories

app = FastAPI(
    title=settings.APP_NAME,
    description="PML — Advanced Space AI Assistant FastAPI Backend (Phase 6: Long-Term AI Memory)",
    version="6.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(memories.router)

@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "Welcome to PML FastAPI Backend",
        "docs": "/docs",
        "health": "/api/health",
        "conversations": "/api/conversations"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

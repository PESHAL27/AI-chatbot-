from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.rate_limiter import RateLimitMiddleware
from app.auth.request_id_middleware import RequestIDMiddleware
from app.routes import health, chat, conversations, memories, documents, images, auth

app = FastAPI(
    title=settings.APP_NAME,
    description="PML — Advanced Space AI Assistant FastAPI Backend (Production-Grade Performance, Monitoring & Cost Control)",
    version="10.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware with strict origin validation
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Configure Request ID & Performance Monitoring Middleware
app.add_middleware(RequestIDMiddleware)

# Configure Rate Limiter Middleware to prevent abuse & denial of service
app.add_middleware(RateLimitMiddleware)

# Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(memories.router)
app.include_router(documents.router)
app.include_router(images.router)

@app.get("/health", include_in_schema=False)
async def health_root():
    return {"status": "ok", "service": "PML Backend", "version": "10.0.0"}

@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "Welcome to PML FastAPI Production Backend",
        "docs": "/docs",
        "health": "/api/health",
        "monitoring": "/api/monitoring/metrics",
        "conversations": "/api/conversations",
        "documents": "/api/documents"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

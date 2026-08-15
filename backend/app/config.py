import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "PML Backend")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Parse CORS origins list
    raw_cors = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5174,http://localhost:5173,http://127.0.0.1:5174,http://127.0.0.1:5173,http://localhost:3000"
    )
    CORS_ORIGINS: list[str] = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

    # AI Model Configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openrouter")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://openrouter.ai/api/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "openai/gpt-4o-mini")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.7"))
    AI_MAX_TOKENS: int = int(os.getenv("AI_MAX_TOKENS", "2048"))

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://axvbjoaqkanowkjoftxc.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

settings = Settings()

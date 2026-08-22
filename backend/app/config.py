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

    # Web Search Providers (Phase 8: Web Search + AI Tool Calling)
    WEB_SEARCH_PROVIDER: str = os.getenv("WEB_SEARCH_PROVIDER", "duckduckgo")  # 'duckduckgo', 'tavily', 'serper'
    WEB_SEARCH_API_KEY: str = os.getenv("WEB_SEARCH_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://axvbjoaqkanowkjoftxc.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Wikipedia API Configuration
    WIKIPEDIA_USER_AGENT: str = os.getenv("WIKIPEDIA_USER_AGENT", "PML-AI-Assistant/1.0 (https://pml.ai; contact@pml.ai)")
    WIKIPEDIA_LANGUAGE: str = os.getenv("WIKIPEDIA_LANGUAGE", "en")
    WIKIPEDIA_MAX_RESULTS: int = int(os.getenv("WIKIPEDIA_MAX_RESULTS", "3"))

settings = Settings()

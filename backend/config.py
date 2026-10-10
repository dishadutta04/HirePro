import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hrms.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hireflow-ai-super-secret-key-change-in-production")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    # "-latest" aliases follow Google's current stable Flash model, so retirements don't break the app.
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Supabase Auth. When SUPABASE_URL is set, the API accepts Supabase access tokens
    # instead of its own /api/auth/login tokens.
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
    # Only for projects still on the legacy shared JWT secret; new projects sign with
    # asymmetric keys that are fetched from the project's JWKS endpoint.
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    # Server-side only: used to send invite emails. Never expose it to the frontend.
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    # Uploads: "auto" uses Supabase Storage when the service role key is set, else local disk.
    UPLOAD_BACKEND: str = os.getenv("UPLOAD_BACKEND", "auto").strip().lower()
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "hireflow-files").strip()
    # Where invite / reset links land (the frontend).
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    # Demo employees, jobs, leave and payroll are only created when this is true (and the DB is empty).
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "false").lower() in ("1", "true", "yes")
    # On an empty database without demo data, this person becomes the first admin.
    # They still need a Supabase login with the same email.
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "").strip().lower()
    INITIAL_ADMIN_NAME: str = os.getenv("INITIAL_ADMIN_NAME", "Administrator").strip()

    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    ]


settings = Settings()

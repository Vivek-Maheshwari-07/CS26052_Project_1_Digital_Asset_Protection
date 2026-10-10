from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "digital_asset"

    # Auth / JWT
    JWT_SECRET: str = "change-me-in-backend-.env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # One-time passwords
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_SENDS: int = 5

    # Login lockout
    LOGIN_MAX_FAILURES: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    # SMTP (Gmail App Password, Brevo, Outlook, ...). If SMTP_HOST is empty,
    # emails are printed to the backend console instead of being sent.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = False  # True for port 465, False for STARTTLS on 587
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "Provenance"

    FRONTEND_ORIGIN: str = "http://localhost:5173"
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # Image storage (local folder; swap app/storage.py for S3/Cloudinary later)
    UPLOAD_DIR: str = ""  # default: backend/uploads

    # Score fusion: confidence = sigmoid(W_EMB * embedding + W_PHASH * phash + BIAS).
    # Fitted by eval/evaluate.py (run 20261004-061543: 40 photos x 21 edits, 5-fold CV);
    # rerun it on your own test set and paste its output here or in .env.
    FUSION_W_EMBEDDING: float = 27.887
    FUSION_W_PHASH: float = 13.085
    FUSION_BIAS: float = -25.773
    # Verdict thresholds on that confidence: 0.1% and 1% false-positive rate on the eval set
    MATCH_LIKELY: float = 0.996
    MATCH_POSSIBLE: float = 0.27
    # A new registration is refused as a duplicate if it is this close to an existing work
    DUPLICATE_EMBEDDING: float = 0.95
    DUPLICATE_PHASH: float = 0.9

    # Geometric verification gate (app/gate): SIFT+MAGSAC alignment, dense evidence, tiered verdicts.
    # Needs the DINOv2/CLIP weights; set False to run with the fingerprint scores only.
    GATE_ENABLED: bool = True

    # OpenTimestamps anchoring of registry hashes (Bitcoin-backed, free)
    OTS_ENABLED: bool = True
    OTS_CALENDARS: str = "https://a.pool.opentimestamps.org,https://b.pool.opentimestamps.org"

    @property
    def email_enabled(self) -> bool:
        return bool(self.SMTP_HOST)


settings = Settings()

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/researchmate")
# Note: SECRET_KEY should be 32 bytes for AES-256
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "ResearchMateAISecretKey32Bytes!!").encode("utf-8")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-researchmate-ai-123456")

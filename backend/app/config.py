import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/researchmate")
# Note: SECRET_KEY should be 32 bytes for AES-256
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "ResearchMateAISecretKey32Bytes!!").encode("utf-8")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-researchmate-ai-123456")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

print("LINKEDIN_CLIENT_ID:", LINKEDIN_CLIENT_ID)
print("LINKEDIN_CLIENT_SECRET:", LINKEDIN_CLIENT_SECRET)
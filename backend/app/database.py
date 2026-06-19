import urllib.parse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

# Auto-provision Database if it does not exist
def ensure_database_exists():
    try:
        # Parse connection details from DATABASE_URL
        # Expected format: postgresql://username:password@hostname:port/dbname
        url = urllib.parse.urlparse(DATABASE_URL)
        username = url.username or "postgres"
        password = url.password or "postgres"
        hostname = url.hostname or "localhost"
        port = url.port or 5432
        dbname = url.path.lstrip("/") or "researchmate"
        
        # Connect to default 'postgres' database to check if 'researchmate' exists
        conn = psycopg2.connect(
            dbname="postgres",
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname='{dbname}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Database '{dbname}' does not exist. Creating...")
            cursor.execute(f"CREATE DATABASE {dbname}")
            print(f"Database '{dbname}' created successfully.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Database check/provision failed (normal if already setup or using a custom configuration): {e}")

# Run provisioning check
ensure_database_exists()

# Initialize SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

from sqlalchemy import text
def run_migrations():
    try:
        with engine.connect() as conn:
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='reset_otp';"
            ))
            row = res.fetchone()
            if not row:
                print("Running database migration: adding reset_otp and reset_otp_expires_at columns to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP;"))
                conn.commit()
                print("Database migration completed successfully.")
            else:
                print("Database columns reset_otp and reset_otp_expires_at already exist.")
    except Exception as e:
        print(f"Database auto-migration warning: {e}")

# Run migrations
run_migrations()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


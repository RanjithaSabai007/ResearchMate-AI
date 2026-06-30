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
            # 1. Migrate users (reset_otp)
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
                print("Users table migration completed successfully.")
            
            # 2. Ensure projects table exists
            print("Ensuring projects table exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS projects (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR NOT NULL,
                    description VARCHAR,
                    draft_title VARCHAR DEFAULT 'Untitled Draft',
                    draft_content TEXT DEFAULT '',
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.commit()
            print("Projects table check/creation completed.")

            # 3. Migrate papers (add project_id references projects(id))
            res = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='papers' AND column_name='project_id';"
            ))
            row = res.fetchone()
            if not row:
                print("Running database migration: adding project_id column to papers table...")
                conn.execute(text("ALTER TABLE papers ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;"))
                conn.commit()
                print("Papers table migration completed successfully.")

            # 4. Ensure paper_evaluations table exists
            print("Ensuring paper_evaluations table exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS paper_evaluations (
                    id SERIAL PRIMARY KEY,
                    paper_id INTEGER NOT NULL UNIQUE REFERENCES papers(id) ON DELETE CASCADE,
                    overall_score INTEGER NOT NULL DEFAULT 70,
                    paper_type VARCHAR NOT NULL DEFAULT 'Research Paper',
                    citation_value VARCHAR NOT NULL DEFAULT 'Recommended',
                    research_contribution VARCHAR NOT NULL DEFAULT 'Medium',
                    strengths TEXT,
                    weaknesses TEXT,
                    best_for TEXT,
                    not_recommended_for TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.commit()
            print("Paper evaluations table check/creation completed.")

            # 5. Ensure paper_chat_messages table exists
            print("Ensuring paper_chat_messages table exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS paper_chat_messages (
                    id SERIAL PRIMARY KEY,
                    paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
                    role VARCHAR NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.commit()
            print("Paper chat messages table check/creation completed.")

            # 6. Ensure paper_comparisons table exists
            print("Ensuring paper_comparisons table exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS paper_comparisons (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    selected_papers TEXT NOT NULL,
                    comparison_report TEXT NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.commit()
            print("Paper comparisons table check/creation completed.")

            # 7. Ensure novelty_analyses table exists
            print("Ensuring novelty_analyses table exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS novelty_analyses (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    draft_version INTEGER NOT NULL DEFAULT 1,
                    comparison_papers TEXT NOT NULL,
                    analysis_report TEXT NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.commit()
            print("Novelty analyses table check/creation completed.")

            # 8. Ensure diagrams table exists
            print("Ensuring diagrams table exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS diagrams (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    diagram_type VARCHAR(50) NOT NULL,
                    diagram_style VARCHAR(50) NOT NULL,
                    nodes TEXT NOT NULL,
                    edges TEXT NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
                );
            """))
            conn.commit()
            print("Diagrams table check/creation completed.")
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


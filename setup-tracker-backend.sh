#!/usr/bin/env bash
set -euo pipefail

# Personal Time & Expense Tracker — FastAPI backend scaffold
# Usage:
#   chmod +x setup-tracker-backend.sh
#   ./setup-tracker-backend.sh
# Optional:
#   PROJECT_NAME=life-tracker-backend ./setup-tracker-backend.sh
#   PYTHON_BIN=python3.12 ./setup-tracker-backend.sh

PROJECT_NAME="${PROJECT_NAME:-life-tracker-backend}"
PYTHON_BIN="${PYTHON_BIN:-}"

if [ -e "$PROJECT_NAME" ]; then
  echo "Error: '$PROJECT_NAME' already exists."
  echo "Choose another directory with: PROJECT_NAME=your-folder ./setup-tracker-backend.sh"
  exit 1
fi

if [ -z "$PYTHON_BIN" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "Error: Python 3.11+ is required. Install Python and rerun."
    exit 1
  fi
fi

if ! "$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
  echo "Error: Python 3.11 or newer is required. Detected: $("$PYTHON_BIN" --version 2>&1)"
  exit 1
fi

echo "Creating backend project: $PROJECT_NAME"
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

mkdir -p \
  app/api/routes \
  app/core \
  app/db \
  app/models \
  app/schemas \
  app/repositories \
  app/services \
  app/utils \
  tests

cat > .gitignore <<'EOF'
.venv/
venv/
__pycache__/
*.py[cod]
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
htmlcov/
.env
*.db
*.sqlite3
dist/
build/
EOF

cat > .env.example <<'EOF'
APP_NAME=Life Tracker API
APP_ENV=development
DEBUG=true
API_V1_PREFIX=/api/v1
DATABASE_URL=sqlite:///./life_tracker.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EOF

cat > requirements.txt <<'EOF'
fastapi>=0.115,<1.0
uvicorn[standard]>=0.30,<1.0
sqlalchemy>=2.0,<3.0
pydantic-settings>=2.4,<3.0
python-dotenv>=1.0,<2.0
email-validator>=2.2,<3.0

# Development and testing
pytest>=8.0,<9.0
httpx>=0.27,<1.0
ruff>=0.6,<1.0
EOF

cat > requirements-dev.txt <<'EOF'
-r requirements.txt
EOF

cat > app/__init__.py <<'EOF'
EOF
cat > app/api/__init__.py <<'EOF'
EOF
cat > app/api/routes/__init__.py <<'EOF'
EOF
cat > app/core/__init__.py <<'EOF'
EOF
cat > app/db/__init__.py <<'EOF'
EOF
cat > app/models/__init__.py <<'EOF'
EOF
cat > app/schemas/__init__.py <<'EOF'
EOF
cat > app/repositories/__init__.py <<'EOF'
EOF
cat > app/services/__init__.py <<'EOF'
EOF
cat > app/utils/__init__.py <<'EOF'
EOF

cat > app/core/config.py <<'EOF'
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Life Tracker API"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./life_tracker.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
EOF

cat > app/db/session.py <<'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF

cat > app/api/routes/health.py <<'EOF'
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "life-tracker-api"}
EOF

cat > app/api/routes/time_entries.py <<'EOF'
from fastapi import APIRouter

router = APIRouter(prefix="/time-entries", tags=["time entries"])


@router.get("/")
def list_time_entries() -> dict[str, list]:
    """Placeholder endpoint; implement after the local-first data model is finalized."""
    return {"items": []}
EOF

cat > app/api/routes/transactions.py <<'EOF'
from fastapi import APIRouter

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/")
def list_transactions() -> dict[str, list]:
    """Placeholder endpoint; implement when cross-device sync is introduced."""
    return {"items": []}
EOF

cat > app/api/router.py <<'EOF'
from fastapi import APIRouter

from app.api.routes import health, time_entries, transactions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(time_entries.router)
api_router.include_router(transactions.router)
EOF

cat > app/main.py <<'EOF'
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep startup lightweight. Add database migrations when persistent
    # server-side sync models are implemented.
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Life Tracker API is running",
        "docs": "/docs",
        "health": f"{settings.api_v1_prefix}/health",
    }
EOF

cat > tests/test_health.py <<'EOF'
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_api_message():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Life Tracker API is running"


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
EOF

cat > pyproject.toml <<'EOF'
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
testpaths = ["tests"]
EOF

cat > README.md <<'EOF'
# Life Tracker API

A small FastAPI scaffold for the personal time and expense tracker.

## Architecture note

The React website should remain usable offline and save its primary records in IndexedDB.
This API is a foundation for optional cross-device synchronization later; it is not required
for local logging. The current time-entry and transaction endpoints are placeholders.

## Setup

Activate the virtual environment, then run:

```bash
cp .env.example .env
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs for interactive API documentation.

## Tests

```bash
pytest
```

## Environment

- `DATABASE_URL` defaults to a local SQLite file for development.
- `CORS_ORIGINS` defaults to the Vite development URLs.
- Never commit `.env` or secrets.
EOF

echo "Creating Python virtual environment..."
"$PYTHON_BIN" -m venv .venv

if [ -f .venv/Scripts/activate ]; then
  ACTIVATE_HINT="source .venv/Scripts/activate"
else
  ACTIVATE_HINT="source .venv/bin/activate"
fi

echo "Installing Python dependencies..."
if [ -f .venv/Scripts/python.exe ]; then
  .venv/Scripts/python.exe -m pip install --upgrade pip
  .venv/Scripts/python.exe -m pip install -r requirements.txt
else
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
fi

cp .env.example .env

echo
echo "Backend scaffold created successfully."
echo
echo "Next steps:"
echo "  cd $PROJECT_NAME"
echo "  $ACTIVATE_HINT"
echo "  uvicorn app.main:app --reload"
echo
echo "API docs: http://127.0.0.1:8000/docs"
echo "Health:   http://127.0.0.1:8000/api/v1/health"
echo
echo "Note: endpoints for time entries and transactions are placeholders for future sync."

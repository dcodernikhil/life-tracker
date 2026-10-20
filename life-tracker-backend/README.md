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

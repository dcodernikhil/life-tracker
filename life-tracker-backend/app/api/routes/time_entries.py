from fastapi import APIRouter

router = APIRouter(prefix="/time-entries", tags=["time entries"])


@router.get("/")
def list_time_entries() -> dict[str, list]:
    """Placeholder endpoint; implement after the local-first data model is finalized."""
    return {"items": []}

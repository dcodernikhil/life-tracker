from fastapi import APIRouter

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/")
def list_transactions() -> dict[str, list]:
    """Placeholder endpoint; implement when cross-device sync is introduced."""
    return {"items": []}

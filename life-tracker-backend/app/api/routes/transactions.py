
from datetime import datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError
from supabase import Client

from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=0)
    description: str
    category_id: int | None = None
    payment_method: str | None = None
    occurred_at: datetime


class TransactionUpdate(BaseModel):
    type: Literal["income", "expense"] | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    description: str | None = None
    category_id: int | None = None
    payment_method: str | None = None
    occurred_at: datetime | None = None


def get_client(user: dict) -> Client:
    return get_supabase_client(user["access_token"])


@router.get("/")
def list_transactions(
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        response = (
            get_client(current_user)
            .table("transactions")
            .select("*")
            .eq("user_id", current_user["id"])
            .order("occurred_at", desc=True)
            .execute()
        )
        return {"items": response.data or []}
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not fetch transactions.") from exc


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        response = (
            get_client(current_user)
            .table("transactions")
            .insert({
                **payload.model_dump(mode="json"),
                "user_id": current_user["id"],
            })
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=500, detail="Transaction was not created.")
        return response.data[0]
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not create transaction.") from exc


@router.put("/{transaction_id}")
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    updates = payload.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status_code=400, detail="No fields supplied for update.")

    try:
        response = (
            get_client(current_user)
            .table("transactions")
            .update(updates)
            .eq("id", transaction_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found.")
        return response.data[0]
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not update transaction.") from exc


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        response = (
            get_client(current_user)
            .table("transactions")
            .delete()
            .eq("id", transaction_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found.")
        return {"message": "Transaction deleted successfully."}
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not delete transaction.") from exc

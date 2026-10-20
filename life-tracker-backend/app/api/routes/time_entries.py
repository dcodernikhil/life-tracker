
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, model_validator
from postgrest.exceptions import APIError
from supabase import Client

from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/time-entries", tags=["time entries"])


class TimeEntryCreate(BaseModel):
    category_id: int
    title: str
    start_at: datetime
    end_at: datetime | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_at and self.end_at < self.start_at:
            raise ValueError("end_at must not precede start_at")
        return self


class TimeEntryUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.start_at and self.end_at and self.end_at < self.start_at:
            raise ValueError("end_at must not precede start_at")
        return self


def get_client(user: dict) -> Client:
    return get_supabase_client(user["access_token"])


@router.get("/")
def list_time_entries(
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        response = (
            get_client(current_user)
            .table("time_entries")
            .select("*")
            .eq("user_id", current_user["id"])
            .order("start_at", desc=True)
            .execute()
        )
        return {"items": response.data or []}
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not fetch time entries.") from exc


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_time_entry(
    payload: TimeEntryCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        response = (
            get_client(current_user)
            .table("time_entries")
            .insert({
                **payload.model_dump(),
                "user_id": current_user["id"],
            })
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=500, detail="Time entry was not created.")
        return response.data[0]
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not create time entry.") from exc


@router.put("/{entry_id}")
def update_time_entry(
    entry_id: int,
    payload: TimeEntryUpdate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields supplied for update.")

    try:
        response = (
            get_client(current_user)
            .table("time_entries")
            .update(updates)
            .eq("id", entry_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Time entry not found.")
        return response.data[0]
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not update time entry.") from exc


@router.delete("/{entry_id}")
def delete_time_entry(
    entry_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        response = (
            get_client(current_user)
            .table("time_entries")
            .delete()
            .eq("id", entry_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Time entry not found.")
        return {"message": "Time entry deleted successfully."}
    except APIError as exc:
        raise HTTPException(status_code=400, detail="Could not delete time entry.") from exc

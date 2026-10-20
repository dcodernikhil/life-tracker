
from fastapi import HTTPException, status
from supabase import Client, create_client

from app.core.config import settings


def get_supabase_client(access_token: str) -> Client:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration is missing.",
        )

    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )

    # Use the authenticated user's JWT for RLS-protected requests.
    client.postgrest.auth(access_token)

    return client

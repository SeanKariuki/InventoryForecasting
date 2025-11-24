from fastapi import APIRouter
from database.supabase_client import get_supabase

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/")
def list_users():
    supabase = get_supabase()
    data = supabase.table("users").select("*").execute()
    return data.data

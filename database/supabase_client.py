from supabase import create_client, Client
from config import VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL

def get_supabase() -> Client:
 return create_client(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)   

import os
from dotenv import load_dotenv

load_dotenv()

VITE_SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
VITE_SUPABASE_PUBLISHABLE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
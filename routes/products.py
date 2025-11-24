from fastapi import APIRouter
from database.supabase_client import get_supabase
from models.schemas import Product
from datetime import datetime

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/")
def get_products():
    supabase = get_supabase()
    data = supabase.table("products").select("*").execute()
    return data.data


@router.post("/add")
def add_product(product: Product):
    supabase = get_supabase()

    # Insert into products table
    product_payload = {
        "product_name": product.product_name,
        "sku": product.sku,
        "category_id": product.category_id,
        "supplier_id": product.supplier_id,
        "unit_price": product.unit_price,
        "cost_price": product.cost_price,
        "reorder_level": 10,        # system default
        "reorder_quantity": 50,     # system default
        "unit_of_measure": "piece", # system default
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    product_insert = supabase.table("products").insert(product_payload).execute()
    return {
        "message": "Product added successfully",
        "data": product_insert.data
    }

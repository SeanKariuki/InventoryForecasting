from pydantic import BaseModel, Field
from typing import Optional, List

class Product(BaseModel):
    product_name: str
    sku: str
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit_price: float
    cost_price: Optional[float] = None
    initial_stock: Optional[int] = None  # From frontend

# --- 1. Model for the prediction input request ---
class ForecastRequest(BaseModel):
    """
    Defines the parameters required to run a forecast.
    """
    horizon_days: int = Field(..., description="Forecast horizon in days (7, 14, 30, or 90).")
    product_id: Optional[str] = Field(None, description="Product ID to forecast. Required for single forecast.")
    is_batch: bool = Field(False, description="Set to True to run a batch forecast for all products.")
    
    # --- Optional: Future Scenario Inputs (for advanced single forecasts) ---
    # We allow the user to override future price/discount/inventory if they have a plan.
    future_price: Optional[float] = None
    future_discount: Optional[float] = None
    future_inventory: Optional[int] = None

# --- 2. Model for the predicted daily output structure ---
class DailyPrediction(BaseModel):
    """
    Represents a single day's prediction for one product.
    This is the granular output from the model.
    """
    date: str = Field(..., description="Date of the predicted sale (YYYY-MM-DD).")
    product_id: str  # ✅ Keep as string for API (standard REST practice)
    predicted_quantity: int  # ✅ CHANGED: int instead of float (you sell whole units!)
    predicted_revenue: float  # ✅ Stays float (money can have decimals)
    confidence_lower: Optional[int] = None  # ✅ CHANGED: int instead of float (matches DB schema)
    confidence_upper: Optional[int] = None  # ✅ CHANGED: int instead of float (matches DB schema)

# --- 3. Model for the API response ---
class ForecastResponse(BaseModel):
    """
    Defines the standard successful API response structure.
    """
    message: str
    forecast_data: List[DailyPrediction]
    model_version: str
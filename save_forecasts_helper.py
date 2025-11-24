"""
Helper function to save forecast predictions to the database
Place this in your route handler or create a separate database service file
"""

from typing import List, Dict, Any
from datetime import datetime
from database.supabase_client import get_supabase

def save_forecasts_to_db(
    predictions: List[Dict[str, Any]], 
    forecast_period: str = "daily",
    model_version: str = "LightGBM_v1"
) -> Dict[str, Any]:
    """
    Save forecast predictions to the forecasts table
    
    Args:
        predictions: List of prediction dictionaries from the ML model
        forecast_period: Type of forecast (daily, weekly, monthly)
        model_version: Version identifier for the model used
        
    Returns:
        Dictionary with success status and details
    """
    
    supabase = get_supabase()
    
    # Prepare forecast records for database insertion
    forecast_records = []
    
    for pred in predictions:
        record = {
            'product_id': int(pred['product_id']),  # ✅ Convert string to int for DB
            'forecast_date': pred['date'],
            'forecast_period': forecast_period,
            'predicted_quantity': pred['predicted_quantity'],  # Already int
            'predicted_revenue': pred['predicted_revenue'],  # Already float
            'confidence_lower': pred.get('confidence_lower'),
            'confidence_upper': pred.get('confidence_upper'),
            'model_version': model_version,
            'generated_at': datetime.utcnow().isoformat()
        }
        forecast_records.append(record)
    
    try:
        # Insert all forecasts at once (batch insert)
        result = supabase.table('forecasts').insert(forecast_records).execute()
        
        return {
            'success': True,
            'records_inserted': len(result.data),
            'message': f'Successfully saved {len(result.data)} forecast records'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to save forecasts to database'
        }


# Example usage in your FastAPI route:
"""
from fastapi import APIRouter, HTTPException
from models.prediction_service import run_forecast_prediction
from models.schemas import ForecastRequest

router = APIRouter()

@router.post("/forecast/")
async def generate_forecast(request: ForecastRequest):
    try:
        # Step 1: Generate predictions (returns product_id as string)
        predictions = run_forecast_prediction(request)
        
        # Step 2: Save to database (converts product_id to int)
        save_result = save_forecasts_to_db(
            predictions=predictions,
            forecast_period="daily",
            model_version="LightGBM_v1"
        )
        
        if not save_result['success']:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to save forecasts: {save_result['error']}"
            )
        
        # Step 3: Return API response (product_id as string)
        return {
            'status': 'success',
            'forecast_data': predictions,  # product_id as string for API
            'database_info': save_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""


# Alternative: Update existing forecasts if duplicate
def upsert_forecasts_to_db(
    predictions: List[Dict[str, Any]], 
    forecast_period: str = "daily",
    model_version: str = "LightGBM_v1"
) -> Dict[str, Any]:
    """
    Upsert forecast predictions (update if exists, insert if new)
    """
    
    supabase = get_supabase()
    
    forecast_records = []
    
    for pred in predictions:
        record = {
            'product_id': int(pred['product_id']),
            'forecast_date': pred['date'],
            'forecast_period': forecast_period,
            'predicted_quantity': pred['predicted_quantity'],
            'predicted_revenue': pred['predicted_revenue'],
            'confidence_lower': pred.get('confidence_lower'),
            'confidence_upper': pred.get('confidence_upper'),
            'model_version': model_version,
            'generated_at': datetime.utcnow().isoformat()
        }
        forecast_records.append(record)
    
    try:
        # Upsert: update on conflict with unique constraint
        # Your schema has: UNIQUE (product_id, forecast_date, forecast_period)
        result = supabase.table('forecasts').upsert(
            forecast_records,
            on_conflict='product_id,forecast_date,forecast_period'
        ).execute()
        
        return {
            'success': True,
            'records_upserted': len(result.data),
            'message': f'Successfully upserted {len(result.data)} forecast records'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to upsert forecasts to database'
        }
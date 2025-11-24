from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from models.schemas import ForecastRequest, ForecastResponse
from models.prediction_model import run_forecast_prediction, get_forecaster
from database.supabase_client import get_supabase

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


def save_forecasts_to_database(predictions: list, horizon_days: int) -> dict:
    """
    Save ONLY the final day's forecast to database (not all intermediate days)
    Deletes old forecasts first to prevent duplicate key errors
    
    Args:
        predictions: List of daily predictions from ML model
        horizon_days: Forecast horizon (7, 14, 30, 90)
    """
    supabase = get_supabase()
    
    # Group predictions by product_id and keep only the FINAL day
    products_final_forecast = {}
    
    for pred in predictions:
        product_id = pred['product_id']
        
        # Keep only the LAST prediction for each product
        if product_id not in products_final_forecast:
            products_final_forecast[product_id] = pred
        else:
            # Keep the latest date (final forecast day)
            if pred['date'] > products_final_forecast[product_id]['date']:
                products_final_forecast[product_id] = pred
    
    # Determine period label
    if horizon_days <= 7:
        period = '7 Days'
    elif horizon_days <= 14:
        period = '14 Days'
    elif horizon_days <= 30:
        period = '30 Days'
    else:
        period = '90 Days'
    
    # Get list of product IDs we're updating
    product_ids = [int(pid) for pid in products_final_forecast.keys()]
    
    # ============================================================
    # DELETE old forecasts for these products and period
    # This prevents duplicate key constraint errors
    # ============================================================
    try:
        deleted_count = 0
        for product_id in product_ids:
            delete_result = supabase.table('forecasts').delete().eq(
                'product_id', product_id
            ).eq(
                'forecast_period', period
            ).execute()
            deleted_count += len(delete_result.data) if delete_result.data else 0
        
        if deleted_count > 0:
            print(f"🗑️  Deleted {deleted_count} old forecast(s) for {len(product_ids)} product(s) (Period: {period})")
    except Exception as e:
        print(f"⚠️  Warning: Could not delete old forecasts: {str(e)}")
        # Continue anyway - upsert will handle it
    
    # ============================================================
    # INSERT new forecasts (ONE per product)
    # ============================================================
    forecast_records = []
    for product_id, final_pred in products_final_forecast.items():
        record = {
            'product_id': int(product_id),
            'forecast_date': final_pred['date'],  # Future date from prediction
            'forecast_period': period,
            'predicted_quantity': final_pred['predicted_quantity'],
            'predicted_revenue': final_pred['predicted_revenue'],
            'confidence_lower': final_pred.get('confidence_lower'),
            'confidence_upper': final_pred.get('confidence_upper'),
            'model_version': 'LightGBM_V3_Optimized',
            'generated_at': datetime.utcnow().isoformat()
        }
        forecast_records.append(record)
    
    try:
        # Insert new forecasts (no conflict since we deleted old ones)
        result = supabase.table('forecasts').insert(forecast_records).execute()
        
        print(f"✅ Saved {len(result.data)} new forecast(s) to database (Period: {period})")
        return {
            'success': True,
            'records_saved': len(result.data),
            'period': period
        }
    except Exception as e:
        print(f"❌ Failed to save forecasts: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@router.post("/", response_model=ForecastResponse)
def generate_inventory_forecast(request: ForecastRequest):
    """
    Generates a sales forecast (single product or batch) for the specified horizon (7, 14, 30, 90 days).
    
    Returns:
        - All daily predictions to frontend (for charts/visualization)
        - Saves only the FINAL day's forecast to database (for storage/reporting)
    """
    try:
        # 1. Generate predictions (returns daily predictions)
        prediction_data = run_forecast_prediction(request)
        
        if not prediction_data:
            raise HTTPException(
                status_code=404, 
                detail="No predictions could be generated for the requested products/horizon."
            )
        
        # 2. Save to database (ONLY FINAL DAY per product)
        save_result = save_forecasts_to_database(
            predictions=prediction_data,
            horizon_days=request.horizon_days
        )
        
        if not save_result['success']:
            # Log warning but don't fail the request
            print(f"⚠️  Warning: Failed to save forecasts to database: {save_result.get('error')}")
            # Optionally: Uncomment to fail if database save is critical
            # raise HTTPException(status_code=500, detail=f"Database save failed: {save_result.get('error')}")
        else:
            print(f"✅ Database save successful: {save_result['records_saved']} record(s) saved")
        
        # 3. Return ALL daily predictions to frontend (for charts/analysis)
        return {
            "message": f"Forecast generated successfully for {len(prediction_data)} daily records.",
            "forecast_data": prediction_data,
            "model_version": "LightGBM_V3_Optimized"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during prediction: {str(e)}"
        )
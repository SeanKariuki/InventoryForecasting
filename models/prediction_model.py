import joblib
import pandas as pd
import numpy as np
import os 
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

# Import your existing Supabase client
from database.supabase_client import get_supabase

# Assuming you place the schemas file in the same 'models' directory
from .schemas import ForecastRequest

# --- Configuration & Asset Paths ---
MODEL_PATH = "best_lgb_model.pkl"
ENCODER_PRODUCT_PATH = "le_product.pkl"
ENCODER_CATEGORY_PATH = "le_category.pkl"
# ---

# Global Variables for Assets (Loaded once on server start)
BEST_LGB_MODEL = None
LE_PRODUCT = None
LE_CATEGORY = None
HISTORICAL_CONTEXT_DF = None

# --- Service Class Definition ---

class ForecastingManager:
    """
    Manages dynamic forecasting using the loaded LightGBM model.
    Includes recursive logic for generating future lag and roll features.
    """
    def __init__(self, model, le_product, le_category, historical_df):
        self.model = model
        self.le_product = le_product
        self.le_category = le_category
        self.historical_df = historical_df.copy()
        
        # Feature names must exactly match the training features
        # IMPORTANT: Model expects 18 features (not 19!)
        # Removed 'Discount' to match training data
        self.feature_columns = [
            'Price', 'Inventory Level', 'Store ID_encoded', 
            'Product ID_encoded', 'Category_encoded', 'day_of_week', 'is_weekend', 
            'month', 'year', 'month_sin', 'month_cos', 'effective_price', 
            'discount_active', 'stock_category_simple_encoded', 
            'sales_lag_1', 'sales_lag_7', 'sales_lag_30', 'sales_rolling_mean_30'
        ]
        
        self.latest_date = self.historical_df['Date'].max()
        max_lookback = 30 
        self.lookback_df = self.historical_df[
            self.historical_df['Date'] >= (self.latest_date - pd.Timedelta(days=max_lookback))
        ].sort_values('Date').reset_index(drop=True)
        
        print(f"Forecasting Manager Initialized. Latest historical date: {self.latest_date.strftime('%Y-%m-%d')}")

    def _get_product_context(self, product_id: str) -> Dict[str, Any]:
        """Extracts fixed context for a product."""
        # Convert product_id to integer for comparison
        try:
            product_id_int = int(product_id)
        except ValueError:
            product_id_int = product_id
            
        context = self.historical_df[
            self.historical_df['Product ID'] == product_id_int
        ].tail(1)
        
        if context.empty:
            raise ValueError(f"Product ID '{product_id}' not found in historical data.")
        
        last_data = context.iloc[0]
        
        return {
            'Store ID': last_data['Store ID'],
            'Price': last_data['Price'],
            'Discount': last_data.get('Discount', 0),
            'Inventory Level': last_data['Inventory Level'],
            'Category': last_data['Category'],
            'Store ID_encoded': last_data['Store ID_encoded'],
            'Product ID_encoded': last_data['Product ID_encoded'],
            'Category_encoded': last_data['Category_encoded'],
        }

    def _generate_future_features_recursive(self, product_id: str, horizon_days: int) -> List[Dict[str, Any]]:
        """Generates all feature rows recursively, predicting day-by-day."""
        
        context = self._get_product_context(product_id)
        start_date = self.latest_date + pd.Timedelta(days=1)
        date_range = pd.date_range(start=start_date, periods=horizon_days, freq='D')
        
        # Convert product_id for filtering
        try:
            product_id_int = int(product_id)
        except ValueError:
            product_id_int = product_id
            
        # Start with historical sales for initial lags/rolls
        sales_history = self.lookback_df[self.lookback_df['Product ID'] == product_id_int]['Units Sold'].tolist()
        
        daily_predictions = []
        
        for date in date_range:
            # --- 1. Calculate Time and Static Features for the day ---
            future_data = {
                'Store ID_encoded': context['Store ID_encoded'],
                'Product ID_encoded': context['Product ID_encoded'],
                'Category_encoded': context['Category_encoded'],
                
                # Assume static inputs for the forecast period
                'Price': context['Price'],
                'Discount': context['Discount'],
                'Inventory Level': context['Inventory Level'],
                
                # Temporal/Cyclical Features
                'day_of_week': date.dayofweek,
                'month': date.month,
                'year': date.year,
                'is_weekend': int(date.dayofweek >= 5),
                'month_sin': np.sin(2 * np.pi * date.month / 12),
                'month_cos': np.cos(2 * np.pi * date.month / 12),
            }
            
            # --- 2. Calculate Derived Features ---
            future_data['effective_price'] = future_data['Price'] * (1 - future_data['Discount'] / 100)
            future_data['discount_active'] = int(future_data['Discount'] > 0)
            
            # Simplified Stock Category
            stock_cat = pd.cut(
                [future_data['Inventory Level']],
                bins=[0, 50, 200, np.inf], 
                labels=['critical_low', 'medium', 'high'],
                right=False, include_lowest=True
            ).astype(str)[0]
            
            known_stock_classes = ['critical_low', 'medium', 'high']
            future_data['stock_category_simple_encoded'] = known_stock_classes.index(stock_cat)

            # --- 3. Calculate Dynamic Lag and Rolling Features ---
            last_known_sale = sales_history[-1] if sales_history else 0
            
            future_data['sales_lag_1'] = sales_history[-1] if len(sales_history) >= 1 else last_known_sale
            future_data['sales_lag_7'] = sales_history[-7] if len(sales_history) >= 7 else last_known_sale
            future_data['sales_lag_30'] = sales_history[-30] if len(sales_history) >= 30 else last_known_sale
            
            roll_window = sales_history[-30:]
            future_data['sales_rolling_mean_30'] = np.mean(roll_window) if roll_window else last_known_sale
            
            # --- 4. Predict ---
            X_input_df = pd.DataFrame([future_data])[self.feature_columns]
            
            pred_units = self.model.predict(X_input_df)[0]
            pred_units = max(0, pred_units)
            
            # --- 5. Update History and Results ---
            sales_history.append(pred_units)
            
            daily_predictions.append({
                "date": date.strftime("%Y-%m-%d"),
                "product_id": str(product_id),  # String for API response
                "predicted_quantity": int(round(pred_units)),  # Integer for inventory
                "predicted_revenue": round(pred_units * future_data['Price'], 2),
                "confidence_lower": None, 
                "confidence_upper": None,
            })
            
        return daily_predictions

    def forecast_single_product(self, product_id: str, horizon_days: int) -> List[Dict[str, Any]]:
        """Public method for single product forecast."""
        return self._generate_future_features_recursive(product_id, horizon_days)

    def forecast_batch(self, horizon_days: int) -> List[Dict[str, Any]]:
        """Public method for batch product forecast."""
        unique_product_ids = self.historical_df['Product ID'].unique().tolist()
        all_predictions = []
        
        for product_id in unique_product_ids:
            try:
                predictions = self.forecast_single_product(str(product_id), horizon_days)
                all_predictions.extend(predictions)
            except ValueError as e:
                print(f"Skipping product {product_id}: {e}")
                continue
                
        return all_predictions


# --- Initialization Function ---

def load_prediction_assets():
    """Loads model, encoders, and real historical data from Supabase on server startup."""
    global BEST_LGB_MODEL, LE_PRODUCT, LE_CATEGORY, HISTORICAL_CONTEXT_DF
    
    try:
        # 1. Load Model and Encoders
        BEST_LGB_MODEL = joblib.load(MODEL_PATH)
        LE_PRODUCT = joblib.load(ENCODER_PRODUCT_PATH)
        LE_CATEGORY = joblib.load(ENCODER_CATEGORY_PATH)
        
        # 2. Connect to Supabase
        try:
            supabase = get_supabase()
            print("✅ Connected to Supabase using existing client")
        except Exception as e:
            raise RuntimeError(f"Failed to connect to Supabase: {e}")
        
        print("📊 Fetching historical data from Supabase...")
        
        # ============================================================
        # FETCH HISTORICAL DATA (aligned with your schema)
        # ============================================================
        # Your historical_data table columns:
        # - history_date (date)
        # - product_id (integer, FK)
        # - units_sold (integer)
        # - sales_revenue (numeric)
        # - inventory_start (integer)
        # - inventory_end (integer)
        # - period_type (text: 'daily', 'weekly', 'monthly')
        # - data_source (text)
        
        response = supabase.table('historical_data').select(
            'history_date, product_id, units_sold, sales_revenue, inventory_start, inventory_end'
        ).eq('period_type', 'daily').order('history_date').execute()
        
        if not response.data:
            raise RuntimeError("No historical data found in database.")
        
        # ============================================================
        # FETCH PRODUCT DETAILS (aligned with your schema)
        # ============================================================
        # Your products table columns:
        # - product_id (integer, PK)
        # - sku (varchar)
        # - product_name (varchar)
        # - category_id (integer, FK) ← FK to categories table
        # - supplier_id (integer, FK)
        # - unit_price (numeric) ← This is the price column!
        # - cost_price (numeric)
        # - reorder_level (integer)
        # - reorder_quantity (integer)
        # - unit_of_measure (varchar)
        # - is_active (boolean)
        # - created_by (uuid, FK)
        # - created_at (timestamp)
        # - updated_at (timestamp)
        
        products_response = supabase.table('products').select(
            'product_id, product_name, category_id, unit_price'
        ).execute()  # Removed .eq('is_active', True) filter
        
        # Debug logging
        print(f"📦 Products query response: {products_response}")
        print(f"📦 Products data type: {type(products_response.data)}")
        print(f"📦 Products data length: {len(products_response.data) if products_response.data else 0}")
        
        if not products_response.data:
            # Try to get more info about why query failed
            print("❌ No products returned. Checking table existence...")
            test_query = supabase.table('products').select('product_id').limit(1).execute()
            print(f"Test query result: {test_query}")
            raise RuntimeError("No products found in database. Check if products table has data.")
        
        products_df = pd.DataFrame(products_response.data)
        historical_df = pd.DataFrame(response.data)
        
        print(f"✅ Loaded {len(historical_df)} historical records from database")
        print(f"✅ Loaded {len(products_df)} products from database")
        
        # ============================================================
        # DATA TRANSFORMATION
        # ============================================================
        
        # Rename columns to match expected format
        historical_df = historical_df.rename(columns={
            'history_date': 'Date',
            'product_id': 'Product ID',
            'units_sold': 'Units Sold',
            'inventory_start': 'Inventory Level'
        })
        
        # Merge with product details
        historical_df = historical_df.merge(
            products_df[['product_id', 'unit_price', 'category_id']], 
            left_on='Product ID', 
            right_on='product_id',
            how='left'
        )
        
        # Add required columns
        historical_df['Price'] = historical_df['unit_price'].fillna(0)
        historical_df['Discount'] = 0  # Default discount (you can add discount logic later)
        historical_df['Category'] = historical_df['category_id'].fillna(1)
        historical_df['Store ID'] = 1  # Default store ID (single store system)
        historical_df['Date'] = pd.to_datetime(historical_df['Date'])
        
        # Drop rows with missing critical data
        historical_df = historical_df.dropna(subset=['Product ID', 'Units Sold', 'Date', 'Price'])
        
        # Filter out records with zero or negative price
        historical_df = historical_df[historical_df['Price'] > 0]
        
        print(f"📝 After filtering: {len(historical_df)} valid records")
        
        # ============================================================
        # ENCODE CATEGORICAL VARIABLES
        # ============================================================
        from sklearn.preprocessing import LabelEncoder
        
        le_store = LabelEncoder()
        le_product_local = LabelEncoder()
        
        historical_df['Store ID_encoded'] = le_store.fit_transform(historical_df['Store ID'].astype(str))
        historical_df['Product ID_encoded'] = le_product_local.fit_transform(historical_df['Product ID'].astype(str))
        
        # Category is already numeric (category_id), so use it directly (0-indexed)
        historical_df['Category_encoded'] = historical_df['Category'].astype(int) - 1
        
        HISTORICAL_CONTEXT_DF = historical_df.sort_values('Date').reset_index(drop=True)
        
        # ============================================================
        # CALCULATE LAG AND ROLLING FEATURES
        # ============================================================
        print("📈 Calculating lag and rolling features...")
        
        for product_id in HISTORICAL_CONTEXT_DF['Product ID'].unique():
            product_mask = HISTORICAL_CONTEXT_DF['Product ID'] == product_id
            product_data = HISTORICAL_CONTEXT_DF[product_mask].copy()
            
            # Calculate lags
            for lag in [1, 7, 30]:
                HISTORICAL_CONTEXT_DF.loc[product_mask, f'sales_lag_{lag}'] = (
                    product_data['Units Sold'].shift(lag).fillna(0)
                )
            
            # Calculate rolling mean
            HISTORICAL_CONTEXT_DF.loc[product_mask, 'sales_rolling_mean_30'] = (
                product_data['Units Sold'].rolling(30, min_periods=1).mean().shift(1).fillna(0)
            )
        
        print(f"✅ ML Assets and Context Loaded Successfully.")
        print(f"📅 Date Range: {HISTORICAL_CONTEXT_DF['Date'].min()} to {HISTORICAL_CONTEXT_DF['Date'].max()}")
        print(f"🏷️  Products Available: {HISTORICAL_CONTEXT_DF['Product ID'].nunique()}")
        print(f"💰 Price Range: ${HISTORICAL_CONTEXT_DF['Price'].min():.2f} - ${HISTORICAL_CONTEXT_DF['Price'].max():.2f}")
        
    except FileNotFoundError as e:
        raise RuntimeError(f"Asset not found: {e}. Check asset paths.")
    except Exception as e:
        raise RuntimeError(f"Failed to load assets: {str(e)}")

        
# --- Global Manager Instance ---
FORECASTER = None

def get_forecaster() -> ForecastingManager:
    """Dependency injection function to provide the initialized manager."""
    global FORECASTER
    if FORECASTER is None:
        try:
            load_prediction_assets()
            if BEST_LGB_MODEL is None:
                 raise RuntimeError("ML Model failed to load.")
            
            FORECASTER = ForecastingManager(
                model=BEST_LGB_MODEL, 
                le_product=LE_PRODUCT, 
                le_category=LE_CATEGORY, 
                historical_df=HISTORICAL_CONTEXT_DF
            )
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail=f"Service Initialization Failed: {e}"
            )

    return FORECASTER

# --- Main Prediction Function ---
def run_forecast_prediction(request: ForecastRequest) -> List[Dict[str, Any]]:
    """
    Drives the prediction based on the request type (single or batch).
    """
    forecaster = get_forecaster()

    if request.is_batch:
        return forecaster.forecast_batch(request.horizon_days)
    
    if request.product_id:
        return forecaster.forecast_single_product(str(request.product_id), request.horizon_days)
    
    raise ValueError("Request must specify a 'product_id' or set 'is_batch' to True.")
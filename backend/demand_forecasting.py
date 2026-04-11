import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.metrics import mean_squared_error
import os

# 1. GENERATE SYNTHETIC DATA (M5-LIKE)
def generate_synthetic_data(num_skus=10, days=730):
    np.random.seed(42)
    start_date = datetime.now() - timedelta(days=days)
    dates = [start_date + timedelta(days=i) for i in range(days)]
    
    data = []
    skus = [f"SKU_{str(i).zfill(3)}" for i in range(num_skus)]
    
    for sku in skus:
        # Base demand
        base = np.random.randint(10, 50)
        # Seasonality (weekly)
        weekly = np.sin(np.linspace(0, 2 * np.pi * (days/7), days)) * 5
        # Noise
        noise = np.random.normal(0, 2, days)
        # Promotion effect (randomly 5% of days)
        promo = np.random.choice([0, 1], size=days, p=[0.95, 0.05])
        promo_effect = promo * np.random.randint(10, 30, days)
        
        sales = np.maximum(0, base + weekly + noise + promo_effect).astype(int)
        
        for i, date in enumerate(dates):
            data.append({
                "sku": sku,
                "ds": date,
                "y": sales[i],
                "on_promotion": promo[i],
                "is_weekend": 1 if date.weekday() >= 5 else 0,
                "temp": 20 + 10 * np.sin(2 * np.pi * i / 365) + np.random.normal(0, 2) # Seasonal temp
            })
            
    return pd.DataFrame(data)

# 2. FEATURE ENGINEERING
def create_features(df):
    df = df.copy()
    df['ds'] = pd.to_datetime(df['ds'])
    df['day_of_week'] = df['ds'].dt.dayofweek
    df['month'] = df['ds'].dt.month
    df['day_of_year'] = df['ds'].dt.dayofyear
    
    # Lag features
    df['lag_7'] = df.groupby('sku')['y'].shift(7)
    df['lag_14'] = df.groupby('sku')['y'].shift(14)
    df['lag_28'] = df.groupby('sku')['y'].shift(28)
    
    # Rolling features
    df['rolling_mean_7'] = df.groupby('sku')['y'].transform(lambda x: x.shift(1).rolling(window=7).mean())
    df['rolling_std_7'] = df.groupby('sku')['y'].transform(lambda x: x.shift(1).rolling(window=7).std())
    
    return df.dropna()

class DemandForecaster:
    def __init__(self):
        self.models = {}
        
    def train(self, df):
        df_feat = create_features(df)
        skus = df_feat['sku'].unique()
        
        for sku in skus:
            sku_data = df_feat[df_feat['sku'] == sku]
            X = sku_data.drop(['sku', 'ds', 'y'], axis=1)
            y = sku_data['y']
            
            model = xgb.XGBRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )
            model.fit(X, y)
            self.models[sku] = model
            print(f"Trained model for {sku}")
            
    def forecast(self, df, sku, horizon=30):
        if sku not in self.models:
            return None
        
        last_date = df[df['sku'] == sku]['ds'].max()
        future_dates = [last_date + timedelta(days=i+1) for i in range(horizon)]
        
        # Simpler forecasting for demo: we'll predict iteratively or use last stats
        # For this demo, let's just generate features for the future dates 
        # (Assuming we know promotion calendars and weather)
        
        current_data = df[df['sku'] == sku].tail(60).copy()
        
        forecasts = []
        for i in range(horizon):
            future_date = future_dates[i]
            # Dummy promo and temp for future
            promo = 1 if np.random.random() > 0.95 else 0
            temp = 20 + 10 * np.sin(2 * np.pi * (timedelta(days=730) + timedelta(days=i)).days / 365)
            
            # Add future row
            new_row = {
                'sku': sku,
                'ds': future_date,
                'on_promotion': promo,
                'is_weekend': 1 if future_date.weekday() >= 5 else 0,
                'temp': temp,
                'y': 0 # placeholder
            }
            
            current_data = pd.concat([current_data, pd.DataFrame([new_row])], ignore_index=True)
            feat_data = create_features(current_data)
            
            X_future = feat_data.tail(1).drop(['sku', 'ds', 'y'], axis=1)
            pred = self.models[sku].predict(X_future)[0]
            pred = max(0, pred)
            
            current_data.loc[current_data.index[-1], 'y'] = int(pred)
            forecasts.append({'date': future_date, 'predicted_demand': float(pred)})
            
        return forecasts

# 3. REPLENISHMENT LOGIC
def calculate_replenishment(sku, forecast, current_stock, lead_time=3, service_level=0.95):
    # Forecasted demand during lead time
    demand_lead_time = sum([f['predicted_demand'] for f in forecast[:lead_time]])
    avg_daily_demand = np.mean([f['predicted_demand'] for f in forecast])
    std_demand = np.std([f['predicted_demand'] for f in forecast])
    
    # Z-scores
    z_scores = {0.90: 1.28, 0.95: 1.645, 0.99: 2.33}
    z = z_scores.get(service_level, 1.645)
    
    # Safety Stock
    safety_stock = z * std_demand * np.sqrt(lead_time)
    
    # Reorder Point
    rop = demand_lead_time + safety_stock
    
    suggested_order = 0
    if current_stock <= rop:
        # Suggested order = Target stock - current stock
        # Target stock = demand during lead time + demand for a week + safety stock
        target_stock = rop + (avg_daily_demand * 7) 
        suggested_order = max(0, int(target_stock - current_stock))
        
    return {
        "sku": sku,
        "current_stock": current_stock,
        "reorder_point": int(rop),
        "safety_stock": int(safety_stock),
        "suggested_order_quantity": suggested_order,
        "status": "REORDER" if current_stock <= rop else "OK"
    }

if __name__ == "__main__":
    print("Generating data...")
    df = generate_synthetic_data(num_skus=5)
    
    forecaster = DemandForecaster()
    print("Training models...")
    forecaster.train(df)
    
    sku_to_test = "SKU_001"
    print(f"Forecasting for {sku_to_test}...")
    forecast = forecaster.forecast(df, sku_to_test)
    
    current_stock = 40
    replenishment = calculate_replenishment(sku_to_test, forecast, current_stock)
    
    print("\n--- Replenishment Report ---")
    import json
    print(json.dumps(replenishment, indent=2))

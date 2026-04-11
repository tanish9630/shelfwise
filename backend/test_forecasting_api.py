import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_forecasting():
    print("Fetching SKU list...")
    try:
        response = requests.get(f"{BASE_URL}/skus")
        if response.status_code != 200:
            print("Failed to fetch SKUs. Is the server running?")
            return
        
        skus = response.json().get("skus", [])
        if not skus:
            print("No SKUs found.")
            return
        
        test_sku = skus[0]
        print(f"Testing forecasting for {test_sku}...")
        
        # 1. Test Forecast
        f_resp = requests.get(f"{BASE_URL}/forecast/{test_sku}?horizon=7")
        print("\n--- Forecast (next 7 days) ---")
        print(json.dumps(f_resp.json(), indent=2))
        
        # 2. Test Replenishment
        r_resp = requests.get(f"{BASE_URL}/replenishment/{test_sku}?current_stock=20")
        print("\n--- Replenishment Intelligence ---")
        print(json.dumps(r_resp.json(), indent=2))
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_forecasting()

"""
Test the Real-Time Alert System:
  1. Connect a WebSocket listener
  2. Fire a test alert via REST
  3. Send a detection image (triggers auto-alerts)
  4. Acknowledge an alert
  5. Check stats
"""

import asyncio
import json
import threading
import time
import requests
import os

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])
    import websockets

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/alerts"

# Find a test image
IMAGE_DIR = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)\test\images"
test_image = None
if os.path.exists(IMAGE_DIR):
    imgs = [f for f in os.listdir(IMAGE_DIR) if f.endswith('.jpg')]
    if imgs:
        test_image = os.path.join(IMAGE_DIR, imgs[0])


async def websocket_listener():
    """Connect to WebSocket and print alerts as they arrive."""
    print("\n[WS] Connecting to WebSocket...")
    async with websockets.connect(WS_URL) as ws:
        print("[WS] Connected! Listening for alerts...\n")
        
        # Listen for 15 seconds
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=15)
                data = json.loads(msg)
                if data.get("event") == "alert":
                    a = data["data"]
                    print(f"[WS ALERT] [{a['severity']}] {a['type']}: {a['message']}")
                    print(f"           Impact: {a['revenue_impact_score']} | Actions: {a['corrective_actions'][0]}")
                    print()
                else:
                    print(f"[WS] {data}")
        except asyncio.TimeoutError:
            print("[WS] No more alerts received. Closing.")


def run_rest_tests():
    """Run REST API tests to trigger and manage alerts."""
    time.sleep(2)  # Wait for WS to connect first
    
    # 1. Fire a test alert
    print("--- [1] Firing Test Alert ---")
    r = requests.post(f"{BASE_URL}/alerts/test")
    print(f"Status: {r.status_code}")
    data = r.json()
    test_alert_id = data["alert"]["id"]
    print(f"Alert ID: {test_alert_id}")
    print()
    
    time.sleep(1)
    
    # 2. Send a real image for detection (auto-generates alerts)
    if test_image:
        print("--- [2] Detecting Objects (triggers auto-alerts) ---")
        with open(test_image, 'rb') as f:
            r2 = requests.post(
                f"{BASE_URL}/detect",
                files={"file": (os.path.basename(test_image), f, "image/jpeg")},
                params={"location": "Aisle 5, Shelf C"}
            )
        if r2.status_code == 200:
            d = r2.json()
            print(f"Detected {d['count']} objects, fired {d['alerts_fired']} alerts.")
            if d.get("alert_summary"):
                for a in d["alert_summary"][:3]:
                    print(f"  [{a['severity']}] {a['type']}: {a['message'][:80]}...")
        else:
            print(f"Detection failed: {r2.text}")
        print()
    else:
        print("--- [2] Skipped (no test image found) ---\n")
    
    time.sleep(1)
    
    # 3. Check active alerts
    print("--- [3] Active Alerts ---")
    r3 = requests.get(f"{BASE_URL}/alerts/active")
    alerts = r3.json()["alerts"]
    print(f"Total unacknowledged: {len(alerts)}")
    for a in alerts[:3]:
        print(f"  [{a['severity']}] {a['type']} (impact: {a['revenue_impact_score']})")
    print()
    
    # 4. Acknowledge the test alert
    print(f"--- [4] Acknowledging Alert {test_alert_id} ---")
    r4 = requests.post(f"{BASE_URL}/alerts/acknowledge/{test_alert_id}")
    print(f"Result: {r4.json()}")
    print()
    
    # 5. Stats
    print("--- [5] Alert System Stats ---")
    r5 = requests.get(f"{BASE_URL}/alerts/stats")
    print(json.dumps(r5.json(), indent=2))


async def main():
    # Run WebSocket listener and REST tests concurrently
    ws_task = asyncio.create_task(websocket_listener())
    
    # Run REST tests in a thread so they don't block the event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, run_rest_tests)
    
    # Wait for WS listener to finish
    await ws_task


if __name__ == "__main__":
    asyncio.run(main())

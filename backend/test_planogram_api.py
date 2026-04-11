import requests
import json
import os

URL = "http://127.0.0.1:8000/planogram"
IMAGE_PATH = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\Screenshot 2026-04-11 053922.png"

def test_planogram():
    if not os.path.exists(IMAGE_PATH):
        print(f"Error: Image not found at {IMAGE_PATH}")
        return

    print(f"Sending image {IMAGE_PATH} to {URL}...")
    
    with open(IMAGE_PATH, 'rb') as f:
        files = {'file': (os.path.basename(IMAGE_PATH), f, 'image/png')}
        try:
            response = requests.post(URL, files=files)
            if response.status_code == 200:
                print("Success!")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"Failed with status code: {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"Connection error: {e}")

if __name__ == "__main__":
    test_planogram()

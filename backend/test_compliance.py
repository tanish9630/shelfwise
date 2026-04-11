"""
Test Automated Planogram Compliance:
  1. Get sample planogram reference
  2. Run compliance scan on a real image (auto-detect + compare)
  3. Run compliance check with pre-computed detections + custom reference
"""

import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"

IMAGE_DIR = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)\test\images"
test_image = None
if os.path.exists(IMAGE_DIR):
    imgs = [f for f in os.listdir(IMAGE_DIR) if f.endswith('.jpg')]
    if imgs:
        test_image = os.path.join(IMAGE_DIR, imgs[0])


def test_compliance():
    # ─── 1. Get Sample Planogram ───
    print("=" * 60)
    print("[1] Fetching Sample Planogram Reference")
    print("=" * 60)
    r1 = requests.get(f"{BASE_URL}/compliance/sample-planogram?width=3840&height=2160")
    planogram = r1.json()
    print(f"Aisle: {planogram['aisle']}, Section: {planogram['section']}")
    print(f"Total positions defined: {len(planogram['positions'])}")
    for pos in planogram['positions'][:4]:
        print(f"  {pos['id']}: {pos['sku']} @ region {pos['region']}")
    print(f"  ... ({len(planogram['positions'])} total)")
    print()

    # ─── 2. Full Compliance Scan (image + auto planogram) ───
    if test_image:
        print("=" * 60)
        print("[2] Compliance Scan (upload image, auto-detect + compare)")
        print("=" * 60)
        with open(test_image, 'rb') as f:
            r2 = requests.post(
                f"{BASE_URL}/compliance/scan",
                files={"file": (os.path.basename(test_image), f, "image/jpeg")},
            )
        if r2.status_code == 200:
            data = r2.json()
            report = data["compliance_report"]
            print(f"Detections: {data['detection_count']}")
            print(f"Compliance Score: {report['compliance_score']}%")
            print(f"Compliant: {report['compliant_positions']}/{report['total_positions']}")
            print(f"Issues found: {sum(report['issue_summary'].values())}")
            print(f"  - Misplaced:     {report['issue_summary']['misplaced']}")
            print(f"  - Missing:       {report['issue_summary']['missing_facings']}")
            print(f"  - Incorrect tag: {report['issue_summary']['incorrect_tags']}")
            print(f"  - Unauthorized:  {report['issue_summary']['unauthorized']}")
            print(f"Obstruction:       {report['obstruction_detected']}")
            print(f"Unauthorized products: {report['unauthorized_products']}")
            print()

            # Show position details
            print("Position Details:")
            for p in report["position_details"][:6]:
                status_icon = {
                    "PRESENT": "[OK]", "STOCKOUT": "[!!]",
                    "MISSING": "[??]", "MISPLACED": "[><]"
                }.get(p["status"], "[--]")
                compliant_str = "PASS" if p.get("compliant") else "FAIL"
                issues_str = "; ".join(p["issues"]) if p["issues"] else "No issues"
                print(f"  {status_icon} {p['position_id']} ({p['expected_sku']}): "
                      f"{p['status']} [{compliant_str}] - {issues_str}")
            if len(report["position_details"]) > 6:
                print(f"  ... ({len(report['position_details'])} total positions)")
        else:
            print(f"Error: {r2.status_code} {r2.text}")
        print()

    # ─── 3. Compliance Check with Custom Reference ───
    print("=" * 60)
    print("[3] Compliance Check with custom detections + reference")
    print("=" * 60)
    custom_reference = {
        "aisle": "Aisle 1",
        "section": "Shelf A",
        "positions": [
            {"id": "pos_01", "expected_class": "Product", "label_type": "Label_Price",
             "sku": "Coca-Cola 500ml",
             "region": [100, 200, 400, 500]},
            {"id": "pos_02", "expected_class": "Product", "label_type": "Label_Price",
             "sku": "Pepsi 500ml",
             "region": [450, 200, 750, 500]},
            {"id": "pos_03", "expected_class": "Product", "label_type": "Label_Promo",
             "sku": "Sprite 330ml",
             "region": [800, 200, 1100, 500]},
        ]
    }

    # Simulated detections (imagine YOLO returned these)
    custom_detections = [
        {"class": "Product", "confidence": 0.88, "bbox": [120, 210, 380, 490]},     # matches pos_01
        {"class": "Stockout", "confidence": 0.72, "bbox": [460, 210, 740, 490]},     # stockout at pos_02
        {"class": "Product", "confidence": 0.65, "bbox": [820, 220, 1080, 480]},     # matches pos_03
        {"class": "Label_Price", "confidence": 0.55, "bbox": [110, 500, 390, 550]},  # label near pos_01
        {"class": "Product", "confidence": 0.45, "bbox": [1200, 300, 1500, 550]},    # unauthorized
    ]

    r3 = requests.post(
        f"{BASE_URL}/compliance/check",
        json={"reference": custom_reference, "detections": custom_detections}
    )
    if r3.status_code == 200:
        report = r3.json()
        print(f"Compliance Score: {report['compliance_score']}%")
        print(f"Compliant: {report['compliant_positions']}/{report['total_positions']}")
        print(f"Issues: {sum(report['issue_summary'].values())}")
        for k, v in report["issue_summary"].items():
            print(f"  - {k}: {v}")
        print(f"Unauthorized products: {report['unauthorized_products']}")
        print()
        print("Position-by-position:")
        for p in report["position_details"]:
            compliant_str = "PASS" if p.get("compliant") else "FAIL"
            print(f"  {p['position_id']} ({p['expected_sku']}): {p['status']} [{compliant_str}]")
            for iss in p["issues"]:
                print(f"    -> {iss}")
        if report["unauthorized_details"]:
            print()
            print("Unauthorized products:")
            for u in report["unauthorized_details"]:
                print(f"  {u['class']} (conf={u['confidence']:.2f}) at {u['bbox']}")
    else:
        print(f"Error: {r3.status_code} {r3.text}")

    print()
    print("=" * 60)
    print("Compliance test complete!")
    print("=" * 60)


if __name__ == "__main__":
    test_compliance()

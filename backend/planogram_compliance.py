"""
Shelfwise Planogram Compliance Engine

Compares the intended shelf layout (structured JSON reference)
against the actual detected shelf state from YOLO inference.
Identifies: misplaced products, missing facings, incorrect price tags,
unauthorized products.  Generates compliance scores per aisle/section.
"""

from typing import Optional
import math


# ─── REFERENCE PLANOGRAM SCHEMA ───
# A planogram reference is a list of expected shelf positions.
# Each position defines what product/class should be there and its
# approximate bounding-box region (normalized 0-1 or pixel coords).
#
# Example:
# {
#   "aisle": "Aisle 3",
#   "section": "Shelf B",
#   "positions": [
#     {"id": "pos_1", "expected_class": "Product", "label_type": "Label_Price",
#      "region": [x1, y1, x2, y2], "sku": "Coca-Cola 500ml"},
#     ...
#   ]
# }


def iou(box_a, box_b):
    """Intersection over Union between two [x1,y1,x2,y2] boxes."""
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0


def box_center(box):
    """Return (cx, cy) of a box."""
    return ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)


def distance(p1, p2):
    """Euclidean distance between two points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


class PlanogramComplianceEngine:
    """
    Compares a reference planogram against actual detections
    and produces a detailed compliance report.
    """

    def __init__(self, iou_threshold: float = 0.15):
        self.iou_threshold = iou_threshold

    def check_compliance(self, reference: dict, detections: list) -> dict:
        """
        Main entry point.

        Args:
            reference: Planogram reference JSON with 'aisle', 'section', 'positions'.
            detections: List of detection dicts from YOLO
                        [{"class": ..., "confidence": ..., "bbox": [x1,y1,x2,y2]}, ...]

        Returns:
            Compliance report dict.
        """
        aisle = reference.get("aisle", "Unknown")
        section = reference.get("section", "Unknown")
        positions = reference.get("positions", [])

        # Separate detections by class
        det_products = [d for d in detections if d["class"] == "Product"]
        det_stockouts = [d for d in detections if d["class"] == "Stockout"]
        det_labels_price = [d for d in detections if d["class"] == "Label_Price"]
        det_labels_promo = [d for d in detections if d["class"] == "Label_Promo"]
        det_obstructions = [d for d in detections if d["class"] == "Obstruction"]

        # Track which detections have been matched
        matched_det_indices = set()

        # Per-position results
        position_results = []
        compliant_count = 0
        issues = []

        for pos in positions:
            pos_id = pos.get("id", "unknown")
            expected_class = pos.get("expected_class", "Product")
            expected_label = pos.get("label_type", "Label_Price")
            expected_sku = pos.get("sku", None)
            region = pos.get("region", None)

            result = {
                "position_id": pos_id,
                "expected_class": expected_class,
                "expected_sku": expected_sku,
                "expected_label": expected_label,
                "status": "UNKNOWN",
                "issues": [],
                "matched_detection": None,
            }

            if region is None:
                result["status"] = "NO_REGION"
                result["issues"].append("No region defined for this position.")
                position_results.append(result)
                continue

            # 1. Check if expected product is present at this position
            best_match = None
            best_iou = 0
            best_idx = -1

            relevant_dets = det_products if expected_class == "Product" else detections
            for idx, det in enumerate(relevant_dets):
                if idx in matched_det_indices:
                    continue
                overlap = iou(region, det["bbox"])
                if overlap > best_iou:
                    best_iou = overlap
                    best_match = det
                    best_idx = idx

            if best_match and best_iou >= self.iou_threshold:
                matched_det_indices.add(best_idx)
                result["matched_detection"] = best_match

                # Check if the class matches
                if best_match["class"] != expected_class:
                    result["status"] = "MISPLACED"
                    result["issues"].append(
                        f"Expected '{expected_class}' but found '{best_match['class']}' (IoU={best_iou:.2f})."
                    )
                    issues.append({
                        "type": "MISPLACED_PRODUCT",
                        "position": pos_id,
                        "detail": result["issues"][-1],
                    })
                else:
                    result["status"] = "PRESENT"
            else:
                # Check if there is a stockout in this region instead
                stockout_found = False
                for so in det_stockouts:
                    if iou(region, so["bbox"]) >= self.iou_threshold:
                        stockout_found = True
                        break

                if stockout_found:
                    result["status"] = "STOCKOUT"
                    result["issues"].append("Expected product is missing (stockout detected).")
                    issues.append({
                        "type": "MISSING_FACING",
                        "position": pos_id,
                        "detail": f"SKU '{expected_sku}' is missing from position {pos_id}.",
                    })
                else:
                    result["status"] = "MISSING"
                    result["issues"].append("Expected product not found at this position.")
                    issues.append({
                        "type": "MISSING_FACING",
                        "position": pos_id,
                        "detail": f"No product detected at position {pos_id}.",
                    })

            # 2. Check price label compliance
            if expected_label:
                label_dets = det_labels_price if expected_label == "Label_Price" else det_labels_promo
                label_found = False
                for ld in label_dets:
                    if iou(region, ld["bbox"]) >= self.iou_threshold * 0.5:
                        label_found = True
                        break
                if not label_found:
                    result["issues"].append(f"Expected '{expected_label}' not found near this position.")
                    issues.append({
                        "type": "INCORRECT_PRICE_TAG",
                        "position": pos_id,
                        "detail": f"Missing or incorrect label at position {pos_id}.",
                    })

            # Determine if fully compliant
            if result["status"] == "PRESENT" and len(result["issues"]) == 0:
                result["compliant"] = True
                compliant_count += 1
            else:
                result["compliant"] = False

            position_results.append(result)

        # 3. Detect unauthorized products (detected but not in any reference position)
        unauthorized = []
        for idx, det in enumerate(det_products):
            if idx not in matched_det_indices:
                # Check if this detection overlaps ANY reference region
                overlaps_any = False
                for pos in positions:
                    if pos.get("region") and iou(pos["region"], det["bbox"]) >= self.iou_threshold:
                        overlaps_any = True
                        break
                if not overlaps_any:
                    unauthorized.append({
                        "class": det["class"],
                        "confidence": det["confidence"],
                        "bbox": det["bbox"],
                    })
                    issues.append({
                        "type": "UNAUTHORIZED_PRODUCT",
                        "position": "N/A",
                        "detail": f"Unauthorized product detected at bbox {[round(x,1) for x in det['bbox']]}.",
                    })

        # 4. Compute compliance score
        total_positions = len(positions) if positions else 1
        compliance_score = round((compliant_count / total_positions) * 100, 1)

        return {
            "aisle": aisle,
            "section": section,
            "compliance_score": compliance_score,
            "total_positions": len(positions),
            "compliant_positions": compliant_count,
            "non_compliant_positions": len(positions) - compliant_count,
            "unauthorized_products": len(unauthorized),
            "obstruction_detected": len(det_obstructions) > 0,
            "issues": issues,
            "issue_summary": {
                "misplaced": sum(1 for i in issues if i["type"] == "MISPLACED_PRODUCT"),
                "missing_facings": sum(1 for i in issues if i["type"] == "MISSING_FACING"),
                "incorrect_tags": sum(1 for i in issues if i["type"] == "INCORRECT_PRICE_TAG"),
                "unauthorized": sum(1 for i in issues if i["type"] == "UNAUTHORIZED_PRODUCT"),
            },
            "position_details": position_results,
            "unauthorized_details": unauthorized,
        }


def generate_sample_planogram(image_width: int = 3840, image_height: int = 2160) -> dict:
    """
    Generate a realistic sample planogram for testing purposes.
    Simulates a 3-shelf section with 4 product positions each.
    """
    w = image_width
    h = image_height

    positions = []
    shelf_count = 3
    cols_per_shelf = 4
    pos_id = 1

    for shelf in range(shelf_count):
        y_start = int(h * (0.1 + shelf * 0.3))
        y_end = int(h * (0.1 + shelf * 0.3 + 0.25))

        for col in range(cols_per_shelf):
            x_start = int(w * (0.05 + col * 0.23))
            x_end = int(w * (0.05 + col * 0.23 + 0.2))

            positions.append({
                "id": f"pos_{pos_id:02d}",
                "expected_class": "Product",
                "label_type": "Label_Price",
                "sku": f"SKU_{pos_id:03d}",
                "region": [x_start, y_start, x_end, y_end],
            })
            pos_id += 1

    return {
        "aisle": "Aisle 5",
        "section": "Shelf C",
        "image_dimensions": [w, h],
        "positions": positions,
    }

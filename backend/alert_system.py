"""
Shelfwise Real-Time Alert System

Handles alert generation, prioritization by revenue impact,
corrective action suggestions, and multi-channel notification dispatch.
"""

import asyncio
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from collections import deque


class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"   # Stockout on high-revenue SKU
    HIGH = "HIGH"           # Low stock or planogram violation on key items
    MEDIUM = "MEDIUM"       # Minor planogram deviation
    LOW = "LOW"             # Informational (e.g., obstruction detected)


class AlertType(str, Enum):
    STOCKOUT = "STOCKOUT"
    LOW_STOCK = "LOW_STOCK"
    PLANOGRAM_VIOLATION = "PLANOGRAM_VIOLATION"
    PRICE_TAG_MISSING = "PRICE_TAG_MISSING"
    OBSTRUCTION = "OBSTRUCTION"


# Revenue impact weights for prioritization (higher = more important)
REVENUE_WEIGHTS = {
    AlertType.STOCKOUT: 100,
    AlertType.LOW_STOCK: 60,
    AlertType.PLANOGRAM_VIOLATION: 40,
    AlertType.PRICE_TAG_MISSING: 30,
    AlertType.OBSTRUCTION: 10,
}

# Suggested corrective actions per alert type
CORRECTIVE_ACTIONS = {
    AlertType.STOCKOUT: [
        "Immediately retrieve product from backroom inventory.",
        "Check replenishment order status for this SKU.",
        "If backroom is empty, escalate to store manager for emergency reorder.",
    ],
    AlertType.LOW_STOCK: [
        "Pull additional units from backroom to fill shelf to planogram depth.",
        "Verify the next scheduled replenishment delivery window.",
        "Consider front-facing remaining units to improve shelf appearance.",
    ],
    AlertType.PLANOGRAM_VIOLATION: [
        "Compare current shelf layout against approved planogram.",
        "Relocate misplaced products to their designated positions.",
        "Report persistent violations to merchandising team.",
    ],
    AlertType.PRICE_TAG_MISSING: [
        "Print and attach the correct shelf-edge label for this position.",
        "Verify current price in POS system before printing.",
        "Check if a promotional tag should replace the standard label.",
    ],
    AlertType.OBSTRUCTION: [
        "Clear the obstruction (cart, display, etc.) from the aisle.",
        "Note: Detection accuracy may be reduced while obstruction is present.",
        "Re-scan shelf after obstruction is cleared for accurate audit.",
    ],
}


class Alert:
    """Represents a single alert event."""

    def __init__(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        message: str,
        location: str = "Unknown Aisle",
        sku: Optional[str] = None,
        confidence: float = 0.0,
        bbox: Optional[list] = None,
    ):
        self.id = str(uuid.uuid4())[:8]
        self.alert_type = alert_type
        self.severity = severity
        self.message = message
        self.location = location
        self.sku = sku
        self.confidence = confidence
        self.bbox = bbox or []
        self.timestamp = datetime.now().isoformat()
        self.acknowledged = False
        self.revenue_impact = REVENUE_WEIGHTS.get(alert_type, 0)
        self.corrective_actions = CORRECTIVE_ACTIONS.get(alert_type, [])

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.alert_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "location": self.location,
            "sku": self.sku,
            "confidence": round(self.confidence, 3),
            "bbox": self.bbox,
            "timestamp": self.timestamp,
            "acknowledged": self.acknowledged,
            "revenue_impact_score": self.revenue_impact,
            "corrective_actions": self.corrective_actions,
        }


class AlertManager:
    """
    Manages alert lifecycle: creation, prioritization, 
    WebSocket broadcasting, and history.
    """

    def __init__(self, max_history: int = 500):
        self.active_connections: list = []  # WebSocket connections
        self.alert_history: deque = deque(maxlen=max_history)
        self.unacknowledged: dict = {}  # id -> Alert

    async def connect(self, websocket):
        """Register a new WebSocket client."""
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send recent unacknowledged alerts on connect
        pending = sorted(
            self.unacknowledged.values(),
            key=lambda a: a.revenue_impact,
            reverse=True,
        )
        for alert in pending:
            try:
                await websocket.send_json({"event": "alert", "data": alert.to_dict()})
            except Exception:
                break

    def disconnect(self, websocket):
        """Remove a disconnected WebSocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, alert: Alert):
        """Send an alert to ALL connected WebSocket clients."""
        message = {"event": "alert", "data": alert.to_dict()}
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def create_alert(self, alert: Alert):
        """Register a new alert: store, prioritize, broadcast."""
        self.alert_history.append(alert)
        self.unacknowledged[alert.id] = alert
        await self.broadcast(alert)
        # Log to console (simulates email digest / mobile push)
        self._log_alert(alert)
        return alert

    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged by a store associate."""
        if alert_id in self.unacknowledged:
            self.unacknowledged[alert_id].acknowledged = True
            del self.unacknowledged[alert_id]
            return True
        return False

    def get_active_alerts(self, severity: Optional[str] = None):
        """Return all unacknowledged alerts, sorted by revenue impact."""
        alerts = list(self.unacknowledged.values())
        if severity:
            alerts = [a for a in alerts if a.severity.value == severity]
        alerts.sort(key=lambda a: a.revenue_impact, reverse=True)
        return [a.to_dict() for a in alerts]

    def get_alert_history(self, limit: int = 50):
        """Return recent alert history."""
        history = list(self.alert_history)[-limit:]
        history.reverse()
        return [a.to_dict() for a in history]

    def get_stats(self):
        """Dashboard-friendly alert statistics."""
        history = list(self.alert_history)
        by_type = {}
        by_severity = {}
        for a in history:
            by_type[a.alert_type.value] = by_type.get(a.alert_type.value, 0) + 1
            by_severity[a.severity.value] = by_severity.get(a.severity.value, 0) + 1
        return {
            "total_alerts": len(history),
            "unacknowledged": len(self.unacknowledged),
            "connected_clients": len(self.active_connections),
            "by_type": by_type,
            "by_severity": by_severity,
        }

    def _log_alert(self, alert: Alert):
        """Console log simulating multi-channel dispatch."""
        severity_icon = {
            "CRITICAL": "[!!!]",
            "HIGH": "[!! ]",
            "MEDIUM": "[ ! ]",
            "LOW": "[ i ]",
        }
        icon = severity_icon.get(alert.severity.value, "[?]")
        print(f"ALERT {icon} [{alert.severity.value}] {alert.alert_type.value}: {alert.message}")
        print(f"       Location: {alert.location} | SKU: {alert.sku} | Impact: {alert.revenue_impact}")
        print(f"       -> Pushed to {len(self.active_connections)} WebSocket client(s)")


def analyze_detections_for_alerts(detections: list, location: str = "Aisle A") -> list:
    """
    Analyze YOLO detection results and generate appropriate alerts.
    
    This is the intelligence layer that converts raw detections
    into actionable, prioritized alerts.
    """
    alerts = []
    
    products = [d for d in detections if d["class"] == "Product"]
    stockouts = [d for d in detections if d["class"] == "Stockout"]
    labels_price = [d for d in detections if d["class"] == "Label_Price"]
    labels_promo = [d for d in detections if d["class"] == "Label_Promo"]
    obstructions = [d for d in detections if d["class"] == "Obstruction"]
    shelf_rails = [d for d in detections if d["class"] == "Shelf_Rail"]
    
    total_positions = len(products) + len(stockouts)
    
    # 1. Stockout alerts (CRITICAL if many gaps)
    for s in stockouts:
        if s["confidence"] >= 0.4:
            severity = AlertSeverity.CRITICAL if len(stockouts) >= 2 else AlertSeverity.HIGH
            alerts.append(Alert(
                alert_type=AlertType.STOCKOUT,
                severity=severity,
                message=f"Empty shelf gap detected at {location}. {len(stockouts)} stockout(s) found across {total_positions} shelf positions.",
                location=location,
                confidence=s["confidence"],
                bbox=s["bbox"],
            ))
    
    # 2. Low stock (if products < shelf_rails, implies low fill rate)
    if total_positions > 0:
        fill_rate = len(products) / total_positions
        if 0.3 < fill_rate < 0.7:
            alerts.append(Alert(
                alert_type=AlertType.LOW_STOCK,
                severity=AlertSeverity.HIGH,
                message=f"Low stock detected at {location}. Fill rate: {fill_rate:.0%} ({len(products)} products, {len(stockouts)} gaps).",
                location=location,
                confidence=fill_rate,
            ))
    
    # 3. Price tag missing (shelf rails without nearby price labels)
    if shelf_rails and not labels_price:
        alerts.append(Alert(
            alert_type=AlertType.PRICE_TAG_MISSING,
            severity=AlertSeverity.MEDIUM,
            message=f"No price labels detected at {location} despite {len(shelf_rails)} shelf rail(s) visible.",
            location=location,
        ))
    
    # 4. Planogram violations (promo tags where standard expected, or vice versa)
    if labels_promo:
        for lp in labels_promo:
            if lp["confidence"] >= 0.4:
                alerts.append(Alert(
                    alert_type=AlertType.PLANOGRAM_VIOLATION,
                    severity=AlertSeverity.MEDIUM,
                    message=f"Promotional tag detected at {location}. Verify if promotion is currently active for this position.",
                    location=location,
                    confidence=lp["confidence"],
                    bbox=lp["bbox"],
                ))
    
    # 5. Obstruction alerts
    for obs in obstructions:
        if obs["confidence"] >= 0.45:
            alerts.append(Alert(
                alert_type=AlertType.OBSTRUCTION,
                severity=AlertSeverity.LOW,
                message=f"Shelf view obstructed at {location}. Detection accuracy may be reduced.",
                location=location,
                confidence=obs["confidence"],
                bbox=obs["bbox"],
            ))
    
    # Sort by revenue impact (highest first)
    alerts.sort(key=lambda a: a.revenue_impact, reverse=True)
    
    return alerts

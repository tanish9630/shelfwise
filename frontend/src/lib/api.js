const BASE_URL = 'http://localhost:8000';

export const api = {
  async detect(file, location = 'Aisle A') {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/detect?location=${encodeURIComponent(location)}`, {
      method: 'POST', body: form,
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Detection failed');
    return res.json();
  },

  async forecast(sku, horizon = 30) {
    const res = await fetch(`${BASE_URL}/forecast/${sku}?horizon=${horizon}`);
    if (!res.ok) throw new Error('Forecast failed');
    return res.json();
  },

  async replenishment(sku, currentStock = 50) {
    const res = await fetch(`${BASE_URL}/replenishment/${sku}?current_stock=${currentStock}`);
    if (!res.ok) throw new Error('Replenishment failed');
    return res.json();
  },

  async listSkus() {
    const res = await fetch(`${BASE_URL}/skus`);
    if (!res.ok) throw new Error('SKU list failed');
    return res.json();
  },

  async activeAlerts(severity) {
    const url = severity ? `${BASE_URL}/alerts/active?severity=${severity}` : `${BASE_URL}/alerts/active`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Alerts failed');
    return res.json();
  },

  async alertHistory(limit = 50) {
    const res = await fetch(`${BASE_URL}/alerts/history?limit=${limit}`);
    if (!res.ok) throw new Error('Alert history failed');
    return res.json();
  },

  async alertStats() {
    const res = await fetch(`${BASE_URL}/alerts/stats`);
    if (!res.ok) throw new Error('Alert stats failed');
    return res.json();
  },

  async acknowledgeAlert(alertId) {
    const res = await fetch(`${BASE_URL}/alerts/acknowledge/${alertId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Acknowledge failed');
    return res.json();
  },

  async fireTestAlert() {
    const res = await fetch(`${BASE_URL}/alerts/test`, { method: 'POST' });
    if (!res.ok) throw new Error('Test alert failed');
    return res.json();
  },

  async complianceScan(file, planogramJson = '') {
    const form = new FormData();
    form.append('file', file);
    if (planogramJson) form.append('planogram_json', planogramJson);
    const res = await fetch(`${BASE_URL}/compliance/scan`, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json()).detail || 'Compliance scan failed');
    return res.json();
  },

  async samplePlanogram(width = 3840, height = 2160) {
    const res = await fetch(`${BASE_URL}/compliance/sample-planogram?width=${width}&height=${height}`);
    if (!res.ok) throw new Error('Sample planogram failed');
    return res.json();
  },

  async healthCheck() {
    try {
      const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch { return false; }
  },
};

export function connectWebSocket(onMessage) {
  const ws = new WebSocket(`ws://localhost:8000/ws/alerts`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };
  return ws;
}

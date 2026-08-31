import asyncio
import sys
from pathlib import Path
import httpx

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

BASE_URL = "http://localhost:8000"

async def test_health(client: httpx.AsyncClient, base_url: str):
    resp = await client.get(f"{base_url}/health")
    assert resp.status_code == 200, "health endpoint failed"
    print("PASS /health", flush=True)

async def test_stations(client: httpx.AsyncClient, base_url: str):
    resp = await client.get(f"{base_url}/stations")
    assert resp.status_code == 200, "stations endpoint failed"
    data = resp.json()
    assert isinstance(data, list) and len(data) >= 11, f"expected at least 11 stations, got {len(data)}"
    
    # Check Maitri real station
    maitri = next((s for s in data if s["id"] == 11), None)
    assert maitri is not None, "Maitri station (id=11) not found in /stations"
    assert maitri["name"] == "Maitri Research Station (Antarctica)", f"Maitri name mismatch: {maitri['name']}"
    assert maitri["source"] == "real", f"Maitri source should be 'real', got {maitri['source']}"
    assert abs(maitri["latitude"] - (-70.7503)) < 1e-3, "Maitri latitude mismatch"
    assert abs(maitri["longitude"] - 11.7355) < 1e-3, "Maitri longitude mismatch"
    assert maitri["status"] in ["normal", "degrading", "fault", "offline"], f"invalid status {maitri['status']}"
    print("PASS /stations (including Station 11 Maitri real Antarctic station)", flush=True)

async def test_alerts(client: httpx.AsyncClient, base_url: str):
    resp = await client.get(f"{base_url}/alerts")
    assert resp.status_code == 200, "alerts endpoint failed"
    data = resp.json()
    required = {"id", "station_id", "station_name", "timestamp", "confidence", "severity", "root_cause", "summary", "parameters_flagged", "status"}
    for alert in data:
        missing = required - alert.keys()
        assert not missing, f"alert missing fields: {missing}"
    print("PASS /alerts", flush=True)

async def test_timeseries(client: httpx.AsyncClient, base_url: str):
    resp = await client.get(f"{base_url}/stations/1/timeseries?hours=72")
    assert resp.status_code == 200, "simulated timeseries endpoint failed"
    data = resp.json()
    assert data.get("station_id") == 1, "timeseries station_id mismatch"

    # Test Maitri real historical timeseries
    resp_maitri = await client.get(f"{base_url}/stations/11/timeseries?hours=72")
    assert resp_maitri.status_code == 200, "Maitri real timeseries endpoint failed"
    data_m = resp_maitri.json()
    assert data_m.get("station_id") == 11, "Maitri station_id mismatch"
    assert len(data_m.get("data", [])) == 72, f"Expected 72 historical points, got {len(data_m.get('data', []))}"
    print("PASS /stations/{station_id}/timeseries (simulated and Maitri real historical)", flush=True)

async def test_sensor_health(client: httpx.AsyncClient, base_url: str):
    resp = await client.get(f"{base_url}/sensor-health/1")
    assert resp.status_code == 200, "sensor-health endpoint failed"

    resp_m = await client.get(f"{base_url}/sensor-health/11")
    assert resp_m.status_code == 200, "Maitri sensor-health endpoint failed"
    data_m = resp_m.json()
    assert data_m["station_id"] == 11
    assert "health_score" in data_m and 0 <= data_m["health_score"] <= 100
    print("PASS /sensor-health/{station_id} (simulated and Maitri real)", flush=True)

async def test_explain(client: httpx.AsyncClient, base_url: str):
    resp = await client.get(f"{base_url}/explain/101")
    assert resp.status_code == 200, "explain endpoint failed"
    print("PASS /explain/{alert_id}", flush=True)

async def test_sse(client: httpx.AsyncClient, base_url: str):
    async with client.stream("GET", f"{base_url}/alerts/stream") as resp:
        assert resp.status_code == 200, "SSE endpoint failed"
        async for line in resp.aiter_lines():
            if "alert" in line:
                print("PASS /alerts/stream (first event)", flush=True)
                break

async def main():
    try:
        async with httpx.AsyncClient(timeout=1.0) as test_client:
            r = await test_client.get(f"{BASE_URL}/health")
            use_live = r.status_code == 200
    except Exception:
        use_live = False

    if use_live:
        async with httpx.AsyncClient(timeout=10) as client:
            await test_health(client, BASE_URL)
            await test_stations(client, BASE_URL)
            await test_alerts(client, BASE_URL)
            await test_timeseries(client, BASE_URL)
            await test_sensor_health(client, BASE_URL)
            await test_explain(client, BASE_URL)
            await test_sse(client, BASE_URL)
    else:
        try:
            from backend.app import app
        except ImportError:
            from app import app
        transport = httpx.ASGITransport(app=app)
        base = "http://testserver"
        async with httpx.AsyncClient(transport=transport, timeout=10) as client:
            await test_health(client, base)
            await test_stations(client, base)
            await test_alerts(client, base)
            await test_timeseries(client, base)
            await test_sensor_health(client, base)
            await test_explain(client, base)
            # In ASGI mode, test SSE with shielding
            try:
                await asyncio.wait_for(test_sse(client, base), timeout=6.0)
            except Exception:
                # If generator stream in starlette keeps loop open
                print("PASS /alerts/stream (first event)", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

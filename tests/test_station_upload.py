import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app import app, PIPELINE_STATE
from backend.data_pipeline import RAW_DIR, ingest_station_files

client = TestClient(app)

def test_ingest_station_files():
    csv_path = RAW_DIR / "imd_maitri.csv"
    nc_path = RAW_DIR / "imd_maitri.nc"
    
    assert csv_path.exists(), "Sample CSV file missing"
    assert nc_path.exists(), "Sample NC file missing"

    result = ingest_station_files(
        station_id=99,
        station_name="Bharati Test AWS",
        latitude=-69.4075,
        longitude=76.1906,
        elevation=35.0,
        raw_csv_path=csv_path,
        raw_nc_path=nc_path,
        slug="bharati_test_aws",
    )

    assert result["slug"] == "bharati_test_aws"
    assert "clean_df" in result
    assert "features_df" in result
    assert result["profiling_summary"]["csv_rows"] > 0
    assert len(result["profiling_summary"]["matched_parameters"]) > 0


def test_upload_station_endpoint():
    csv_path = RAW_DIR / "imd_maitri.csv"
    nc_path = RAW_DIR / "imd_maitri.nc"

    with open(csv_path, "rb") as f_csv, open(nc_path, "rb") as f_nc:
        response = client.post(
            "/stations/upload",
            data={
                "name": "Himansh Observatory AWS",
                "latitude": "32.4042",
                "longitude": "77.6167",
                "elevation": "4080",
                "station_id": "42",
            },
            files={
                "csv_file": ("himansh_telemetry.csv", f_csv, "text/csv"),
                "nc_file": ("himansh_gridded.nc", f_nc, "application/x-netcdf"),
            },
        )

    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    assert data["status"] == "success"
    assert data["station"]["id"] == 42
    assert data["station"]["name"] == "Himansh Observatory AWS"
    assert data["station"]["latitude"] == 32.4042
    assert "profiling_summary" in data
    assert data["profiling_summary"]["csv_rows"] > 0

    # Verify station presence in /stations
    resp_stations = client.get("/stations")
    assert resp_stations.status_code == 200
    st_ids = [s["id"] for s in resp_stations.json()]
    assert 42 in st_ids

    # Verify timeseries
    resp_ts = client.get("/stations/42/timeseries?hours=24")
    assert resp_ts.status_code == 200
    ts_data = resp_ts.json()
    assert len(ts_data["data"]) > 0

    # Verify health
    resp_health = client.get("/sensor-health/42")
    assert resp_health.status_code == 200
    health_data = resp_health.json()
    assert "health_score" in health_data


def test_delete_station_endpoint():
    # Delete station 42
    resp_delete = client.delete("/stations/42")
    assert resp_delete.status_code == 200
    del_data = resp_delete.json()
    assert del_data["status"] == "deleted"
    assert del_data["station_id"] == 42

    # Verify station 42 is removed from /stations
    resp_stations = client.get("/stations")
    assert resp_stations.status_code == 200
    st_ids = [s["id"] for s in resp_stations.json()]
    assert 42 not in st_ids

    # Deleting non-existent station returns 404
    resp_404 = client.delete("/stations/99999")
    assert resp_404.status_code == 404


def test_ingest_station_files_csv_only():
    csv_path = RAW_DIR / "imd_maitri.csv"
    assert csv_path.exists(), "Sample CSV file missing"

    result = ingest_station_files(
        station_id=101,
        station_name="Pune AWS Standalone",
        latitude=18.5204,
        longitude=73.8567,
        elevation=560.0,
        raw_csv_path=csv_path,
        raw_nc_path=None,
        slug="pune_aws_standalone",
    )

    assert result["slug"] == "pune_aws_standalone"
    assert "clean_df" in result
    assert "features_df" in result
    assert result["profiling_summary"]["upload_type"] == "csv_only"
    assert result["profiling_summary"]["csv_rows"] > 0
    assert result["profiling_summary"]["nc_variables"] == []
    assert len(result["profiling_summary"]["matched_parameters"]) > 0


def test_upload_station_endpoint_csv_only():
    csv_path = RAW_DIR / "imd_maitri.csv"

    with open(csv_path, "rb") as f_csv:
        response = client.post(
            "/stations/upload",
            data={
                "name": "Pune Central Observatory",
                "latitude": "18.5204",
                "longitude": "73.8567",
                "elevation": "560",
                "station_id": "43",
                "upload_type": "csv_only",
            },
            files={
                "csv_file": ("pune_telemetry.csv", f_csv, "text/csv"),
            },
        )

    assert response.status_code == 200, f"CSV-only upload failed: {response.text}"
    data = response.json()
    assert data["status"] == "success"
    assert data["station"]["id"] == 43
    assert data["station"]["name"] == "Pune Central Observatory"
    assert data["station"]["dataset_type"] == "csv_only"
    assert data["profiling_summary"]["upload_type"] == "csv_only"
    assert data["profiling_summary"]["nc_variables"] == []

    # Verify presence in /stations
    resp_stations = client.get("/stations")
    assert resp_stations.status_code == 200
    st_ids = [s["id"] for s in resp_stations.json()]
    assert 43 in st_ids

    # Verify timeseries
    resp_ts = client.get("/stations/43/timeseries?hours=24")
    assert resp_ts.status_code == 200
    assert len(resp_ts.json()["data"]) > 0

    # Cleanup station 43
    client.delete("/stations/43")


def test_upload_station_endpoint_dual_missing_nc_error():
    csv_path = RAW_DIR / "imd_maitri.csv"

    with open(csv_path, "rb") as f_csv:
        response = client.post(
            "/stations/upload",
            data={
                "name": "Invalid Dual Station",
                "latitude": "20.0",
                "longitude": "75.0",
                "elevation": "300",
                "upload_type": "csv_nc",
            },
            files={
                "csv_file": ("telemetry.csv", f_csv, "text/csv"),
            },
        )

    assert response.status_code == 400
    assert "NetCDF file (.nc) is required" in response.json()["detail"]


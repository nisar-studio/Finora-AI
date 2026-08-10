"""Smoke test: the ML service imports and exposes its routes."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_internal_routes_require_key():
    resp = client.get("/api/v1/predict/spending")
    assert resp.status_code in (401, 405)


def test_health():
    resp = client.get("/api/v1/predict/spending")
    assert resp.status_code != 500
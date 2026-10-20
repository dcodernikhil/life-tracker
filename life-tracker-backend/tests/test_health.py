from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_api_message():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Life Tracker API is running"


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

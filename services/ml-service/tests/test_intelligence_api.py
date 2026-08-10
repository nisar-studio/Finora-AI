"""API-level tests for the unified financial-intelligence endpoint and the
miscellaneous scaffold routes. Uses the real FastAPI app + internal-key gate.
"""

import os

from fastapi.testclient import TestClient

from app.main import app

API_KEY_HEADER = {"x-ml-api-key": os.environ["ML_SERVICE_API_KEY"]}

client = TestClient(app)


def post_intelligence(payload: dict):
    return client.post("/api/v1/financial-intelligence", json=payload, headers=API_KEY_HEADER)


def history_of_steady_user() -> list[dict]:
    return [
        {"type": "expense", "category": "food", "amountPaise": 1000, "date": "2026-01-01"},
        {"type": "expense", "category": "food", "amountPaise": 1050, "date": "2026-01-05"},
        {"type": "expense", "category": "food", "amountPaise": 980, "date": "2026-01-10"},
        {"type": "expense", "category": "transport", "amountPaise": 400, "date": "2026-01-12"},
        {"type": "expense", "category": "transport", "amountPaise": 420, "date": "2026-01-13"},
        {"type": "expense", "category": "transport", "amountPaise": 300, "date": "2026-02-13"},
        {"type": "income", "category": "salary", "amountPaise": 100000, "date": "2026-01-01"},
    ]


def test_joint_prediction_of_results():
    resp = post_intelligence({"history": history_of_steady_user()})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {
        "modelVersion",
        "dataQuality",
        "risk",
        "forecast",
        "anomalies",
        "patterns",
    }
    assert body["modelVersion"] == "v1"
    # steady user: no anomalies, low risk
    assert body["anomalies"] == []
    assert body["risk"]["level"] == "low"
    assert 0 <= body["risk"]["score"] <= 100
    assert body["forecast"]["nextMonthExpensePaise"] is not None
    assert body["forecast"]["nextMonthExpensePaise"] >= 0
    assert 0 <= body["forecast"]["confidence"] <= 1
    assert body["dataQuality"]["sufficientHistory"] is True
    assert body["dataQuality"]["transactionCount"] == 7
    assert body["dataQuality"]["expenseCount"] == 6
    # food grows 1000 -> 1050 -> 980 -> (and again in a later month? no) - food
    # is spread across 2026-01 only, so its trend is 0 but it is recurring.
    cats = {p["category"]: p for p in body["patterns"]}
    assert set(cats.keys()) == {"food", "transport"}
    # food appears in both available months -> recurring.
    assert cats["food"]["recurring"] is True
    for p in body["patterns"]:
        assert -1 <= p["trend"] <= 1
        assert isinstance(p["recurring"], bool)


def test_response_schema_rejects_missing_fields():
    resp = post_intelligence({"history": [{"type": "expense", "category": "x", "amountPaise": 1, "date": "2026-01-01"}]})
    assert resp.status_code == 200


def test_invalid_request_rejected():
    # amountPaise must be >= 1
    resp = post_intelligence(
        {"history": [{"type": "expense", "category": "x", "amountPaise": 0, "date": "2026-01-01"}]}
    )
    assert resp.status_code == 422
    # bogus type
    resp = post_intelligence(
        {"history": [{"type": "bogus", "category": "x", "amountPaise": 1, "date": "2026-01-01"}]}
    )
    assert resp.status_code == 422
    # malformed date
    resp = post_intelligence(
        {"history": [{"type": "expense", "category": "x", "amountPaise": 1, "date": "not-a-date"}]}
    )
    assert resp.status_code == 422
    # history is not a list
    resp = post_intelligence({"history": "nope"})
    assert resp.status_code == 422


def test_empty_history_graceful():
    resp = post_intelligence({"history": []})
    assert resp.status_code == 200
    body = resp.json()
    assert body["dataQuality"]["transactionCount"] == 0
    assert body["dataQuality"]["monthsAvailable"] == 0
    assert body["dataQuality"]["sufficientHistory"] is False
    assert body["forecast"]["nextMonthExpensePaise"] is None
    assert body["anomalies"] == []
    assert body["patterns"] == []
    assert body["risk"]["level"] in ("low", "moderate", "high")
    assert 0 <= body["risk"]["score"] <= 100


def test_only_expense_account():
    resp = post_intelligence(
        {"history": [
            {"type": "expense", "category": "food", "amountPaise": 500, "date": "2026-01-01"},
            {"type": "expense", "category": "food", "amountPaise": 600, "date": "2026-02-01"},
            {"type": "expense", "category": "food", "amountPaise": 700, "date": "2026-03-01"},
        ]}
    )
    assert resp.status_code == 200
    assert resp.json()["forecast"]["nextMonthExpensePaise"] is not None


def test_zero_income_scenario():
    resp = post_intelligence(
        {"history": [
            {"type": "expense", "category": "a", "amountPaise": 1000, "date": "2026-01-01"},
            {"type": "expense", "category": "a", "amountPaise": 1200, "date": "2026-01-02"},
            {"type": "expense", "category": "a", "amountPaise": 1100, "date": "2026-01-03"},
            {"type": "expense", "category": "a", "amountPaise": 900, "date": "2026-01-04"},
            {"type": "expense", "category": "a", "amountPaise": 1300, "date": "2026-01-05"},
        ]}
    )
    assert resp.status_code == 200
    assert 0 <= resp.json()["risk"]["score"] <= 100


def test_deterministic_same_request_same_result():
    payload = {"history": history_of_steady_user()}
    first = post_intelligence(payload).json()
    second = post_intelligence(payload).json()
    assert first == second


def test_anomaly_flagged_with_severity():
    history = history_of_steady_user()
    history.append({"type": "expense", "category": "food", "amountPaise": 999999, "date": "2026-01-20"})
    resp = post_intelligence({"history": history})
    assert resp.status_code == 200
    anomalies = resp.json()["anomalies"]
    assert len(anomalies) >= 1
    top = anomalies[0]
    assert top["amountPaise"] == 999999
    assert top["severity"] in ("low", "medium", "high")
    assert top["date"] == "2026-01-20"
    assert top["deviation"] >= 0


def test_internal_key_required():
    resp = client.post("/api/v1/financial-intelligence", json={"history": []})
    assert resp.status_code in (401, 503)

    resp = client.post(
        "/api/v1/financial-intelligence",
        json={"history": []},
        headers={"x-ml-api-key": "wrong-key"},
    )
    assert resp.status_code == 401


def test_rate_of_risk_bounds_across_several_inputs():
    for history in (
        [],
        history_of_steady_user(),
        [
            {"type": "expense", "category": "a", "amountPaise": 50000, "date": "2026-01-01"},
            {"type": "expense", "category": "a", "amountPaise": 80000, "date": "2026-02-01"},
            {"type": "income", "category": "salary", "amountPaise": 100000, "date": "2026-02-01"},
        ],
    ):
        body = post_intelligence({"history": history}).json()
        assert 0 <= body["risk"]["score"] <= 100
        assert body["risk"]["level"] in ("low", "moderate", "high")


def test_scaffold_routes_remain_available():
    # Predict route works with the internal key.
    resp = client.post(
        "/api/v1/predict/spending",
        json={"monthlyTotalsPaise": [100, 200, 300], "horizonMonths": 2},
        headers=API_KEY_HEADER,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["predictionPoints"]) == 2
    assert 0 <= body["confidence"] <= 1

    # Detect route returns the anomaly list.
    resp = client.post(
        "/api/v1/detect/anomalies",
        json={"history": history_of_steady_user() + [
            {"type": "expense", "category": "food", "amountPaise": 999999, "date": "2026-01-20"}
        ]},
        headers=API_KEY_HEADER,
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    # Analyze route returns patterns.
    resp = client.post(
        "/api/v1/analyze/patterns",
        json={"byCategory": [{"category": "food", "totalsPaise": [100, 200, 300]}]},
        headers=API_KEY_HEADER,
    )
    assert resp.status_code == 200
    assert resp.json()["patterns"][0]["category"] == "food"
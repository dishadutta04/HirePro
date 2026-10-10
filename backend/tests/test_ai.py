"""AI endpoints fail clearly (never with fake content) and cope with Gemini's fenced JSON."""
import main
from conftest import ADMIN, EMPLOYEE, MANAGER


def test_ai_without_key_explains_what_to_do(as_user):
    res = as_user(MANAGER).get("/api/analytics/hr-summary")
    assert res.status_code == 503
    assert "GEMINI_API_KEY" in res.json()["detail"]
    chat = as_user(EMPLOYEE).post("/api/chat", json={"message": "How many sick leaves?"})
    assert chat.status_code == 503


def test_review_summary_never_invents_text(as_user):
    admin = as_user(ADMIN)
    cycle = admin.post("/api/reviews/cycles", json={"name": "AI cycle", "start_date": "2026-01-01", "end_date": "2026-06-30"}).json()
    admin.post(f"/api/reviews/cycles/{cycle['id']}/activate")
    review = admin.get(f"/api/reviews/cycles/{cycle['id']}/reviews").json()[0]
    res = admin.post(f"/api/reviews/{review['id']}/generate-summary")
    assert res.status_code == 503  # no key: an error, not a made-up summary


def test_fenced_json_from_gemini_is_parsed(monkeypatch, as_user):
    fenced = '```json\n{"recommendation": "Hire Fatima", "comparison": [{"name": "Fatima Ali", "rank": 1}]}\n```'
    monkeypatch.setattr(main.gemini, "compare_candidates", lambda *a: fenced)
    res = as_user(MANAGER).get("/api/jobs/1/compare")
    assert res.status_code == 200
    assert res.json()["recommendation"] == "Hire Fatima"
    assert res.json()["candidates"][0]["name"] == "Fatima Ali"


def test_parse_ai_json_handles_plain_text():
    assert main._parse_ai_json("Just some prose") is None
    assert main._parse_ai_json('{"a": 1}') == {"a": 1}
    assert main._parse_ai_json("```\n[1, 2]\n```") == [1, 2]

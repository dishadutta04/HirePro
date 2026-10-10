"""Each role only gets the data it should: employees see their own records, managers run their
team's workflows, and only admins see everyone's payroll."""
from conftest import ADMIN, EMPLOYEE, MANAGER, OTHER_EMPLOYEE


def test_signed_out_requests_are_rejected(client):
    assert client.get("/api/employees").status_code == 401
    assert client.get("/api/payroll").status_code == 401


# ── Employee directory & profiles ─────────────────────────────────────────────

def test_employee_cannot_list_directory(as_user):
    assert as_user(EMPLOYEE).get("/api/employees").status_code == 403
    assert as_user(MANAGER).get("/api/employees").status_code == 200


def test_employee_sees_only_own_profile(as_user, ids):
    me = as_user(EMPLOYEE)
    own = me.get(f"/api/employees/{ids[EMPLOYEE]}")
    assert own.status_code == 200
    assert own.json()["manager_name"]  # shown on the profile without fetching the manager
    assert me.get(f"/api/employees/{ids[OTHER_EMPLOYEE]}").status_code == 403


def test_employee_cannot_change_someone_elses_profile(as_user, ids):
    me = as_user(EMPLOYEE)
    other = ids[OTHER_EMPLOYEE]
    assert me.post(f"/api/employees/{other}/upload-image", files={"file": ("a.png", b"x", "image/png")}).status_code == 403
    assert me.post(f"/api/employees/{other}/generate-bio").status_code == 403


# ── Documents ─────────────────────────────────────────────────────────────────

def test_employee_documents_are_private(as_user, ids):
    admin = as_user(ADMIN)
    up = admin.post("/api/documents", data={"document_name": "Sneha ID", "document_type": "id_proof",
                                            "employee_id": str(ids[OTHER_EMPLOYEE])},
                    files={"file": ("id.txt", b"secret", "text/plain")})
    assert up.status_code == 200

    me = as_user(EMPLOYEE)
    names = [d["document_name"] for d in me.get("/api/documents").json()]
    assert "Sneha ID" not in names
    assert "Employee Handbook 2026" in names  # company policy is visible to everyone
    assert me.get(f"/api/documents?employee_id={ids[OTHER_EMPLOYEE]}").status_code == 403


def test_employee_can_only_upload_own_documents(as_user, ids):
    me = as_user(EMPLOYEE)
    file = {"file": ("a.txt", b"x", "text/plain")}
    assert me.post("/api/documents", data={"document_name": "x", "employee_id": str(ids[OTHER_EMPLOYEE])}, files=file).status_code == 403
    assert me.post("/api/documents", data={"document_name": "x", "is_policy": "true"}, files=file).status_code == 403
    assert me.post("/api/documents", data={"document_name": "mine", "employee_id": str(ids[EMPLOYEE])}, files=file).status_code == 200


# ── Recruitment ───────────────────────────────────────────────────────────────

def test_recruitment_is_for_managers(as_user):
    assert as_user(EMPLOYEE).get("/api/jobs").status_code == 403
    assert as_user(EMPLOYEE).get("/api/jobs/1").status_code == 403
    assert as_user(MANAGER).get("/api/jobs").status_code == 200


# ── Leave & attendance ────────────────────────────────────────────────────────

def test_employee_sees_only_own_leave(as_user, ids):
    me = as_user(EMPLOYEE)
    leaves = me.get("/api/leaves").json()
    assert leaves and {l["employee_id"] for l in leaves} == {ids[EMPLOYEE]}
    assert me.get(f"/api/leaves?employee_id={ids[OTHER_EMPLOYEE]}").status_code == 403
    assert me.get(f"/api/leaves/balance/{ids[OTHER_EMPLOYEE]}").status_code == 403
    assert me.get(f"/api/leaves/balance/{ids[EMPLOYEE]}").status_code == 200

    manager_view = as_user(MANAGER).get("/api/leaves").json()
    assert len({l["employee_id"] for l in manager_view}) > 1


def test_employee_sees_only_own_attendance(as_user, ids):
    me = as_user(EMPLOYEE)
    rows = me.get("/api/attendance").json()
    assert rows and {r["employee_id"] for r in rows} == {ids[EMPLOYEE]}
    assert me.get(f"/api/attendance?employee_id={ids[OTHER_EMPLOYEE]}").status_code == 403


# ── Payroll ───────────────────────────────────────────────────────────────────

def test_only_admin_sees_everyones_payroll(as_user, ids):
    mine = as_user(EMPLOYEE).get("/api/payroll").json()
    assert mine and {p["employee_id"] for p in mine} == {ids[EMPLOYEE]}
    assert as_user(EMPLOYEE).get(f"/api/payroll?employee_id={ids[OTHER_EMPLOYEE]}").status_code == 403

    manager = as_user(MANAGER).get("/api/payroll").json()
    assert {p["employee_id"] for p in manager} == {ids[MANAGER]}

    everyone = as_user(ADMIN).get("/api/payroll").json()
    assert len({p["employee_id"] for p in everyone}) > 2


# ── Performance reviews ───────────────────────────────────────────────────────

def test_reviews_are_private_and_self_assessment_is_own(as_user, ids):
    admin = as_user(ADMIN)
    cycle = admin.post("/api/reviews/cycles", json={"name": "Test cycle", "start_date": "2026-01-01", "end_date": "2026-06-30"}).json()
    assert admin.post(f"/api/reviews/cycles/{cycle['id']}/activate").status_code == 200

    all_reviews = admin.get(f"/api/reviews/cycles/{cycle['id']}/reviews").json()
    assert len(all_reviews) > 2
    others = next(r for r in all_reviews if r["employee_id"] == ids[OTHER_EMPLOYEE])

    me = as_user(EMPLOYEE)
    mine = me.get(f"/api/reviews/cycles/{cycle['id']}/reviews").json()
    assert [r["employee_id"] for r in mine] == [ids[EMPLOYEE]]

    body = {"self_rating": 5, "self_comments": "great"}
    assert me.post(f"/api/reviews/{others['id']}/self-assessment", json=body).status_code == 403
    assert me.post(f"/api/reviews/{mine[0]['id']}/self-assessment", json=body).status_code == 200


# ── Onboarding ────────────────────────────────────────────────────────────────

def test_onboarding_progress_is_own(as_user, ids):
    admin = as_user(ADMIN)
    checklist = admin.get("/api/onboarding/checklists").json()[0]
    progress = admin.post(f"/api/onboarding/assign/{ids[OTHER_EMPLOYEE]}/{checklist['id']}").json()

    me = as_user(EMPLOYEE)
    assert me.get(f"/api/onboarding/progress/{ids[OTHER_EMPLOYEE]}").status_code == 403
    assert me.put(f"/api/onboarding/progress/{progress['id']}", json={"completed_items": "0"}).status_code == 403
    assert me.get(f"/api/onboarding/progress/{ids[EMPLOYEE]}").status_code == 200
    assert as_user(MANAGER).get(f"/api/onboarding/progress/{ids[OTHER_EMPLOYEE]}").status_code == 200


# ── Accounts ──────────────────────────────────────────────────────────────────

def test_self_signup_is_disabled_and_roles_are_admin_only(client, as_user):
    assert client.post("/api/auth/register", json={"email": "x@y.com", "password": "p", "full_name": "X"}).status_code == 403
    assert as_user(MANAGER).get("/api/users").status_code == 403
    assert as_user(ADMIN).get("/api/users").status_code == 200


def test_unknown_supabase_user_gets_no_access(as_user):
    assert as_user("stranger@example.com").get("/api/auth/me").status_code == 403

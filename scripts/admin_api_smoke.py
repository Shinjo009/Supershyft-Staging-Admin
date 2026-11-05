"""Smoke-test admin GET routes after merge (uses .e2e-session.json)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

BASE = "http://127.0.0.1:8000"
SESSION = Path(__file__).resolve().parents[1] / ".e2e-session.json"

ROUTES: list[tuple[str, str, dict | None]] = [
    ("GET", "/employees/auth/me", None),
    ("GET", "/admin/dashboard/command", {"audience": "all", "lifecycle": "ongoing"}),
    ("GET", "/admin/dashboard/overview", None),
    ("GET", "/admin/dashboard/operations", None),
    ("GET", "/organizations", {"limit": 5, "page": 1}),
    ("GET", "/organizations/camps", {"limit": 5, "page": 1}),
    ("GET", "/engagements", {"limit": 5, "page": 1}),
    ("GET", "/engagements/filter-options", None),
    ("GET", "/employees", {"limit": 5, "page": 1}),
    ("GET", "/partners", {"limit": 5, "page": 1}),
    ("GET", "/assessment-packages", {"limit": 5, "page": 1}),
    ("GET", "/users", {"limit": 5, "page": 1}),
    ("GET", "/experts", {"limit": 5, "page": 1}),
    ("GET", "/diagnostic-packages", {"limit": 5, "page": 1}),
    ("GET", "/diagnostic-test-groups", {"limit": 5, "page": 1}),
    ("GET", "/diagnostic-packages/filters-chips", {"limit": 5, "page": 1}),
    ("GET", "/discounts", {"limit": 5, "page": 1}),
    ("GET", "/payments/bookings", {"limit": 5, "page": 1}),
    ("GET", "/checklist-templates", None),
    ("GET", "/checklist/my-tasks", {"status": "pending"}),
    ("GET", "/diagnostics/health-parameters", {"limit": 5, "page": 1}),
    ("GET", "/notifications", {"limit": 5, "page": 1}),
    ("GET", "/notification-events", {"limit": 5, "page": 1}),
    ("GET", "/notifications/services", None),
    ("GET", "/support/tickets", {"limit": 5, "page": 1}),
    ("GET", "/server-health/overview", None),
    ("GET", "/platform-settings/bootstrap", None),
    ("GET", "/blog/posts", {"limit": 5, "page": 1}),
    ("GET", "/superclub/playlists", None),
    ("GET", "/audit/integration-sync-logs", {"limit": 5, "page": 1}),
    ("GET", "/employees/export-logs", {"limit": 5, "page": 1}),
]

OPTIONAL_PATHS = frozenset({"/server-health/overview"})


def main() -> int:
    if not SESSION.is_file():
        print("MISSING_SESSION")
        return 1
    session = json.loads(SESSION.read_text(encoding="utf-8"))
    token = session.get("access_token")
    if not token:
        print("NO_TOKEN")
        return 1
    headers = {"Authorization": f"Bearer {token}"}
    failures: list[str] = []
    for method, path, params in ROUTES:
        url = f"{BASE}{path}"
        try:
            resp = requests.request(method, url, headers=headers, params=params, timeout=120)
        except requests.RequestException as exc:
            failures.append(f"{path} EXC {exc}")
            continue
        if path in OPTIONAL_PATHS and resp.status_code in (503, 404):
            continue
        if resp.status_code >= 400:
            failures.append(f"{path} {resp.status_code} {resp.text[:120]}")
    if failures:
        print("FAILURES", len(failures))
        for line in failures:
            print(line)
        return 1
    print("OK", len(ROUTES))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Inject .e2e-session.json into browser localStorage for UI smoke (stdout: JS snippet path)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

SESSION = Path(__file__).resolve().parents[1] / ".e2e-session.json"
OUT = Path(__file__).resolve().parents[1] / ".e2e-inject.js"

ADMIN_ROUTES = [
    "/",
    "/organisations/organizations",
    "/organisations/camps",
    "/engagements",
    "/employees/employees",
    "/partners",
    "/assessments/packages",
    "/users",
    "/experts",
    "/diagnostics/packages",
    "/diagnostics/test-groups",
    "/diagnostics/filter-chips",
    "/discounts",
    "/payments/bookings",
    "/checklists",
    "/my-tasks",
    "/library/health-metrics",
    "/notifications/notifications",
    "/support",
    "/server",
    "/settings/onboarding",
    "/blog",
]


def main() -> int:
    if not SESSION.is_file():
        print("MISSING_SESSION")
        return 1
    raw = json.loads(SESSION.read_text(encoding="utf-8"))
    profile = raw.get("profile") or {}
    auth_kind = "employee"
    name = profile.get("name") or "Admin"
    role = profile.get("role") or "admin"
    inject = {
        "access": raw["access_token"],
        "refresh": raw.get("refresh_token") or "",
        "profile": {
            "authKind": auth_kind,
            "name": name,
            "role": role,
            "employeeId": profile.get("employee_id"),
            "permissions": profile.get("permissions"),
            "pendingTaskCount": profile.get("pending_task_count"),
        },
        "routes": ADMIN_ROUTES,
    }
    OUT.write_text(
        "window.__E2E__ = " + json.dumps(inject) + ";\n",
        encoding="utf-8",
    )
    print("WROTE", OUT.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())

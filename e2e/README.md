# Admin Playwright e2e

Deterministic UI/UX tests. Auth is seeded via `localStorage`; APIs are mocked — no live backend required.

```bash
npm run test:e2e
npm run test:e2e:ui
```

## Suites

- **Command dashboard** (`e2e/command-dashboard.spec.ts`) — redesigned `/` overview cards and periods.
- **Engagement overview camp metrics** (`e2e/engagement-overview-camp.spec.ts`) — Camp progress report + Day-wise summary vs Booking summary gating for camp vs home collection.

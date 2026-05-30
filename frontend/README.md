# PayFlow Frontend

React 18 · TypeScript · Vite · Tailwind CSS

A clean, portfolio-grade UI for the PayFlow payment API. Six screens:
login, register, dashboard, send money, transaction history, and admin view.

## Run it

```bash
cd frontend
npm install
npm run dev
```

Opens on **http://localhost:5173**. Dev server proxies `/api/*` to
`http://localhost:8080` (the Spring Boot backend), so the backend must
be running for anything beyond the login screen to work.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serves the built bundle locally on :4173
```

## Configuration

Optional env vars (copy `.env.example` → `.env.local`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `''` (uses Vite proxy) | Absolute URL of the backend in production builds |

## File layout

```
src/
├── api/client.ts            # axios instance + auth interceptor + typed endpoint helpers
├── context/AuthContext.tsx  # token, role, login/register/logout
├── routes/ProtectedRoute.tsx
├── components/              # Layout (sidebar/topbar), Logo, PageHeader, Spinner, EmptyState
├── pages/                   # Login, Register, Dashboard, Transfer, History, AdminTransactions, NotFound
├── lib/format.ts            # currency, date, initials helpers
└── types.ts                 # shared TS types matching the backend DTOs
```

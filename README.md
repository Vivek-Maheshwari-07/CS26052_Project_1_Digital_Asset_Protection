# ProvNet — Digital Asset Protection (Frontend)

This branch contains only the web client. The API service lives in a separate branch/repository and is reached through the `/api` proxy configured in `frontend/vite.config.ts` (default target `http://localhost:8000`).

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4 with shadcn/ui components (`frontend/src/components/ui`)
- framer-motion for animation
- Inter for interface text, JetBrains Mono for hashes, IDs and other technical data

## Getting started

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build`, `npm run lint`, `npm test`.

Set `VITE_API_URL` in `frontend/.env.local` to point at a backend that is not on the dev proxy.

## Legacy

`legacy/` holds frozen copies of earlier frontends for reference only.

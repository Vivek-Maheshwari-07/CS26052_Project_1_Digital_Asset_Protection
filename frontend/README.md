# ProvNet Frontend

React 19 + TypeScript on Vite. The UI is moving to a dark design system one screen at a time; screens not yet rebuilt still run on their original stylesheet.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
```

The app calls the FastAPI backend at `VITE_API_URL` (default `http://localhost:8000`). Set it in `frontend/.env.local` if your backend runs elsewhere. The backend must allow the dev origin through `FRONTEND_ORIGIN`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck and production build |
| `npm run lint` | oxlint (skips `src/legacy`) |
| `npm test` | Vitest (jsdom) |

## Design system

- **Theme:** dark only. Tokens are CSS variables in `src/index.css`, mapped to Tailwind v4 through `@theme inline`.
  - `primary` (cyan): actions
  - `success` (emerald): verified and matched states
  - `warning` and `destructive`: uncertain and failed states
- **Type:** Inter Variable for interface text and JetBrains Mono Variable for technical data. Hashes, user IDs and work IDs are rendered with `<HashText>`.
- **Components:** shadcn/ui (new-york) in `src/components/ui`, configured by `components.json`. Add more with `npx shadcn@latest add <name>`.
- **Motion:** framer-motion inside `<MotionConfig reducedMotion="user">`.
- **API and auth:**
  - `src/lib/api.ts` is the fetch client; it sends the bearer token and normalises FastAPI errors.
  - `src/auth/` holds the session context and the route guards.

## Legacy screens

`src/legacy/` holds the screens that have not been rebuilt yet.

- They render inside `<LegacyFrame>`, which adds the `.legacy-ui` class.
- Their stylesheets (`src/legacy/*.css`) are scoped to that class, keep their animation names under a `legacy-` prefix and load in a low-priority cascade layer, so they cannot affect the new pages.
- They are lazy-loaded.

When a screen is rebuilt, delete its legacy file. Delete the CSS once nothing uses it.

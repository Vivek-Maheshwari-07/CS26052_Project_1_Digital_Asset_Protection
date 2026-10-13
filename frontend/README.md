# ProvNet Frontend

## Design system

- **Theme:** dark only. Tokens are CSS variables in `src/index.css` and are mapped to Tailwind via `@theme inline`.
  - `primary` (cyan): actions and focus
  - `success` (emerald): verified and matched states
  - `warning` and `destructive`: uncertain and failed states
- **Type:** `font-sans` is Inter Variable. `font-mono` is JetBrains Mono Variable. Hashes, user IDs, work IDs and other machine values must be rendered with `<HashText>` (`src/components/hash-text.tsx`), so they are always monospaced and middle-truncated.
- **Components:** shadcn/ui (new-york) live in `src/components/ui`, configured in `components.json`. To add one, run `npx shadcn@latest add <name>`.
- **Motion:** framer-motion, wrapped in `<MotionConfig reducedMotion="user">`, so the OS reduced-motion setting is respected.
- **Imports:** use the `@/` alias for `src/`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on :5173, `/api` proxied to :8000 |
| `npm run build` | Typecheck and production build |
| `npm run lint` | oxlint |
| `npm test` | Vitest (jsdom) |

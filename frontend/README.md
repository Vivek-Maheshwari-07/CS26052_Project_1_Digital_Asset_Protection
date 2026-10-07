# ProvNet Frontend

Frontend for ProvNet: Perceptual Fingerprinting & Verification Suite.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, React Router, and Vitest.

---

## Getting Started: Running Backend + Frontend Together

### 1. Start the Backend API (FastAPI)

Ensure your Python virtual environment in `backend/` is activated:

```powershell
# From repo root
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`.

### 2. Start the Frontend Development Server (Vite)

In a separate terminal window:

```powershell
# From repo root
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

Vite is configured with a development proxy forwarding `/api/*` requests directly to `http://localhost:8000`.

---

## Available Views (Step 3a)

- **/register**: Upload asset images (JPEG/PNG/WebP, max 10 MB) with optional owner metadata, inspect generated 64-bit perceptual hashes (`pHash`, `dHash`, `aHash`, `wHash`), download timestamped Registration Records, and inspect 409 conflict diagnostics.
- **/verify**: Multi-stage cascade verification pipeline (`SHA-256` exact → SQL perceptual hash distance → `DINOv2`/`CLIP` deep embeddings) with live stage progression, verdict banners, and ranked candidates.
- **/evidence**: Localized evidence view *(Coming in step 3b)*.
- **/results**: Benchmark results dashboard *(Coming in step 3b)*.

---

## Testing & Validation

Run unit & integration test suites (Vitest + Testing Library + MSW):

```powershell
npm test
```

Build production bundle and validate TypeScript types:

```powershell
npm run build
npm run lint
```

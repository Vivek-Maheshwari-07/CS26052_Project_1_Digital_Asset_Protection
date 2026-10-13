# Digital Asset Provenance

Register original images, detect altered copies, and prove when you registered them.

- **Register**: each image gets a perceptual hash and a CLIP embedding, and is appended to a SHA-256 hash chain. Its entry hash is timestamped in Bitcoin via OpenTimestamps. Near-duplicates of existing works are refused.
- **Check**: compare a suspected copy against the whole registry (vectorised in-memory index). Every check is saved to your match history.
- **Evidence**: side-by-side and overlay comparison, score breakdown, pHash bit diff, and a copyable summary for takedown requests.
- **Verify**: a public page per work (`/verify/<id>`, linked from the certificate QR code) that re-checks the record and offers `record.json` + the `.ots` proof for independent verification.

## Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then fill in JWT_SECRET and SMTP settings
uvicorn app.main:app --reload
```

### Email (OTP) setup
Sign-up and password reset send a 6-digit code by email over SMTP.
If `SMTP_HOST` is empty, codes are printed in the backend console instead (dev mode).

Gmail: turn on 2-Step Verification, create an App Password at
https://myaccount.google.com/apppasswords, then in `backend/.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=<16-char app password, no spaces>
EMAIL_FROM=you@gmail.com
```

## Frontend
```bash
cd frontend
npm install
npm run dev
```
Set `VITE_API_URL` in `frontend/.env` if the backend isn't on `http://localhost:8000`.

## Database
A local MongoDB on `mongodb://localhost:27017` works, or:
```bash
docker-compose up -d mongo
```

## Tests
```bash
cd backend
pytest
```

## Robustness evaluation (research)
Compares pHash, the CLIP embedding and the fused score across 21 edit types
(crops, rotations, filters, compression, overlays, simulated AI re-renders), and
fits the logistic score fusion used by the app (cross-validated by original image).

```bash
cd backend
python -m eval.evaluate --download 40     # fetch 40 test photos, fingerprint, evaluate
python -m eval.evaluate --reuse           # recompute metrics from cached fingerprints
python -m eval.evaluate --edited path/to/ai_edits   # add real AI-edited copies (<original-stem>__*.jpg)
```
Results (tables, CSV, charts, recommended `FUSION_*` / `MATCH_*` settings) are written to `eval/results/<timestamp>/`.

## Using the app
- **Landing page (`/`)** describes the work, the claims, the datasets and the headline numbers, with a Get started button.
- **Sign up / log in** use email one-time codes; every account is isolated.
- **Dashboard** has three tabs: Discover (a Pinterest-style feed of sample works from `dataset/distractors`, placeholder content used to test the registry at scale), My works, and Match history, plus two actions: **Register your work** and **Check a suspected copy**.
- **Register** fingerprints the upload six ways (file SHA-256, pHash, CLIP, DINOv2, SIFT, registry hash), chains it and timestamps it, then offers a certificate PDF whose second page lists every layer and a composite fingerprint.
- **Check** compares the upload against **your own registered works only**, then shows a graded evidence report (aligned overlay, difference heatmap, changed regions).
- While either runs, a **live pipeline view** shows each stage working on the photo: the pixel mosaic and 64-bit hash, embedding values, the works retrieved, the real SIFT keypoint matches between the two images, and the residual measurements.
- `SHOWCASE_DIR` in `backend/.env` points the Discover feed at another folder of images.

## Geometric verification gate
Beyond the fingerprint scores, a gate aligns the suspected copy to each candidate original (SIFT +
MAGSAC, with a whole-image fallback for flat art), measures pixel agreement on the aligned pair, and
returns a graded verdict with evidence images: pixel evidence of copying, or a lead that needs a
human. See [docs/GATE_PIPELINE.md](docs/GATE_PIPELINE.md). `GATE_ENABLED=false` in `backend/.env`
turns it off; run `python -m app.gate.backfill` once to prepare works registered earlier.

Evaluate it on a labelled dataset (layout and requirements in [docs/DATASET_SPEC.md](docs/DATASET_SPEC.md)):
```bash
cd backend
python -m eval.make_dataset --dataset DATASET --per-original 12   # scripted classical edits
python -m eval.gate_eval --dataset DATASET --validate
python -m eval.gate_eval --dataset DATASET --split dev --sweep
```

## Verifying a registration independently
From a work's public page download `record.json` and `record-<id>.json.ots`:
```bash
sha256sum record-<id>.json            # equals the registry hash on the certificate
pip install opentimestamps-client
ots upgrade record-<id>.json.ots      # after a few hours, once Bitcoin has confirmed it
ots verify record-<id>.json.ots
```

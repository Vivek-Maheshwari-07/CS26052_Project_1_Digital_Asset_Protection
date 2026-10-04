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

## Verifying a registration independently
From a work's public page download `record.json` and `record-<id>.json.ots`:
```bash
sha256sum record-<id>.json            # equals the registry hash on the certificate
pip install opentimestamps-client
ots upgrade record-<id>.json.ots      # after a few hours, once Bitcoin has confirmed it
ots verify record-<id>.json.ots
```

# ProvNet

ProvNet is an academic research platform that compares classical perceptual hashes (pHash, dHash, aHash, WHash) with deep embeddings (CLIP ViT-B/32, DINOv2-base) for image copy detection. Creators can register images and investigators can check suspected copies; a registration shows when an image was submitted, not who owns it.

## Local Setup

### 1. Prerequisites
- Python 3.11
- Docker & Docker Compose
- Git

### 2. Environment Configuration
Copy `.env.example` to `.env` and adjust database credentials if necessary:
```powershell
Copy-Item .env.example .env
```

### 3. Virtual Environment & Dependencies
Create and activate the Python 3.11 virtual environment, then install dependencies:
```powershell
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -e "backend[dev]"
```

### 4. Database Service
Start the local PostgreSQL 16 + pgvector container:
```powershell
docker compose up -d --wait db
```

### 5. Verify Database Connectivity & pgvector
Run the database check script to confirm PostgreSQL, pgvector (>= 0.7.0), Hamming distance operators, and vector operations:
```powershell
python backend/scripts/check_db.py
```

## Legacy Codebase Notice
The `legacy/` directory contains a frozen, read-only reference of the previous MongoDB prototype application for historical and migration reference. All new ProvNet development runs strictly on FastAPI, SQLAlchemy 2, Alembic, and PostgreSQL 16 with pgvector.

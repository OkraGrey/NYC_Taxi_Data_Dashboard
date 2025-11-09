# NYC Yellow Taxi Dashboard

A local, single-machine data dashboard for analyzing NYC Yellow Taxi Trip Records 

## Project Structure

- `backend/` - FastAPI server with Dask analytics
- `frontend/` - Next.js web application
- `data/` - Local data storage (gitignored)

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Running the Application

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm run dev
```

## Data Preparation

Follow the scripts in `backend/scripts/` to:
1. Download the data
2. Prepare trip records
3. Prepare geospatial data



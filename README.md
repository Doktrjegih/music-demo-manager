# Music Demo Manager

Self-hosted music demo organizer rebuilt with FastAPI, React, Vite, and iOS PWA support.

## Start backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Start frontend

```sh
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173. Put one directory per song under `backend/music-library`, with optional `metadata.yaml` containing title, description, and youtube links. Audio plays inline, other files can be downloaded.

## Install on iPhone

Deploy the frontend and backend over HTTPS, proxy `/api` to FastAPI or configure `VITE_API_URL` at build time. Open the site in Safari, tap Share → Add to Home Screen. Offline support caches the app shell and previously fetched library index, **not audio**. Background audio behavior depends on iOS. Keep the backend private until authentication is implemented.

This is a reconstruction based on the earlier app description, not a byte-for-byte copy of local source.

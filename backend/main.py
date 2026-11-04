from pathlib import Path
from urllib.parse import quote
from datetime import datetime, timedelta, timezone
import hmac
import os
import secrets
import yaml
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from pydantic import BaseModel

ROOT = Path(os.getenv("MUSIC_LIBRARY", Path(__file__).parent / "music-library")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
AUDIO = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".opus"}
COOKIE = "music_session"
SESSION_DAYS = 30
SESSION_SECRET = os.getenv("MUSIC_SESSION_SECRET", "")
AUTH_PASSWORD = os.getenv("MUSIC_AUTH_PASSWORD", "")
if len(SESSION_SECRET) < 32 or not AUTH_PASSWORD:
    raise RuntimeError("Set MUSIC_SESSION_SECRET (32+ characters) and MUSIC_AUTH_PASSWORD")
signer = URLSafeTimedSerializer(SESSION_SECRET, salt="music-demo-login-v1")
app = FastAPI(title="Music Demo Manager")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","), allow_methods=["GET", "POST"], allow_headers=["*"], allow_credentials=True)

class Login(BaseModel):
    username: str
    password: str
    remember: bool = True

def authenticated(request: Request):
    token = request.cookies.get(COOKIE, "")
    try:
        data = signer.loads(token, max_age=SESSION_DAYS * 86400)
        if data.get("user") == "music" and data.get("version") == 1:
            return True
    except (BadSignature, SignatureExpired):
        pass
    raise HTTPException(status_code=401, detail="Please sign in")

@app.post("/api/auth/login")
def login(credentials: Login, response: Response):
    if not (hmac.compare_digest(credentials.username.encode(), b"music") and hmac.compare_digest(credentials.password.encode(), AUTH_PASSWORD.encode())):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = signer.dumps({"user": "music", "version": 1})
    response.set_cookie(COOKIE, token, httponly=True, secure=True, samesite="lax", path="/api", max_age=SESSION_DAYS * 86400 if credentials.remember else None)
    return {"ok": True}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, path="/api", secure=True, httponly=True, samesite="lax")
    return {"ok": True}

@app.get("/api/auth/me")
def me(_: bool = Depends(authenticated)):
    return {"username": "music"}

def within_library(path: Path) -> Path:
    target = path.resolve()
    if not target.is_relative_to(ROOT):
        raise HTTPException(status_code=403, detail="Invalid path")
    return target

@app.get("/api/songs")
def songs(_: bool = Depends(authenticated)):
    results = []
    for folder in ROOT.iterdir():
        if not folder.is_dir() or folder.is_symlink():
            continue
        metadata = {}
        meta_file = folder / "metadata.yaml"
        if meta_file.exists():
            try:
                loaded = yaml.safe_load(meta_file.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    metadata = loaded
            except (OSError, yaml.YAMLError):
                pass
        files = []
        for file in sorted(folder.rglob("*")):
            if not file.is_file() or file.is_symlink() or file.name == "metadata.yaml":
                continue
            rel = file.relative_to(ROOT).as_posix()
            extension = file.suffix.lower()
            files.append({"name": file.name, "path": file.relative_to(folder).as_posix(), "extension": extension, "playable": extension in AUDIO, "url": "/api/files/" + quote(rel, safe="/")})
        results.append({"id": folder.name, "title": str(metadata.get("title") or folder.name), "description": str(metadata.get("description") or ""), "youtube": metadata.get("youtube") or [], "files": files})
    return sorted(results, key=lambda s: s["title"].casefold())

@app.get("/api/files/{file_path:path}")
def file(file_path: str, _: bool = Depends(authenticated)):
    target = within_library(ROOT / file_path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target, filename=target.name if target.suffix.lower() not in AUDIO else None)

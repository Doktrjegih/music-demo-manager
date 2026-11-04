from pathlib import Path
from urllib.parse import quote
import os
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(os.getenv("MUSIC_LIBRARY", Path(__file__).parent / "music-library")).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
AUDIO = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".opus"}
app = FastAPI(title="Music Demo Manager")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","), allow_methods=["GET"], allow_headers=["*"])

def within_library(path: Path) -> Path:
    target = path.resolve()
    if not target.is_relative_to(ROOT):
        raise HTTPException(status_code=403, detail="Invalid path")
    return target

@app.get("/api/songs")
def songs():
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
def file(file_path: str):
    target = within_library(ROOT / file_path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(target, filename=target.name if target.suffix.lower() not in AUDIO else None)

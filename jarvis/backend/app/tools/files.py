"""Read-only file-system tools (Phase 1).

Every path coming from the model is resolved and validated against the
configured allowed roots before anything is touched. These tools never
modify the file system.
"""
import fnmatch
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from ..config import get_settings

# Directories that are almost never what the user means and make walks slow.
SKIP_DIR_NAMES = {
    "node_modules", "__pycache__", ".git", ".hg", ".svn", ".venv", "venv",
    "site-packages", "$RECYCLE.BIN", "System Volume Information",
}

MAX_ENTRIES_SCANNED = 200_000  # hard cap so a search can never run away


class PathNotAllowedError(Exception):
    pass


def resolve_allowed(raw_path: str) -> Path:
    """Resolve a model-supplied path and require it to sit inside an allowed root."""
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = Path.home() / path
    path = path.resolve()
    for root in get_settings().allowed_roots:
        try:
            if path == root or path.is_relative_to(root):
                return path
        except ValueError:
            continue
    allowed = ", ".join(str(r) for r in get_settings().allowed_roots)
    raise PathNotAllowedError(
        f"Access to '{raw_path}' is outside the allowed directories ({allowed}). "
        "The user can widen access via JARVIS_ALLOWED_ROOTS in settings."
    )


def _entry_info(path: Path) -> dict:
    try:
        stat = path.stat()
        return {
            "path": str(path),
            "name": path.name,
            "type": "dir" if path.is_dir() else "file",
            "size_bytes": None if path.is_dir() else stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
            .isoformat(timespec="seconds"),
        }
    except OSError as exc:
        return {"path": str(path), "name": path.name, "error": str(exc)}


def search_files(
    query: str,
    root: str | None = None,
    extensions: list[str] | None = None,
    modified_after: str | None = None,
    min_size_bytes: int | None = None,
    max_size_bytes: int | None = None,
    include_hidden: bool = False,
    max_results: int = 50,
) -> str:
    """Recursively search for files by name under an allowed root."""
    base = resolve_allowed(root) if root else get_settings().allowed_roots[0]
    if not base.is_dir():
        raise ValueError(f"'{base}' is not a directory.")

    query = query.strip()
    is_glob = any(ch in query for ch in "*?[")
    needle = query.lower()
    exts = {e.lower().lstrip(".") for e in extensions} if extensions else None
    after_ts = None
    if modified_after:
        after_ts = datetime.fromisoformat(modified_after).timestamp()

    max_results = max(1, min(int(max_results), 500))
    results: list[dict] = []
    scanned = 0
    truncated = False

    for dirpath, dirnames, filenames in os.walk(base, topdown=True):
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIR_NAMES and (include_hidden or not d.startswith("."))
        ]
        for name in filenames:
            scanned += 1
            if scanned > MAX_ENTRIES_SCANNED:
                truncated = True
                break
            if not include_hidden and name.startswith("."):
                continue
            lower = name.lower()
            if is_glob:
                if not fnmatch.fnmatch(lower, needle):
                    continue
            elif needle and needle not in lower:
                continue
            if exts is not None and lower.rsplit(".", 1)[-1] not in exts:
                continue
            full = Path(dirpath) / name
            try:
                stat = full.stat()
            except OSError:
                continue
            if after_ts and stat.st_mtime < after_ts:
                continue
            if min_size_bytes is not None and stat.st_size < min_size_bytes:
                continue
            if max_size_bytes is not None and stat.st_size > max_size_bytes:
                continue
            results.append(_entry_info(full))
            if len(results) >= max_results:
                truncated = True
                break
        if truncated:
            break

    return json.dumps(
        {
            "root": str(base),
            "query": query,
            "match_count": len(results),
            "truncated": truncated,
            "matches": results,
        },
        ensure_ascii=False,
    )


def list_directory(path: str, include_hidden: bool = False) -> str:
    """List the immediate contents of a directory with sizes and dates."""
    target = resolve_allowed(path)
    if not target.exists():
        raise FileNotFoundError(f"'{target}' does not exist.")
    if not target.is_dir():
        raise NotADirectoryError(f"'{target}' is a file, not a directory.")

    entries = []
    for child in sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
        if not include_hidden and child.name.startswith("."):
            continue
        entries.append(_entry_info(child))
        if len(entries) >= 500:
            break

    return json.dumps(
        {"path": str(target), "entry_count": len(entries), "entries": entries},
        ensure_ascii=False,
    )

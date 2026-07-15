"""Tool registry: JSON-schema definitions given to Claude + the dispatcher.

Phase 1 exposes read-only tools only. Later phases add write/app/system/shell
tools behind the permission-tier model.
"""
import json
import traceback

from . import analyze, files

TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "search_files",
        "description": (
            "Search the user's files by name, recursively, under an allowed "
            "directory. Call this when the user asks to find, locate, or count "
            "files, or asks what large/recent files exist. Matching is "
            "case-insensitive substring by default; if the query contains * or ? "
            "it is treated as a glob pattern. Read-only."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "File-name text to match (e.g. 'invoice'), or a glob "
                        "pattern (e.g. '*.pdf'). Use an empty string to match "
                        "everything and rely on the other filters."
                    ),
                },
                "root": {
                    "type": "string",
                    "description": (
                        "Directory to search under. Defaults to the user's home "
                        "directory. Accepts ~ expansion."
                    ),
                },
                "extensions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Only include these extensions, e.g. ['pdf', 'docx'].",
                },
                "modified_after": {
                    "type": "string",
                    "description": "ISO date/datetime; only files modified after this moment.",
                },
                "min_size_bytes": {"type": "integer", "description": "Minimum file size."},
                "max_size_bytes": {"type": "integer", "description": "Maximum file size."},
                "include_hidden": {
                    "type": "boolean",
                    "description": "Include hidden/dot files and folders. Default false.",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Cap on returned matches (1-500, default 50).",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "list_directory",
        "description": (
            "List the immediate contents of one directory with file sizes and "
            "modification dates. Call this when the user asks what's inside a "
            "folder, or before reading a document whose exact name you don't "
            "know. Read-only."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory to list. Accepts ~."},
                "include_hidden": {
                    "type": "boolean",
                    "description": "Include hidden/dot entries. Default false.",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "read_document",
        "description": (
            "Extract the contents of a document so you can summarize or answer "
            "questions about it. Call this whenever the user asks to summarize, "
            "explain, or analyze a specific file. Supports PDF, Word (.docx), "
            "Excel (.xlsx — returns sheet previews with rows as tab-separated "
            "values), CSV, and plain-text/code/log files. Read-only."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Full path of the file to read."},
                "sheet": {
                    "type": "string",
                    "description": "For spreadsheets: read only this sheet by name.",
                },
            },
            "required": ["path"],
        },
    },
]

_HANDLERS = {
    "search_files": files.search_files,
    "list_directory": files.list_directory,
    "read_document": analyze.read_document,
}


def execute_tool(name: str, tool_input: dict) -> tuple[str, bool]:
    """Run a tool. Returns (result_json_or_error_text, is_error)."""
    handler = _HANDLERS.get(name)
    if handler is None:
        return f"Unknown tool: {name}", True
    try:
        return handler(**tool_input), False
    except TypeError as exc:
        return f"Invalid arguments for {name}: {exc}", True
    except Exception as exc:  # surfaced to the model so it can adapt
        traceback.print_exc()
        return f"{type(exc).__name__}: {exc}", True


def tool_result_preview(result: str, limit: int = 600) -> str:
    """Short preview of a tool result for the dashboard event stream."""
    try:
        parsed = json.loads(result)
        compact = json.dumps(parsed, ensure_ascii=False)
    except (json.JSONDecodeError, TypeError):
        compact = result
    return compact[:limit] + ("…" if len(compact) > limit else "")

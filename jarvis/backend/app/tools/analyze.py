"""Read-only document/spreadsheet extraction (Phase 1).

`read_document` extracts text or tabular content from a file so Claude can
summarize, explain, or answer questions about it in conversation. Extraction
happens locally; only the extracted text is sent to the Claude API.
"""
import json
from pathlib import Path

from .files import resolve_allowed

MAX_CHARS = 60_000        # cap on extracted text returned to the model
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_SHEET_ROWS = 200      # per-sheet row preview for spreadsheets

TEXT_SUFFIXES = {
    ".txt", ".md", ".markdown", ".log", ".json", ".jsonl", ".xml", ".yaml",
    ".yml", ".toml", ".ini", ".cfg", ".py", ".js", ".ts", ".html", ".css",
    ".sql", ".sh", ".ps1", ".bat", ".rs", ".go", ".java", ".c", ".cpp", ".h",
}


def _clip(text: str) -> tuple[str, bool]:
    if len(text) > MAX_CHARS:
        return text[:MAX_CHARS], True
    return text, False


def _extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(path)
    pages = []
    for i, page in enumerate(reader.pages):
        if i >= 200:
            pages.append(f"[... stopped after 200 of {len(reader.pages)} pages ...]")
            break
        pages.append(page.extract_text() or "")
    return "\n\n".join(pages)


def _extract_docx(path: Path) -> str:
    import docx

    document = docx.Document(str(path))
    parts = [p.text for p in document.paragraphs]
    for table in document.tables:
        parts.append("")
        for row in table.rows:
            parts.append(" | ".join(cell.text.strip() for cell in row.cells))
    return "\n".join(parts)


def _extract_xlsx(path: Path, sheet: str | None) -> str:
    from openpyxl import load_workbook

    wb = load_workbook(path, read_only=True, data_only=True)
    try:
        names = wb.sheetnames
        targets = [sheet] if sheet else names
        out = [f"Workbook sheets: {', '.join(names)}"]
        for name in targets:
            if name not in names:
                out.append(f"\n[sheet '{name}' not found]")
                continue
            ws = wb[name]
            out.append(f"\n=== Sheet: {name} ({ws.max_row} rows x {ws.max_column} cols) ===")
            for r, row in enumerate(ws.iter_rows(values_only=True)):
                if r >= MAX_SHEET_ROWS:
                    out.append(f"[... {ws.max_row - MAX_SHEET_ROWS} more rows not shown ...]")
                    break
                cells = ["" if c is None else str(c) for c in row]
                out.append("\t".join(cells).rstrip())
        return "\n".join(out)
    finally:
        wb.close()


def read_document(path: str, sheet: str | None = None) -> str:
    """Extract the contents of a document, spreadsheet, or text file."""
    target = resolve_allowed(path)
    if not target.is_file():
        raise FileNotFoundError(f"'{target}' does not exist or is not a file.")
    size = target.stat().st_size
    if size > MAX_FILE_BYTES:
        raise ValueError(
            f"File is {size / 1_048_576:.0f} MB — larger than the 50 MB read limit."
        )

    suffix = target.suffix.lower()
    if suffix == ".pdf":
        text = _extract_pdf(target)
        kind = "pdf"
    elif suffix == ".docx":
        text = _extract_docx(target)
        kind = "word"
    elif suffix in (".xlsx", ".xlsm"):
        text = _extract_xlsx(target, sheet)
        kind = "spreadsheet"
    elif suffix == ".csv" or suffix in TEXT_SUFFIXES or suffix == "":
        text = target.read_text(encoding="utf-8", errors="replace")
        kind = "text"
    else:
        raise ValueError(
            f"Unsupported file type '{suffix}'. Supported: .pdf, .docx, .xlsx, "
            ".csv and plain-text files. (.doc/.xls legacy formats are not "
            "supported — ask the user to re-save as .docx/.xlsx.)"
        )

    text, truncated = _clip(text)
    return json.dumps(
        {
            "path": str(target),
            "kind": kind,
            "size_bytes": size,
            "truncated": truncated,
            "content": text,
        },
        ensure_ascii=False,
    )

"""Phase 1 computer-control tools (Windows-first, graceful elsewhere)."""

from __future__ import annotations

import platform
import subprocess
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

from .registry import Tool, ToolRegistry

IS_WINDOWS = sys.platform == "win32"
IS_MAC = sys.platform == "darwin"

# Friendly-name → launch target. On Windows anything resolvable by `start`
# (PATH entries, App Paths registry keys) also works without a mapping.
APP_ALIASES = {
    "chrome": "chrome",
    "google chrome": "chrome",
    "edge": "msedge",
    "firefox": "firefox",
    "notepad": "notepad",
    "calculator": "calc",
    "explorer": "explorer",
    "file explorer": "explorer",
    "terminal": "wt",
    "command prompt": "cmd",
    "task manager": "taskmgr",
    "settings": "ms-settings:",
    "vs code": "code",
    "vscode": "code",
    "word": "winword",
    "excel": "excel",
    "powerpoint": "powerpnt",
    "spotify": "spotify",
}


def open_app(name: str) -> str:
    target = APP_ALIASES.get(name.strip().lower(), name.strip())
    if IS_WINDOWS:
        # `start` resolves PATH, App Paths and URI schemes (ms-settings:).
        subprocess.Popen(["cmd", "/c", "start", "", target], shell=False)
    elif IS_MAC:
        subprocess.Popen(["open", "-a", target])
    else:
        subprocess.Popen([target])
    return f"Launched {name}."


def close_app(name: str) -> str:
    import psutil

    target = APP_ALIASES.get(name.strip().lower(), name.strip()).lower()
    killed = 0
    for proc in psutil.process_iter(["name"]):
        proc_name = (proc.info["name"] or "").lower()
        if proc_name.startswith(target) or proc_name.startswith(f"{target}.exe"):
            try:
                proc.terminate()
                killed += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    if killed == 0:
        return f"No running process matched '{name}'."
    return f"Closed {killed} process(es) matching '{name}'."


def open_website(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Opened {url} in the default browser."


def take_screenshot(screenshots_dir: Path) -> str:
    import pyautogui

    screenshots_dir.mkdir(parents=True, exist_ok=True)
    path = screenshots_dir / f"screenshot_{datetime.now():%Y%m%d_%H%M%S}.png"
    pyautogui.screenshot(str(path))
    return f"Screenshot saved to {path}."


def computer_power(action: str) -> str:
    action = action.strip().lower()
    if action == "lock":
        if IS_WINDOWS:
            subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=True)
        elif IS_MAC:
            subprocess.run(
                ["osascript", "-e", 'tell application "System Events" to keystroke "q" using {command down, control down}'],
                check=True,
            )
        else:
            subprocess.run(["loginctl", "lock-session"], check=True)
        return "Workstation locked."
    if action == "shutdown":
        cmd = ["shutdown", "/s", "/t", "5"] if IS_WINDOWS else ["shutdown", "-h", "now"]
        subprocess.run(cmd, check=True)
        return "Shutting down in five seconds."
    if action == "restart":
        cmd = ["shutdown", "/r", "/t", "5"] if IS_WINDOWS else ["shutdown", "-r", "now"]
        subprocess.run(cmd, check=True)
        return "Restarting in five seconds."
    return f"Unknown power action: {action}"


def get_time() -> str:
    now = datetime.now()
    return f"It is {now:%A, %B %d, %Y, %I:%M %p} on {platform.node() or 'this machine'}."


def register_computer_tools(registry: ToolRegistry, screenshots_dir: Path) -> None:
    registry.register(Tool(
        name="open_app",
        description=(
            "Open/launch an application on the computer by name, "
            "e.g. 'chrome', 'notepad', 'spotify', 'vs code'."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Application name to launch"},
            },
            "required": ["name"],
        },
        handler=open_app,
    ))

    registry.register(Tool(
        name="close_app",
        description="Close a running application by name (terminates matching processes).",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Application name to close"},
            },
            "required": ["name"],
        },
        handler=close_app,
    ))

    registry.register(Tool(
        name="open_website",
        description="Open a URL or website in the user's default web browser.",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL or domain, e.g. 'youtube.com'"},
            },
            "required": ["url"],
        },
        handler=open_website,
    ))

    registry.register(Tool(
        name="take_screenshot",
        description="Capture the current screen and save it as a PNG file.",
        input_schema={"type": "object", "properties": {}},
        handler=lambda: take_screenshot(screenshots_dir),
    ))

    registry.register(Tool(
        name="lock_computer",
        description="Lock the workstation immediately. Safe and instant; no confirmation needed.",
        input_schema={"type": "object", "properties": {}},
        handler=lambda: computer_power("lock"),
    ))

    registry.register(Tool(
        name="computer_power",
        description=(
            "Shut down or restart the computer. The system confirms with the "
            "user before executing — do not ask for confirmation yourself."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["shutdown", "restart"],
                    "description": "The power action to perform",
                },
            },
            "required": ["action"],
        },
        handler=computer_power,
        requires_confirmation=True,
        confirmation_prompt="This will {action} the computer. Shall I proceed?",
    ))

    registry.register(Tool(
        name="get_time",
        description="Get the current local date and time.",
        input_schema={"type": "object", "properties": {}},
        handler=get_time,
    ))

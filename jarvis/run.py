#!/usr/bin/env python3
"""Jarvis entry point.

    python run.py           # voice mode (the product)
    python run.py --text    # developer text REPL, no audio hardware needed
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from jarvis.app import run_text, run_voice, setup_logging
from jarvis.config import Config


def main() -> int:
    parser = argparse.ArgumentParser(description="Jarvis — voice-only personal AI agent")
    parser.add_argument("--text", action="store_true",
                        help="run a text REPL instead of the voice loop (debugging)")
    args = parser.parse_args()

    config = Config.load(Path(__file__).parent)
    setup_logging(config)

    try:
        if args.text:
            run_text(config)
        else:
            run_voice(config)
    except RuntimeError as exc:
        print(f"Cannot start: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

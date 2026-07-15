"""Claude agent loop: streaming chat with tool use.

One turn = the user's message plus however many model↔tool round-trips Claude
needs before it produces a final text answer. Events are yielded as dicts and
serialized to SSE by the API layer:

    {"type": "state", "state": "thinking" | "speaking" | "tool"}
    {"type": "text_delta", "text": "..."}
    {"type": "tool_use", "id", "name", "input"}
    {"type": "tool_result", "tool_use_id", "name", "is_error", "preview"}
    {"type": "turn_done", "stop_reason": "..."}
    {"type": "error", "message": "..."}
"""
from typing import Any, AsyncGenerator

import anthropic

from .config import get_settings
from .tools import TOOL_DEFINITIONS, execute_tool, tool_result_preview

SYSTEM_PROMPT = """\
You are Jarvis, a calm and competent AI assistant that lives on the user's \
Windows PC as a desktop dashboard app. You help the user understand and work \
with their computer.

Current capabilities (Phase 1 — strictly read-only):
- search_files: find files by name/pattern/size/date under allowed folders
- list_directory: inspect a folder's contents
- read_document: extract PDF, Word, Excel, CSV, and text files so you can \
summarize, explain totals/trends/anomalies, or answer questions about them

You cannot yet move, rename, delete, or create files, launch apps, run shell \
commands, or change settings. Those arrive in later phases behind an explicit \
permission system with undo. If asked for such an action, briefly say it isn't \
enabled yet and offer the closest read-only help instead.

Style: be concise and direct — this is a HUD, not a chat novel. Lead with the \
answer, then supporting detail. Use short lists for file results. When a tool \
returns truncated results, say so. Never invent file contents or paths: if you \
didn't read it with a tool, don't claim it. Paths in this environment may be \
Windows-style or POSIX-style; use them exactly as tools return them.
"""

MAX_TOOL_ROUNDS = 12


def _make_client() -> anthropic.AsyncAnthropic:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Copy jarvis/.env.example to "
            "jarvis/backend/.env and add your Anthropic API key."
        )
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def run_turn(
    messages: list[dict[str, Any]],
) -> AsyncGenerator[dict[str, Any], None]:
    """Drive one full agentic turn, mutating `messages` in place."""
    settings = get_settings()
    try:
        client = _make_client()
    except RuntimeError as exc:
        yield {"type": "error", "message": str(exc)}
        return

    rounds = 0
    try:
        while True:
            yield {"type": "state", "state": "thinking"}
            async with client.messages.stream(
                model=settings.jarvis_model,
                max_tokens=settings.jarvis_max_tokens,
                thinking={"type": "adaptive"},
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                tools=TOOL_DEFINITIONS,
                messages=messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        if event.content_block.type == "text":
                            yield {"type": "state", "state": "speaking"}
                    elif (
                        event.type == "content_block_delta"
                        and event.delta.type == "text_delta"
                    ):
                        yield {"type": "text_delta", "text": event.delta.text}
                response = await stream.get_final_message()

            # Always echo the assistant content back (preserves thinking blocks).
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "pause_turn":
                continue  # server-side pause: re-send to resume

            if response.stop_reason != "tool_use":
                if response.stop_reason == "refusal":
                    yield {
                        "type": "error",
                        "message": "Claude declined this request for safety reasons.",
                    }
                yield {"type": "turn_done", "stop_reason": response.stop_reason}
                return

            rounds += 1
            if rounds > MAX_TOOL_ROUNDS:
                yield {
                    "type": "error",
                    "message": f"Stopped after {MAX_TOOL_ROUNDS} tool rounds.",
                }
                yield {"type": "turn_done", "stop_reason": "tool_round_limit"}
                return

            tool_results: list[dict[str, Any]] = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                yield {
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                }
                yield {"type": "state", "state": "tool"}
                result, is_error = execute_tool(block.name, dict(block.input))
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                        "is_error": is_error,
                    }
                )
                yield {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "name": block.name,
                    "is_error": is_error,
                    "preview": tool_result_preview(result),
                }
            # All results for this round go back in a single user message.
            messages.append({"role": "user", "content": tool_results})

    except anthropic.AuthenticationError:
        yield {"type": "error", "message": "Invalid Anthropic API key. Check your .env."}
        yield {"type": "turn_done", "stop_reason": "error"}
    except anthropic.RateLimitError:
        yield {"type": "error", "message": "Rate limited by the Claude API — try again shortly."}
        yield {"type": "turn_done", "stop_reason": "error"}
    except anthropic.APIStatusError as exc:
        yield {"type": "error", "message": f"Claude API error {exc.status_code}: {exc.message}"}
        yield {"type": "turn_done", "stop_reason": "error"}
    except anthropic.APIConnectionError:
        yield {"type": "error", "message": "Could not reach the Claude API — check your connection."}
        yield {"type": "turn_done", "stop_reason": "error"}

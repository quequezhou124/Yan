import os
from dataclasses import dataclass

import requests


class OllamaClientError(Exception):
    """Raised when an Ollama request fails."""


@dataclass(frozen=True)
class OllamaConfig:
    base_url: str
    model: str
    timeout_seconds: int
    max_retries: int

    @classmethod
    def from_env(cls) -> "OllamaConfig":
        return cls(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            model=os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud"),
            timeout_seconds=_read_int_env("OLLAMA_TIMEOUT_SECONDS", 60),
            max_retries=_read_int_env("OLLAMA_MAX_RETRIES", 2),
        )


def chat_json(system_prompt: str, user_prompt: str, config: OllamaConfig | None = None) -> str:
    resolved_config = config or OllamaConfig.from_env()
    url = f"{resolved_config.base_url.rstrip('/')}/api/chat"
    payload = {
        "model": resolved_config.model,
        "stream": False,
        "format": "json",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        response = requests.post(url, json=payload, timeout=resolved_config.timeout_seconds)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise OllamaClientError("Ollama request failed") from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise OllamaClientError("Ollama returned a non-JSON response envelope") from exc

    message = body.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        content = message["content"]
    elif isinstance(body.get("response"), str):
        content = body["response"]
    else:
        raise OllamaClientError("Ollama response missing generated content")

    if not content.strip():
        raise OllamaClientError("Ollama response missing generated content")

    return content


def _read_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError:
        return default

    return value if value >= 0 else default

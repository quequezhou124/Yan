import json
import os
from dataclasses import dataclass
from typing import Any

import requests


MIN_P1_ITEMS = 3
MAX_P1_ITEMS = 6
MIN_SENTENCES = 5
MAX_SENTENCES = 10

SYSTEM_PROMPT = """You generate only valid JSON.
Do not output markdown, code fences, commentary, or extra text.
Follow the schema exactly.
The top-level object must have exactly two keys: "p1" and "p2".
"p1" must be an array containing 3 to 6 items.
Each "p1" item must be an array of exactly 3 strings in this order: [IPA, letter_combo, example_word].
"p2" must be an object with exactly two keys: "sentences" and "tsentences".
"p2.sentences" must contain 5 to 10 English sentences related to the requested scene.
"p2.tsentences" must contain the same number of translated sentences in the requested language, localized for the requested country.
The English sentences should naturally reuse some vocabulary implied by the p1 items.
Return JSON only."""


class ContentGenerationError(Exception):
    """Raised when content generation fails."""


class ContentValidationError(Exception):
    """Raised when model output does not match the expected schema."""


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


def generate_content(scene: str, origin_lang: str, country: str) -> dict[str, Any]:
    config = OllamaConfig.from_env()
    repair_reason: str | None = None
    last_validation_error: ContentValidationError | None = None

    for attempt in range(config.max_retries + 1):
        raw_content = _call_ollama(
            config=config,
            user_prompt=_build_user_prompt(
                scene=scene,
                origin_lang=origin_lang,
                country=country,
                repair_reason=repair_reason,
            ),
        )

        try:
            return _validate_and_normalize_payload(raw_content)
        except ContentValidationError as exc:
            last_validation_error = exc
            if attempt == config.max_retries:
                break
            repair_reason = str(exc)

    raise ContentGenerationError("Model did not return valid content JSON") from last_validation_error


def _read_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError:
        return default

    return value if value >= 0 else default


def _build_user_prompt(scene: str, origin_lang: str, country: str, repair_reason: str | None) -> str:
    prompt = f"""Generate scene-learning content for this request:
- scene: {scene}
- source sentence language: English
- translation language: {origin_lang}
- translation locale country: {country}

Requirements:
1. Create 3 to 6 scene-relevant phonics or letter-combination items.
2. Each item must be an array in this order: [IPA, letter_combo, example_word].
3. Create 5 to 10 short English scene sentences that fit the scene naturally.
4. Reuse some of the generated example words or related vocabulary in the English sentences where natural.
5. Translate each English sentence into {origin_lang}, localized for {country}.
6. The sentence arrays must stay aligned by index.

Return exactly this JSON shape:
{{
  "p1": [
    ["ipa1", "letter_combo1", "example_word1"],
    ["ipa2", "letter_combo2", "example_word2"]
  ],
  "p2": {{
    "sentences": ["sentence1", "sentence2"],
    "tsentences": ["translation1", "translation2"]
  }}
}}"""

    if repair_reason:
        prompt = (
            f"{prompt}\n\n"
            f"The previous response was invalid for this reason: {repair_reason}.\n"
            "Fix the response and return corrected JSON only."
        )

    return prompt


def _call_ollama(config: OllamaConfig, user_prompt: str) -> str:
    url = f"{config.base_url.rstrip('/')}/api/chat"
    payload = {
        "model": config.model,
        "stream": False,
        "format": "json",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        response = requests.post(url, json=payload, timeout=config.timeout_seconds)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ContentGenerationError("Ollama request failed") from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise ContentGenerationError("Ollama returned a non-JSON response envelope") from exc

    message = body.get("message")
    if isinstance(message, dict) and isinstance(message.get("content"), str):
        content = message["content"]
    elif isinstance(body.get("response"), str):
        content = body["response"]
    else:
        raise ContentGenerationError("Ollama response missing generated content")

    if not content.strip():
        raise ContentGenerationError("Ollama response missing generated content")

    return content


def _validate_and_normalize_payload(raw_content: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise ContentValidationError("response was not valid JSON") from exc

    if not isinstance(payload, dict):
        raise ContentValidationError("top-level JSON value must be an object")
    if set(payload.keys()) != {"p1", "p2"}:
        raise ContentValidationError('top-level keys must be exactly "p1" and "p2"')

    normalized_p1 = _normalize_p1(payload["p1"])
    normalized_p2 = _normalize_p2(payload["p2"])
    return {"p1": normalized_p1, "p2": normalized_p2}


def _normalize_p1(value: Any) -> list[list[str]]:
    if not isinstance(value, list):
        raise ContentValidationError('"p1" must be an array')

    normalized_items: list[list[str]] = []
    for item in value:
        if not isinstance(item, list) or len(item) != 3:
            raise ContentValidationError('each "p1" item must be an array of exactly 3 strings')

        normalized_item: list[str] = []
        for part in item:
            normalized_item.append(_normalize_string(part, 'each "p1" item value'))
        normalized_items.append(normalized_item)

    if len(normalized_items) < MIN_P1_ITEMS:
        raise ContentValidationError(f'"p1" must contain at least {MIN_P1_ITEMS} items')

    if len(normalized_items) > MAX_P1_ITEMS:
        normalized_items = normalized_items[:MAX_P1_ITEMS]

    return normalized_items


def _normalize_p2(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        raise ContentValidationError('"p2" must be an object')
    if set(value.keys()) != {"sentences", "tsentences"}:
        raise ContentValidationError('"p2" keys must be exactly "sentences" and "tsentences"')

    sentences = _normalize_string_list(value["sentences"], '"p2.sentences"')
    translated_sentences = _normalize_string_list(value["tsentences"], '"p2.tsentences"')

    if len(sentences) != len(translated_sentences):
        raise ContentValidationError('"p2.sentences" and "p2.tsentences" must have the same length')
    if len(sentences) < MIN_SENTENCES:
        raise ContentValidationError(f'"p2.sentences" must contain at least {MIN_SENTENCES} items')

    if len(sentences) > MAX_SENTENCES:
        sentences = sentences[:MAX_SENTENCES]
        translated_sentences = translated_sentences[:MAX_SENTENCES]

    return {"sentences": sentences, "tsentences": translated_sentences}


def _normalize_string_list(value: Any, field_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ContentValidationError(f"{field_name} must be an array")
    return [_normalize_string(item, field_name) for item in value]


def _normalize_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise ContentValidationError(f"{field_name} must contain only strings")

    normalized = value.strip()
    if not normalized:
        raise ContentValidationError(f"{field_name} must not contain empty strings")

    return normalized

import json
import re
from typing import Any

from .ollama_client import OllamaClientError, OllamaConfig, chat_json


MAX_WORDS = 20

SYSTEM_PROMPT = """You generate only valid JSON.
Do not output markdown, code fences, commentary, or extra text.
Follow the schema exactly.
The top-level object must have exactly one key: "words".
"words" must be an array with one item per requested input word.
Each item must be an object with exactly two string keys: "word" and "ipa".
Keep each "word" faithful to the requested input token, normalized only by trimming spaces.
Use standard IPA notation in the "ipa" field.
Return JSON only."""


class PronunciationGenerationError(Exception):
    """Raised when pronunciation generation fails."""


class PronunciationValidationError(Exception):
    """Raised when model output does not match the expected schema."""


def generate_pronunciations(raw_words: str) -> dict[str, list[dict[str, str]]]:
    words = _parse_words(raw_words)
    if not words:
        raise PronunciationValidationError("at least one word is required")

    config = OllamaConfig.from_env()
    repair_reason: str | None = None
    last_validation_error: PronunciationValidationError | None = None

    for attempt in range(config.max_retries + 1):
        try:
            raw_content = chat_json(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=_build_user_prompt(words=words, repair_reason=repair_reason),
                config=config,
            )
        except OllamaClientError as exc:
            raise PronunciationGenerationError("Ollama request failed") from exc

        try:
            return _validate_and_normalize_payload(raw_content, requested_words=words)
        except PronunciationValidationError as exc:
            last_validation_error = exc
            if attempt == config.max_retries:
                break
            repair_reason = str(exc)

    raise PronunciationGenerationError("Model did not return valid pronunciation JSON") from last_validation_error


def _parse_words(raw_words: str) -> list[str]:
    normalized = raw_words.strip()
    if not normalized:
        return []

    if "," in normalized:
        parts = [part.strip() for part in normalized.split(",")]
    else:
        parts = [part.strip() for part in re.split(r"\s+", normalized)]

    words = [part for part in parts if part]
    return words[:MAX_WORDS]


def _build_user_prompt(words: list[str], repair_reason: str | None) -> str:
    words_json = json.dumps(words, ensure_ascii=True)
    prompt = f"""Convert these words into IPA:
{words_json}

Requirements:
1. Return one IPA result per input word.
2. Preserve the input word text, except for trimming surrounding spaces.
3. Use standard IPA notation.

Return exactly this JSON shape:
{{
  "words": [
    {{"word": "shopping", "ipa": "/ˈshɑpɪŋ/"}},
    {{"word": "chair", "ipa": "/tʃer/"}}
  ]
}}"""

    if repair_reason:
        prompt = (
            f"{prompt}\n\n"
            f"The previous response was invalid for this reason: {repair_reason}.\n"
            "Fix the response and return corrected JSON only."
        )

    return prompt


def _validate_and_normalize_payload(raw_content: str, requested_words: list[str]) -> dict[str, list[dict[str, str]]]:
    try:
        payload = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise PronunciationValidationError("response was not valid JSON") from exc

    if not isinstance(payload, dict):
        raise PronunciationValidationError("top-level JSON value must be an object")
    if set(payload.keys()) != {"words"}:
        raise PronunciationValidationError('top-level keys must be exactly "words"')

    items = payload["words"]
    if not isinstance(items, list):
        raise PronunciationValidationError('"words" must be an array')
    if len(items) != len(requested_words):
        raise PronunciationValidationError('"words" must contain exactly one item per requested word')

    normalized_items: list[dict[str, str]] = []
    for expected_word, item in zip(requested_words, items, strict=True):
        if not isinstance(item, dict):
            raise PronunciationValidationError('each "words" item must be an object')
        if set(item.keys()) != {"word", "ipa"}:
            raise PronunciationValidationError('each "words" item must have exactly "word" and "ipa"')

        word = _normalize_string(item["word"], '"words.word"')
        ipa = _normalize_string(item["ipa"], '"words.ipa"')
        if word != expected_word:
            raise PronunciationValidationError('each "words.word" must match the requested input word')

        normalized_items.append({"word": word, "ipa": ipa})

    return {"words": normalized_items}


def _normalize_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise PronunciationValidationError(f"{field_name} must contain only strings")

    normalized = value.strip()
    if not normalized:
        raise PronunciationValidationError(f"{field_name} must not be empty")

    return normalized

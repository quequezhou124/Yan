import re
from functools import lru_cache

import cmudict

try:
    import pronouncing
except Exception:  # pragma: no cover - optional compatibility fallback
    pronouncing = None


MAX_WORDS = 20

ARPABET_TO_IPA = {
    "AA": "ɑ",
    "AE": "æ",
    "AH": "ʌ",
    "AO": "ɔ",
    "AW": "aʊ",
    "AY": "aɪ",
    "B": "b",
    "CH": "tʃ",
    "D": "d",
    "DH": "ð",
    "EH": "ɛ",
    "ER": "ɝ",
    "EY": "eɪ",
    "F": "f",
    "G": "ɡ",
    "HH": "h",
    "IH": "ɪ",
    "IY": "i",
    "JH": "dʒ",
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ŋ",
    "OW": "oʊ",
    "OY": "ɔɪ",
    "P": "p",
    "R": "r",
    "S": "s",
    "SH": "ʃ",
    "T": "t",
    "TH": "θ",
    "UH": "ʊ",
    "UW": "u",
    "V": "v",
    "W": "w",
    "Y": "j",
    "Z": "z",
    "ZH": "ʒ",
}

class PronunciationGenerationError(Exception):
    """Raised when pronunciation generation fails."""


class PronunciationValidationError(Exception):
    """Raised when pronunciation generation input or lookup fails."""


def generate_pronunciations(raw_words: str) -> dict[str, list[dict[str, str]]]:
    words = _parse_words(raw_words)
    if not words:
        raise PronunciationValidationError("at least one word is required")

    normalized_items: list[dict[str, str]] = []
    missing_words: list[str] = []

    for word in words:
        arpabet = _lookup_arpabet(word)
        if arpabet is None:
            missing_words.append(word)
            continue

        normalized_items.append({"word": word, "ipa": _arpabet_to_ipa(arpabet)})

    if missing_words:
        joined_words = ", ".join(missing_words)
        raise PronunciationValidationError(f"no CMU pronunciation found for: {joined_words}")

    return {"words": normalized_items}


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


def _lookup_arpabet(word: str) -> list[str] | None:
    normalized_word = word.strip().lower()
    if not normalized_word:
        return None

    if pronouncing is not None:
        phones = pronouncing.phones_for_word(normalized_word)
        if phones:
            return phones[0].split()

    entries = _cmu_dict().get(normalized_word)
    if entries:
        return entries[0]

    return None


@lru_cache(maxsize=1)
def _cmu_dict() -> dict[str, list[list[str]]]:
    return cmudict.dict()


def _arpabet_to_ipa(phones: list[str]) -> str:
    ipa_parts: list[str] = []

    for phone in phones:
        base_phone = _phone_base(phone)
        ipa_phone = _ipa_phone(phone, base_phone)
        ipa_parts.append(ipa_phone)

    return f"/{''.join(ipa_parts)}/"


def _phone_base(phone: str) -> str:
    return re.sub(r"\d", "", phone)


def _ipa_phone(phone: str, base_phone: str) -> str:
    if base_phone == "AH" and phone.endswith("0"):
        return "ə"
    if base_phone == "ER" and phone.endswith("0"):
        return "ɚ"

    ipa_phone = ARPABET_TO_IPA.get(base_phone)
    if ipa_phone is None:
        raise PronunciationGenerationError(f"unsupported ARPAbet phone: {base_phone}")
    return ipa_phone

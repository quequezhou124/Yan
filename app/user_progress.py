import json
import os
import tempfile
from dataclasses import dataclass
from threading import Lock
from typing import Any


_STORE_LOCK = Lock()


@dataclass(frozen=True)
class LearnedPhonics:
    ipa: str
    letter_combo: str
    count: int


class UserProgressStore:
    def __init__(self, path: str | None = None):
        self.path = path or os.getenv("YAN_USER_PROGRESS_FILE", "data/user_progress.json")

    def get_learned_phonics(self, userid: int) -> list[LearnedPhonics]:
        data = self._read_data()
        user_data = data.get(str(userid), {})
        phonics = user_data.get("phonics", {})
        learned_items: list[LearnedPhonics] = []

        for key, raw_item in phonics.items():
            if not isinstance(raw_item, dict):
                continue

            ipa, letter_combo = _split_phonics_key(key)
            count = raw_item.get("count", 0)
            if not ipa or not letter_combo or not isinstance(count, int) or count <= 0:
                continue

            learned_items.append(LearnedPhonics(ipa=ipa, letter_combo=letter_combo, count=count))

        learned_items.sort(key=lambda item: (-item.count, item.ipa, item.letter_combo))
        return learned_items

    def record_generated_phonics(self, userid: int, p1_items: list[list[str]]) -> None:
        with _STORE_LOCK:
            data = self._read_data()
            user_data = data.setdefault(str(userid), {})
            phonics = user_data.setdefault("phonics", {})

            for item in p1_items:
                if len(item) != 3:
                    continue

                ipa = item[0].strip()
                letter_combo = item[1].strip()
                if not ipa or not letter_combo:
                    continue

                key = _build_phonics_key(ipa, letter_combo)
                entry = phonics.setdefault(key, {"count": 0})
                count = entry.get("count", 0)
                entry["count"] = count + 1 if isinstance(count, int) and count >= 0 else 1

            self._write_data(data)

    def _read_data(self) -> dict[str, Any]:
        if not os.path.exists(self.path):
            return {}

        try:
            with open(self.path, "r", encoding="utf-8") as file_obj:
                data = json.load(file_obj)
        except (OSError, json.JSONDecodeError):
            return {}

        return data if isinstance(data, dict) else {}

    def _write_data(self, data: dict[str, Any]) -> None:
        directory = os.path.dirname(self.path) or "."
        os.makedirs(directory, exist_ok=True)

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=directory, delete=False) as tmp_file:
            json.dump(data, tmp_file, ensure_ascii=False, indent=2, sort_keys=True)
            tmp_file.write("\n")
            tmp_path = tmp_file.name

        os.replace(tmp_path, self.path)


def _build_phonics_key(ipa: str, letter_combo: str) -> str:
    return f"{ipa}||{letter_combo}"


def _split_phonics_key(key: str) -> tuple[str, str]:
    if "||" not in key:
        return "", ""
    return tuple(key.split("||", 1))  # type: ignore[return-value]

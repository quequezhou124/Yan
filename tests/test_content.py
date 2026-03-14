import os
import tempfile
import unittest
from unittest.mock import patch

from app import create_app
from app.content_service import ContentGenerationError, generate_content
from app.ollama_client import OllamaConfig
from app.phonics_catalog import select_phonics
from app.pronunciation_service import (
    PronunciationGenerationError,
    PronunciationValidationError,
    generate_pronunciations,
)
from app.user_progress import LearnedPhonics, UserProgressStore


class FakeResponse:
    def __init__(self, body, status_code=200):
        self._body = body
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._body


class FakeSession:
    RequestException = Exception

    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def post(self, url, json, timeout):
        self.calls.append({"url": url, "json": json, "timeout": timeout})
        if not self._responses:
            raise AssertionError("No fake responses left")
        return self._responses.pop(0)


class ContentRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.logger.disabled = True
        self.client = self.app.test_client()

    @patch("app.api.generate_content")
    def test_content_route_returns_generated_payload(self, mock_generate_content):
        mock_generate_content.return_value = {
            "p1": [["/ʃ/", "sh", "shop"], ["/tʃ/", "ch", "chair"], ["/θ/", "th", "thank"]],
                "p2": {
                    "sentences": [
                        "I walk into the shop.",
                    "The chair is near the door.",
                    "I think about what to buy.",
                    "The cashier smiles at me.",
                    "I carry my bag home.",
                ],
                "tsentences": ["a", "b", "c", "d", "e"],
            },
        }

        response = self.client.get("/api/v1/content/7/shopping/zh-CN/China")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), mock_generate_content.return_value)
        mock_generate_content.assert_called_once_with(
            userid=7,
            scene="shopping",
            origin_lang="zh-CN",
            country="China",
        )

    @patch("app.api.generate_content", side_effect=ContentGenerationError("boom"))
    def test_content_route_returns_502_when_generation_fails(self, mock_generate_content):
        response = self.client.get("/api/v1/content/7/shopping/zh-CN/China")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.get_json(),
            {
                "error": "ollama_generation_failed",
                "message": "Model did not return valid content JSON",
            },
        )
        mock_generate_content.assert_called_once()

    @patch("app.api.generate_pronunciations")
    def test_words_route_returns_generated_payload(self, mock_generate_pronunciations):
        mock_generate_pronunciations.return_value = {
            "words": [
                {"word": "shopping", "ipa": "/shap-ing/"},
                {"word": "chair", "ipa": "/cher/"},
            ]
        }

        response = self.client.get("/api/v1/words/shopping,chair")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), mock_generate_pronunciations.return_value)
        mock_generate_pronunciations.assert_called_once_with("shopping,chair")

    @patch("app.api.generate_pronunciations", side_effect=PronunciationGenerationError("boom"))
    def test_words_route_returns_502_when_generation_fails(self, mock_generate_pronunciations):
        response = self.client.get("/api/v1/words/shopping")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.get_json(),
            {
                "error": "ollama_pronunciation_failed",
                "message": "Model did not return valid pronunciation JSON",
            },
        )
        mock_generate_pronunciations.assert_called_once_with("shopping")

    @patch("app.api.generate_pronunciations", side_effect=PronunciationValidationError("at least one word is required"))
    def test_words_route_returns_400_when_input_is_invalid(self, mock_generate_pronunciations):
        response = self.client.get("/api/v1/words/%20")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json(),
            {
                "error": "invalid_words_input",
                "message": "at least one word is required",
            },
        )
        mock_generate_pronunciations.assert_called_once_with(" ")


class ContentServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.progress_path = os.path.join(self.temp_dir.name, "user_progress.json")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_ollama_config_uses_defaults(self):
        with patch.dict(os.environ, {}, clear=True):
            config = OllamaConfig.from_env()

        self.assertEqual(config.base_url, "http://localhost:11434")
        self.assertEqual(config.model, "gpt-oss:120b-cloud")
        self.assertEqual(config.timeout_seconds, 60)
        self.assertEqual(config.max_retries, 2)

    def test_generate_content_retries_after_invalid_json(self):
        session = FakeSession(
            [
                FakeResponse({"message": {"content": "not json"}}),
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/ʃ/", "sh", "shop"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": [
                                  "I walk into the shop.",
                                  "The chair is near the door.",
                                  "I think about what to buy.",
                                  "The cashier smiles at me.",
                                  "I carry my bag home."
                                ],
                                "tsentences": [
                                  "我走进商店。",
                                  "椅子在门边。",
                                  "我想买什么。",
                                  "收银员对我微笑。",
                                  "我提着袋子回家。"
                                ]
                              }
                            }
                            """
                        }
                    }
                ),
            ]
        )

        with patch("app.ollama_client.requests", session):
            with patch.dict(
                os.environ,
                {
                    "OLLAMA_BASE_URL": "http://ollama.local",
                    "OLLAMA_MODEL": "gpt-oss:120b-cloud",
                    "OLLAMA_TIMEOUT_SECONDS": "45",
                    "OLLAMA_MAX_RETRIES": "2",
                    "YAN_USER_PROGRESS_FILE": self.progress_path,
                },
                clear=True,
            ):
                payload = generate_content(7, "shopping", "zh-CN", "China")

        self.assertEqual(len(session.calls), 2)
        self.assertIn("previous response was invalid", session.calls[1]["json"]["messages"][1]["content"].lower())
        self.assertEqual(payload["p1"][0], ["/ʃ/", "sh", "shop"])
        self.assertEqual(payload["p1"][3], ["/ð/", "th", "this"])
        self.assertEqual(len(payload["p2"]["sentences"]), 5)

    def test_generate_content_returns_error_after_retry_exhaustion(self):
        session = FakeSession(
            [
                FakeResponse({"message": {"content": "not json"}}),
                FakeResponse({"message": {"content": "{\"wrong\": true}"}}),
            ]
        )

        with patch("app.ollama_client.requests", session):
            with patch.dict(
                os.environ,
                {"OLLAMA_MAX_RETRIES": "1", "YAN_USER_PROGRESS_FILE": self.progress_path},
                clear=True,
            ):
                with self.assertRaises(ContentGenerationError):
                    generate_content(7, "shopping", "zh-CN", "China")

        self.assertEqual(len(session.calls), 2)

    def test_generate_content_retries_when_model_changes_preselected_phonics(self):
        session = FakeSession(
            [
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/g/", "g", "game"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": ["s1", "s2", "s3", "s4", "s5"],
                                "tsentences": ["t1", "t2", "t3", "t4", "t5"]
                              }
                            }
                            """
                        }
                    }
                ),
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/ʃ/", "sh", "shop"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": ["s1", "s2", "s3", "s4", "s5"],
                                "tsentences": ["t1", "t2", "t3", "t4", "t5"]
                              }
                            }
                            """
                        }
                    }
                ),
            ]
        )

        with patch("app.ollama_client.requests", session):
            with patch.dict(os.environ, {"YAN_USER_PROGRESS_FILE": self.progress_path}, clear=True):
                payload = generate_content(7, "shopping", "zh-CN", "China")

        self.assertEqual(len(session.calls), 2)
        self.assertEqual(payload["p1"][0], ["/ʃ/", "sh", "shop"])

    def test_generate_content_truncates_overlong_lists(self):
        session = FakeSession(
            [
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/ʃ/", "sh", "shop"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": [
                                  "s1", "s2", "s3", "s4", "s5",
                                  "s6", "s7", "s8", "s9", "s10", "s11"
                                ],
                                "tsentences": [
                                  "t1", "t2", "t3", "t4", "t5",
                                  "t6", "t7", "t8", "t9", "t10", "t11"
                                ]
                              }
                            }
                            """
                        }
                    }
                )
            ]
        )

        with patch("app.ollama_client.requests", session):
            with patch.dict(os.environ, {"YAN_USER_PROGRESS_FILE": self.progress_path}, clear=True):
                payload = generate_content(7, "airport", "es", "Mexico")

        self.assertEqual(len(payload["p1"]), 4)
        self.assertEqual(len(payload["p2"]["sentences"]), 10)
        self.assertEqual(len(payload["p2"]["tsentences"]), 10)

    def test_generate_content_retries_on_sentence_alignment_mismatch(self):
        session = FakeSession(
            [
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/ʃ/", "sh", "shop"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": ["s1", "s2", "s3", "s4", "s5"],
                                "tsentences": ["t1", "t2", "t3", "t4"]
                              }
                            }
                            """
                        }
                    }
                ),
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/ʃ/", "sh", "shop"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": ["s1", "s2", "s3", "s4", "s5"],
                                "tsentences": ["t1", "t2", "t3", "t4", "t5"]
                              }
                            }
                            """
                        }
                    }
                ),
            ]
        )

        with patch("app.ollama_client.requests", session):
            with patch.dict(os.environ, {"YAN_USER_PROGRESS_FILE": self.progress_path}, clear=True):
                payload = generate_content(7, "shopping", "fr", "Canada")

        self.assertEqual(len(session.calls), 2)
        self.assertEqual(len(payload["p2"]["sentences"]), len(payload["p2"]["tsentences"]))

    def test_generate_content_includes_user_learning_history_in_prompt(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store_path = os.path.join(tmp_dir, "user_progress.json")
            store = UserProgressStore(store_path)
            store.record_generated_phonics(7, [["/ʃ/", "sh", "shop"], ["/tʃ/", "ch", "chair"]])
            store.record_generated_phonics(7, [["/ʃ/", "sh", "shirt"]])

            session = FakeSession(
                [
                    FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"],
                                ["/ŋ/", "ng", "sing"],
                                ["/f/", "ph", "phone"]
                              ],
                              "p2": {
                                "sentences": ["s1", "s2", "s3", "s4", "s5"],
                                    "tsentences": ["t1", "t2", "t3", "t4", "t5"]
                                  }
                                }
                                """
                            }
                        }
                    )
                ]
            )

            with patch("app.ollama_client.requests", session):
                with patch.dict(os.environ, {"YAN_USER_PROGRESS_FILE": store_path}, clear=True):
                    generate_content(7, "shopping", "zh-CN", "China")

        prompt = session.calls[0]["json"]["messages"][1]["content"]
        self.assertIn("Previously learned phonics for this user", prompt)
        self.assertIn("[/ʃ/, sh] seen 2 times", prompt)
        self.assertIn("[/tʃ/, ch] seen 1 times", prompt)
        self.assertIn('["/θ/", "th"]', prompt)
        self.assertIn('["/ð/", "th"]', prompt)
        self.assertIn('["/ŋ/", "ng"]', prompt)
        self.assertNotIn('["/ʃ/", "sh"]', prompt)

    def test_generate_content_records_generated_phonics_per_user(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store_path = os.path.join(tmp_dir, "user_progress.json")
            session = FakeSession(
                [
                    FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/ʃ/", "sh", "shop"],
                                ["/tʃ/", "ch", "chair"],
                                ["/θ/", "th", "thank"],
                                ["/ð/", "th", "this"]
                              ],
                              "p2": {
                                "sentences": ["s1", "s2", "s3", "s4", "s5"],
                                    "tsentences": ["t1", "t2", "t3", "t4", "t5"]
                                  }
                                }
                                """
                            }
                        }
                    )
                ]
            )

            with patch("app.ollama_client.requests", session):
                with patch.dict(os.environ, {"YAN_USER_PROGRESS_FILE": store_path}, clear=True):
                    generate_content(99, "shopping", "zh-CN", "China")

            learned_items = UserProgressStore(store_path).get_learned_phonics(99)

        self.assertCountEqual(
            [(item.ipa, item.letter_combo, item.count) for item in learned_items],
            [
                ("/ʃ/", "sh", 1),
                ("/tʃ/", "ch", 1),
                ("/θ/", "th", 1),
                ("/ð/", "th", 1),
            ],
        )

    def test_select_phonics_uses_full_catalog_and_user_history_only(self):
        selection = select_phonics(
            [
                LearnedPhonics(ipa="/ʃ/", letter_combo="sh", count=2),
                LearnedPhonics(ipa="/tʃ/", letter_combo="ch", count=1),
            ]
        )

        self.assertEqual(
            [(item.ipa, item.letter_combo) for item in selection],
            [
                ("/θ/", "th"),
                ("/ð/", "th"),
                ("/ŋ/", "ng"),
                ("/f/", "ph"),
            ],
        )


class PronunciationServiceTests(unittest.TestCase):
    def test_generate_pronunciations_returns_words_payload(self):
        payload = generate_pronunciations("shopping,chair")

        self.assertEqual(
            payload,
            {
                "words": [
                    {"word": "shopping", "ipa": "/ʃɑpɪŋ/"},
                    {"word": "chair", "ipa": "/tʃɛr/"},
                ]
            },
        )

    def test_generate_pronunciations_supports_whitespace_separated_words(self):
        payload = generate_pronunciations("this phone")

        self.assertEqual(
            payload,
            {
                "words": [
                    {"word": "this", "ipa": "/ðɪs/"},
                    {"word": "phone", "ipa": "/foʊn/"},
                ]
            },
        )

    def test_generate_pronunciations_returns_400_style_error_for_unknown_words(self):
        with self.assertRaises(PronunciationValidationError) as exc_info:
            generate_pronunciations("zzzznotaword")

        self.assertIn("no CMU pronunciation found", str(exc_info.exception))

    def test_generate_pronunciations_returns_400_style_error_for_empty_input(self):
        with self.assertRaises(PronunciationValidationError) as exc_info:
            generate_pronunciations("   ")

        self.assertEqual(str(exc_info.exception), "at least one word is required")


if __name__ == "__main__":
    unittest.main()

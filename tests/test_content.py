import os
import unittest
from unittest.mock import patch

from app import create_app
from app.content_service import ContentGenerationError, OllamaConfig, generate_content


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
            "p1": [["/sh/", "sh", "shop"], ["/ch/", "ch", "chair"], ["/th/", "th", "think"]],
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


class ContentServiceTests(unittest.TestCase):
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
                                ["/sh/", "sh", "shop"],
                                ["/ch/", "ch", "chair"],
                                ["/th/", "th", "think"]
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

        with patch("app.content_service.requests", session):
            with patch.dict(
                os.environ,
                {
                    "OLLAMA_BASE_URL": "http://ollama.local",
                    "OLLAMA_MODEL": "gpt-oss:120b-cloud",
                    "OLLAMA_TIMEOUT_SECONDS": "45",
                    "OLLAMA_MAX_RETRIES": "2",
                },
                clear=True,
            ):
                payload = generate_content("shopping", "zh-CN", "China")

        self.assertEqual(len(session.calls), 2)
        self.assertIn("previous response was invalid", session.calls[1]["json"]["messages"][1]["content"].lower())
        self.assertEqual(payload["p1"][0], ["/sh/", "sh", "shop"])
        self.assertEqual(len(payload["p2"]["sentences"]), 5)

    def test_generate_content_returns_error_after_retry_exhaustion(self):
        session = FakeSession(
            [
                FakeResponse({"message": {"content": "not json"}}),
                FakeResponse({"message": {"content": "{\"wrong\": true}"}}),
            ]
        )

        with patch("app.content_service.requests", session):
            with patch.dict(os.environ, {"OLLAMA_MAX_RETRIES": "1"}, clear=True):
                with self.assertRaises(ContentGenerationError):
                    generate_content("shopping", "zh-CN", "China")

        self.assertEqual(len(session.calls), 2)

    def test_generate_content_truncates_overlong_lists(self):
        session = FakeSession(
            [
                FakeResponse(
                    {
                        "message": {
                            "content": """
                            {
                              "p1": [
                                ["/a/", "a", "apple"],
                                ["/b/", "b", "bag"],
                                ["/c/", "c", "card"],
                                ["/d/", "d", "desk"],
                                ["/e/", "e", "exit"],
                                ["/f/", "f", "food"],
                                ["/g/", "g", "gate"]
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

        with patch("app.content_service.requests", session):
            payload = generate_content("airport", "es", "Mexico")

        self.assertEqual(len(payload["p1"]), 6)
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
                                ["/sh/", "sh", "shop"],
                                ["/ch/", "ch", "chair"],
                                ["/th/", "th", "think"]
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
                                ["/sh/", "sh", "shop"],
                                ["/ch/", "ch", "chair"],
                                ["/th/", "th", "think"]
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

        with patch("app.content_service.requests", session):
            payload = generate_content("shopping", "fr", "Canada")

        self.assertEqual(len(session.calls), 2)
        self.assertEqual(len(payload["p2"]["sentences"]), len(payload["p2"]["tsentences"]))


if __name__ == "__main__":
    unittest.main()

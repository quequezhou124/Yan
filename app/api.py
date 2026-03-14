from flask import Blueprint, current_app, jsonify, request

from .content_service import ContentGenerationError, generate_content
from .pronunciation_service import (
    PronunciationGenerationError,
    PronunciationValidationError,
    generate_pronunciations,
)

api_v1 = Blueprint("api_v1", __name__)


@api_v1.get("/health")
def health_check():
    return jsonify({"status": "ok"}), 200


@api_v1.route("/echo", methods=["GET", "POST"])
def echo():
    if request.method == "GET":
        return jsonify({"received": request.args.to_dict(flat=True)}), 200

    payload = request.get_json(silent=True) or {}
    return jsonify({"received": payload}), 200


@api_v1.get("/content/<int:userid>/<string:scene>/<string:origin_lang>/<string:country>")
def content(userid: int, scene: str, origin_lang: str, country: str):
    try:
        payload = generate_content(userid=userid, scene=scene, origin_lang=origin_lang, country=country)
    except ContentGenerationError:
        current_app.logger.exception("Failed to generate content from Ollama")
        return (
            jsonify(
                {
                    "error": "ollama_generation_failed",
                    "message": "Model did not return valid content JSON",
                }
            ),
            502,
        )

    return jsonify(payload), 200


@api_v1.get("/words/<path:words>")
def words(words: str):
    try:
        payload = generate_pronunciations(words)
    except PronunciationValidationError as exc:
        return jsonify({"error": "invalid_words_input", "message": str(exc)}), 400
    except PronunciationGenerationError:
        current_app.logger.exception("Failed to generate pronunciations from Ollama")
        return (
            jsonify(
                {
                    "error": "ollama_pronunciation_failed",
                    "message": "Model did not return valid pronunciation JSON",
                }
            ),
            502,
        )

    return jsonify(payload), 200

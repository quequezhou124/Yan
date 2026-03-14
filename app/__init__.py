from flask import Flask

from .api import api_v1, content, echo, health_check, words


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(api_v1, url_prefix="/api/v1")

    # Root-path aliases for convenience when no API prefix is used.
    app.add_url_rule("/health", endpoint="health_check_root", view_func=health_check, methods=["GET"])
    app.add_url_rule("/echo", endpoint="echo_root", view_func=echo, methods=["GET", "POST"])
    app.add_url_rule(
        "/content/<int:userid>/<string:scene>/<string:origin_lang>/<string:country>",
        endpoint="content_root",
        view_func=content,
        methods=["GET"],
    )
    app.add_url_rule("/words/<path:words>", endpoint="words_root", view_func=words, methods=["GET"])

    return app

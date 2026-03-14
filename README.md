# Flask API Project

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python run.py
```

## API Endpoints

- `GET /api/v1/health`
- `POST /api/v1/echo`
- `GET /api/v1/content/<userid>/<scene>/<origin_lang>/<country>`

## Ollama Configuration

The `/content` endpoint reads these environment variables:

- `OLLAMA_BASE_URL` default: `http://localhost:11434`
- `OLLAMA_MODEL` default: `gpt-oss:120b-cloud`
- `OLLAMA_TIMEOUT_SECONDS` default: `60`
- `OLLAMA_MAX_RETRIES` default: `2`
